<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/notification-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
try {
    $pdo=spApiDatabase();spNotificationRequireSchema($pdo);
    $userId=(int)($_SERVER['SP_AUTH_USER_ID']??0);$outletId=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);
    if($userId<=0||$outletId<=0) spApiRespond(['ok'=>false,'error'=>'A valid signed-in outlet session is required.'],401);
    if(!spNotificationCanReceive($pdo,$userId,$outletId)) spApiRespond(['ok'=>false,'error'=>'Booking permission is required.'],403);
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));$action=strtolower(trim((string)($_GET['action']??'')));
    if($method==='GET'&&$action==='config') {
        $cfg=spNotificationSettings();
        $keysReady=$cfg['public_key']!==''&&$cfg['private_key']!==''&&$cfg['subject']!=='';
        $ready=$cfg['php_supported']&&$cfg['extensions_ready']&&$cfg['encryption_ready']&&$keysReady;
        spApiRespond(['ok'=>true,'enabled'=>$ready,'public_key'=>$ready?$cfg['public_key']:'','requirements'=>['php'=>$cfg['php_supported'],'extensions'=>$cfg['extensions_ready'],'encryption_key'=>$cfg['encryption_ready'],'vapid'=>$keysReady]],200);
    }
    if($method==='GET'&&$action==='list') {
        $q=$pdo->prepare('SELECT COUNT(*) FROM sp_notification_recipients r JOIN sp_notifications n ON n.id=r.notification_id WHERE r.user_id=? AND n.outlet_id=? AND r.read_at IS NULL');$q->execute([$userId,$outletId]);$unread=(int)$q->fetchColumn();
        $q=$pdo->prepare('SELECT n.id,n.event_type,n.title,n.body,n.data_json,n.created_at,r.read_at FROM sp_notification_recipients r JOIN sp_notifications n ON n.id=r.notification_id WHERE r.user_id=? AND n.outlet_id=? ORDER BY n.id DESC LIMIT 30');$q->execute([$userId,$outletId]);$rows=[];
        foreach($q->fetchAll() as $row){$row['id']=(int)$row['id'];$row['data']=json_decode((string)$row['data_json'],true)?:[];unset($row['data_json']);$rows[]=$row;}
        spApiRespond(['ok'=>true,'unread'=>$unread,'notifications'=>$rows],200);
    }
    if($method!=='POST') spApiRespond(['ok'=>false,'error'=>'Method not allowed.'],405);
    $body=spReadRequestBody();$action=strtolower(trim((string)($body['action']??'')));
    if($action==='subscribe') {
        $sub=$body['subscription']??null;if(!is_array($sub))throw new InvalidArgumentException('Push subscription is required.');
        $endpoint=spNotificationValidateEndpoint($sub['endpoint']??null);$keys=$sub['keys']??[];
        $p256dh=$keys['p256dh']??'';$auth=$keys['auth']??'';
        if(!is_string($p256dh)||!preg_match('/^[A-Za-z0-9_-]{80,120}$/D',$p256dh)||!is_string($auth)||!preg_match('/^[A-Za-z0-9_-]{16,64}$/D',$auth))throw new InvalidArgumentException('Push subscription keys are invalid.');
        $label=substr(trim((string)($body['device_label']??'')),0,180);$hash=hash('sha256',$endpoint);
        $q=$pdo->prepare('INSERT INTO sp_push_subscriptions(endpoint_hash,endpoint,p256dh,auth_secret,user_id,outlet_id,device_label,active) VALUES(?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE endpoint=VALUES(endpoint),p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),user_id=VALUES(user_id),outlet_id=VALUES(outlet_id),device_label=VALUES(device_label),active=1,updated_at=CURRENT_TIMESTAMP');
        $q->execute([$hash,spNotificationEncrypt($endpoint),spNotificationEncrypt($p256dh),spNotificationEncrypt($auth),$userId,$outletId,$label]);
        spApiRespond(['ok'=>true],200);
    }
    if($action==='unsubscribe') {
        $endpoint=spNotificationValidateEndpoint($body['endpoint']??null);
        $pdo->prepare('UPDATE sp_push_subscriptions SET active=0,updated_at=CURRENT_TIMESTAMP WHERE endpoint_hash=? AND user_id=? AND outlet_id=?')->execute([hash('sha256',$endpoint),$userId,$outletId]);
        spApiRespond(['ok'=>true],200);
    }
    if($action==='read') {
        $id=filter_var($body['id']??null,FILTER_VALIDATE_INT);if($id===false||$id<=0)throw new InvalidArgumentException('Notification id is invalid.');
        $pdo->prepare('UPDATE sp_notification_recipients r JOIN sp_notifications n ON n.id=r.notification_id SET r.read_at=COALESCE(r.read_at,CURRENT_TIMESTAMP) WHERE n.id=? AND r.user_id=? AND n.outlet_id=?')->execute([$id,$userId,$outletId]);
        spApiRespond(['ok'=>true],200);
    }
    if($action==='read-all') {
        $pdo->prepare('UPDATE sp_notification_recipients r JOIN sp_notifications n ON n.id=r.notification_id SET r.read_at=COALESCE(r.read_at,CURRENT_TIMESTAMP) WHERE r.user_id=? AND n.outlet_id=? AND r.read_at IS NULL')->execute([$userId,$outletId]);
        spApiRespond(['ok'=>true],200);
    }
    spApiRespond(['ok'=>false,'error'=>'Unknown notification action.'],404);
} catch(InvalidArgumentException $e){spApiRespond(['ok'=>false,'error'=>$e->getMessage()],400);}
catch(Throwable $e){error_log('SP notifications API failed: '.get_class($e));spApiRespond(['ok'=>false,'error'=>'Notifications are not available. Check the notification migration and API configuration.'],503);}
