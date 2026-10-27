<?php
declare(strict_types=1);

function spNotificationSettings(): array {
    $config=spApiConfig();
    $encryptionKey=(string)($config['encryption_key']??'');
    return [
        'public_key'=>(string)($config['vapid_public_key']??(getenv('SP_MANAGER_VAPID_PUBLIC_KEY')?:'')),
        'private_key'=>(string)($config['vapid_private_key']??(getenv('SP_MANAGER_VAPID_PRIVATE_KEY')?:'')),
        'subject'=>(string)($config['vapid_subject']??(getenv('SP_MANAGER_VAPID_SUBJECT')?:'')),
        'php_supported'=>PHP_VERSION_ID>=80200,
        'extensions_ready'=>extension_loaded('openssl')&&extension_loaded('curl')&&extension_loaded('mbstring'),
        'encryption_ready'=>strlen($encryptionKey)>=64,
    ];
}

function spNotificationRequireSchema(PDO $pdo): void {
    foreach(['sp_notifications','sp_notification_recipients','sp_push_subscriptions','sp_notification_deliveries'] as $table) {
        if(!spTableExists($pdo,$table)) throw new RuntimeException('Apply booking-notifications-v1.sql before enabling notifications.');
    }
}

function spNotificationCanReceive(PDO $pdo,int $userId,int $outletId): bool {
    $q=$pdo->prepare('SELECT u.id,u.outlet_id,u.enabled,u.permissions_json,r.role_name,uo.user_id AS assigned_user FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.outlet_id=? AND uo.active=1 WHERE u.id=? LIMIT 1');
    $q->execute([$outletId,$userId]);$u=$q->fetch();
    if(!$u || !(int)$u['enabled']) return false;
    $assigned=(int)($u['assigned_user']??0)===$userId || (int)$u['outlet_id']===$outletId || $u['role_name']==='Administrator';
    if(!$assigned) return false;
    if($u['role_name']==='Administrator') return true;
    $permissions=json_decode((string)($u['permissions_json']??''),true);
    return is_array($permissions) && !empty($permissions['viewBookings']);
}

function spNotificationCreateWebsiteBooking(PDO $pdo,int $outletId,int $bookingId,string $siteHash,string $requestId,string $reference): void {
    if(!$pdo->inTransaction()) throw new LogicException('Notification event must share the booking transaction.');
    $pdo->exec('SAVEPOINT sp_booking_notification');
    try {
        spNotificationRequireSchema($pdo);
        $eventKey=hash('sha256','website-booking|'.$siteHash.'|'.$requestId);
        $data=['reference'=>$reference,'outlet_id'=>$outletId];
        $insert=$pdo->prepare("INSERT IGNORE INTO sp_notifications(event_key,outlet_id,booking_id,event_type,title,body,data_json) VALUES(?,?,?,'booking.created','New booking received','A new booking is waiting for your outlet.',?)");
        $insert->execute([$eventKey,$outletId,$bookingId,json_encode($data,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)]);
        $q=$pdo->prepare('SELECT id FROM sp_notifications WHERE event_key=?');$q->execute([$eventKey]);$notificationId=(int)$q->fetchColumn();
        if($notificationId<=0) throw new RuntimeException('Notification event was not stored.');
        $q=$pdo->prepare("SELECT DISTINCT u.id FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_outlets uo ON uo.user_id=u.id AND uo.outlet_id=? AND uo.active=1 WHERE u.enabled=1 AND (uo.user_id IS NOT NULL OR u.outlet_id=? OR r.role_name='Administrator')");
        $q->execute([$outletId,$outletId]);
        foreach($q->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $userId=(int)$id;
            if(!spNotificationCanReceive($pdo,$userId,$outletId)) continue;
            $pdo->prepare('INSERT IGNORE INTO sp_notification_recipients(notification_id,user_id) VALUES(?,?)')->execute([$notificationId,$userId]);
            $q=$pdo->prepare('SELECT id FROM sp_notification_recipients WHERE notification_id=? AND user_id=?');$q->execute([$notificationId,$userId]);$recipientId=(int)$q->fetchColumn();
            if($recipientId<=0) continue;
            $q=$pdo->prepare('SELECT id FROM sp_push_subscriptions WHERE user_id=? AND outlet_id=? AND active=1');$q->execute([$userId,$outletId]);
            foreach($q->fetchAll(PDO::FETCH_COLUMN) as $subscriptionId) {
                $pdo->prepare("INSERT IGNORE INTO sp_notification_deliveries(recipient_id,subscription_id,status,next_attempt_at) VALUES(?,?,'PENDING',CURRENT_TIMESTAMP)")->execute([$recipientId,(int)$subscriptionId]);
            }
        }
        $pdo->exec('RELEASE SAVEPOINT sp_booking_notification');
    } catch(Throwable $e) {
        try {$pdo->exec('ROLLBACK TO SAVEPOINT sp_booking_notification');$pdo->exec('RELEASE SAVEPOINT sp_booking_notification');} catch(Throwable $ignored) {}
        error_log('SP notification enqueue failed; booking remains committed: '.get_class($e));
    }
}

function spNotificationEncrypt(string $plain): string {
    if($plain==='') return '';
    $iv=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($plain,'aes-256-gcm',cryptoKey('SP-Manager'),OPENSSL_RAW_DATA,$iv,$tag,'SP-Manager:WebPushSubscription');
    if($cipher===false) throw new RuntimeException('Notification secret encryption failed.');
    return 'wsp1:'.base64_encode($iv.$tag.$cipher);
}
function spNotificationDecrypt(string $stored): string {
    if(!str_starts_with($stored,'wsp1:')) throw new RuntimeException('Stored push subscription needs re-registration.');
    $raw=base64_decode(substr($stored,5),true);if($raw===false||strlen($raw)<29)throw new RuntimeException('Stored push subscription is invalid.');
    $plain=openssl_decrypt(substr($raw,28),'aes-256-gcm',cryptoKey('SP-Manager'),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),'SP-Manager:WebPushSubscription');
    if($plain===false)throw new RuntimeException('Stored push subscription could not be decrypted.');
    return $plain;
}
function spNotificationValidateEndpoint(mixed $value): string {
    if(!is_string($value)||strlen($value)>2048) throw new InvalidArgumentException('Invalid push endpoint.');
    $parts=parse_url($value);$host=strtolower((string)($parts['host']??''));
    $allowed=$host==='fcm.googleapis.com'||$host==='web.push.apple.com'||str_ends_with($host,'.push.services.mozilla.com');
    if(($parts['scheme']??'')!=='https'||!$allowed||isset($parts['user'])||isset($parts['pass'])||isset($parts['port'])&&$parts['port']!==443) throw new InvalidArgumentException('Unsupported push endpoint.');
    return $value;
}

function spNotificationPushPayload(array $row): string {
    $data=json_decode((string)$row['data_json'],true);
    return json_encode([
        'title'=>'New booking received',
        'body'=>'A new booking is waiting for your outlet.',
        'data'=>['reference'=>(string)($data['reference']??''),'outlet_id'=>(int)($data['outlet_id']??0)],
        'tag'=>'sp-booking-'.(string)($data['reference']??''),
    ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}
