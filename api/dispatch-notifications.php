<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
if(PHP_VERSION_ID<80200) {fwrite(STDERR, 'Booking notifications require PHP 8.2 or newer.'.PHP_EOL);exit(2);}
define('SP_MANAGER_CLI',true);
require_once __DIR__.'/security.php';
require_once __DIR__.'/notification-lib.php';
$autoload=__DIR__.'/notification-vendor/autoload.php';
if(!is_file($autoload)){fwrite(STDERR,"Install API Composer dependencies before dispatching notifications.\n");exit(2);}
require_once $autoload;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
$pdo=spApiDatabase();spNotificationRequireSchema($pdo);$cfg=spNotificationSettings();
if($cfg['public_key']===''||$cfg['private_key']===''||$cfg['subject']===''){fwrite(STDERR,"VAPID configuration is incomplete.\n");exit(2);}
$lock='spm:notification-dispatch:'.substr(hash('sha256',(string)$pdo->query('SELECT DATABASE()')->fetchColumn()),0,30);
$q=$pdo->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);if((int)$q->fetchColumn()!==1)exit(0);
$webPush=new WebPush(['VAPID'=>['subject'=>$cfg['subject'],'publicKey'=>$cfg['public_key'],'privateKey'=>$cfg['private_key']]]);
$sent=0;$failed=0;
try {
    $pdo->beginTransaction();
    $rows=$pdo->query("SELECT d.id,d.attempts,r.user_id,n.outlet_id,n.data_json,s.id AS subscription_id,s.endpoint,s.p256dh,s.auth_secret FROM sp_notification_deliveries d JOIN sp_notification_recipients r ON r.id=d.recipient_id JOIN sp_notifications n ON n.id=r.notification_id JOIN sp_push_subscriptions s ON s.id=d.subscription_id AND s.active=1 AND s.user_id=r.user_id AND s.outlet_id=n.outlet_id WHERE ((d.status IN ('PENDING','RETRY') AND d.next_attempt_at<=CURRENT_TIMESTAMP) OR (d.status='PROCESSING' AND d.processing_at<DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 15 MINUTE))) ORDER BY d.id LIMIT 30 FOR UPDATE")->fetchAll();
    foreach($rows as $row)$pdo->prepare("UPDATE sp_notification_deliveries SET status='PROCESSING',processing_at=CURRENT_TIMESTAMP,attempts=attempts+1 WHERE id=?")->execute([(int)$row['id']]);
    $pdo->commit();
    foreach($rows as $row){
        $id=(int)$row['id'];$subscriptionId=(int)$row['subscription_id'];$userId=(int)$row['user_id'];$outlet=(int)$row['outlet_id'];$attempts=(int)$row['attempts']+1;
        if(!spNotificationCanReceive($pdo,$userId,$outlet)){$pdo->prepare("UPDATE sp_notification_deliveries SET status='SKIPPED',last_error_code='permission_revoked',processing_at=NULL WHERE id=?")->execute([$id]);continue;}
        try {
            $sub=Subscription::create(['endpoint'=>spNotificationValidateEndpoint(spNotificationDecrypt($row['endpoint'])) , 'keys'=>['p256dh'=>spNotificationDecrypt($row['p256dh']),'auth'=>spNotificationDecrypt($row['auth_secret'])]]);
            $report=$webPush->sendOneNotification($sub,spNotificationPushPayload($row),['TTL'=>86400]);
            if($report->isSuccess()){
                $pdo->prepare("UPDATE sp_notification_deliveries SET status='SENT',sent_at=CURRENT_TIMESTAMP,processing_at=NULL,last_error_code=NULL WHERE id=?")->execute([$id]);
                $pdo->prepare('UPDATE sp_push_subscriptions SET last_used_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$subscriptionId]);$sent++;continue;
            }
            $response=$report->getResponse();$status=$response?$response->getStatusCode():0;
            if(in_array($status,[404,410],true)){
                $pdo->prepare('UPDATE sp_push_subscriptions SET active=0,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$subscriptionId]);
                $pdo->prepare("UPDATE sp_notification_deliveries SET status='EXPIRED',processing_at=NULL,last_error_code='subscription_expired' WHERE id=?")->execute([$id]);continue;
            }
            if($attempts>=8){$pdo->prepare("UPDATE sp_notification_deliveries SET status='SKIPPED',processing_at=NULL,last_error_code='retry_limit' WHERE id=?")->execute([$id]);$failed++;continue;}
            $delay=min(360,2**min(8,$attempts));$pdo->prepare("UPDATE sp_notification_deliveries SET status='RETRY',next_attempt_at=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? MINUTE),processing_at=NULL,last_error_code='delivery_failed' WHERE id=?")->execute([$delay,$id]);$failed++;
        } catch(Throwable $e) {
            if($attempts>=8){$pdo->prepare("UPDATE sp_notification_deliveries SET status='SKIPPED',processing_at=NULL,last_error_code='sender_error' WHERE id=?")->execute([$id]);$failed++;continue;}
            $delay=min(360,2**min(8,$attempts));$pdo->prepare("UPDATE sp_notification_deliveries SET status='RETRY',next_attempt_at=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? MINUTE),processing_at=NULL,last_error_code='sender_error' WHERE id=?")->execute([$delay,$id]);$failed++;
        }
    }
    fwrite(STDOUT,"Notification dispatch complete. Sent={$sent}; pending retry={$failed}.\n");
} finally {try{$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);}catch(Throwable $e){}}
