<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/database-reset-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')spApiRespond(['ok'=>false,'error'=>'Use POST for reset preview and confirmation.'],405);
try{
    $pdo=spApiDatabase();$body=spReadRequestBody();$outlet=(int)$_SERVER['SP_AUTH_OUTLET_ID'];$user=(int)$_SERVER['SP_AUTH_USER_ID'];
    $q=$pdo->prepare('SELECT u.password_hash,u.enabled,r.role_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?');$q->execute([$user]);$actor=$q->fetch();
    if(!$actor||!(int)$actor['enabled']||$actor['role_name']!=='Administrator')spApiRespond(['ok'=>false,'error'=>'Only an Administrator may reset an outlet.'],403);
    $action=(string)($body['action']??'');$selected=spResetSelection((array)($body['selection']??[]));
    if(!in_array($action,['preview','reset'],true))throw new InvalidArgumentException('Unknown reset action.');
    if($action==='reset'){
        spThrottleLogin($pdo,'database-reset-user-'.$user);
        if(!password_verify((string)($body['password']??''),$actor['password_hash']))spApiRespond(['ok'=>false,'error'=>'Administrator password is incorrect.'],403);
        if(($body['confirmation']??'')!=='RESET '.$outlet)throw new InvalidArgumentException('Type the exact outlet confirmation.');
    }
    $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$pdo->beginTransaction();spLockOutlet($pdo,$outlet);
    $key=null;
    if($action==='reset'){
        $key=spRequestKey($body,'outlet-database-reset');
        $receipt=['selection'=>$selected,'preview_token'=>(string)($body['preview_token']??''),'confirmation'=>$body['confirmation'],'request_id'=>$body['request_id']??''];
        $prior=spRequestReplay($pdo,$key,$receipt);if($prior!==null){$pdo->commit();spApiRespond($prior,200);}
    }
    if(!spTokenOutletFresh($pdo,$outlet)){ $pdo->rollBack();spApiRespond(['ok'=>false,'error'=>'This outlet was reset. Sign in again before continuing.'],401); }
    spBackupDirectory();
    foreach(['audit_logs','backup_records','sp_request_receipts','outlet_settings','product_outlets','loyalty_accounts','loyalty_transactions','sync_queue','sp_app_state','sp_relational_sync','document_counters','sp_document_counters','customer_displays','customer_display_sessions'] as $table)spRequireTable($pdo,$table);
    $snapshot=spBackupSnapshot($pdo,$action==='reset');$plan=spResetPlan($pdo,$snapshot,$outlet,$selected);
    $q=$pdo->prepare('SELECT outlet_code,outlet_name FROM outlets WHERE id=?');$q->execute([$outlet]);$outletRow=$q->fetch();
    if($action==='preview'){
        $claim=['user'=>$user,'outlet'=>$outlet,'selection'=>$selected,'fingerprint'=>$plan['fingerprint'],'exp'=>time()+300];
        $payload=spBase64UrlEncode(json_encode($claim,JSON_THROW_ON_ERROR));$token=$payload.'.'.spBase64UrlEncode(hash_hmac('sha256','database-reset:'.$payload,spAuthSecret(),true));
        $pdo->commit();spApiRespond(['ok'=>true,'outlet_id'=>$outlet,'outlet'=>$outletRow,'counts'=>$plan['counts'],'update_counts'=>$plan['updateCounts'],'blockers'=>$plan['blockers'],'preview_token'=>$token,'confirmation'=>'RESET '.$outlet,'backup_storage'=>'private-server-backup','expires_in'=>300],200);
    }
    $parts=explode('.',(string)($body['preview_token']??''));
    if(count($parts)!==2||!hash_equals(spBase64UrlEncode(hash_hmac('sha256','database-reset:'.$parts[0],spAuthSecret(),true)),$parts[1]))throw new InvalidArgumentException('Preview is invalid. Preview again.');
    $claim=json_decode((string)spBase64UrlDecode($parts[0]),true,512,JSON_THROW_ON_ERROR);
    if(!is_array($claim)||(int)($claim['exp']??0)<time()||(int)($claim['user']??0)!==$user||(int)($claim['outlet']??0)!==$outlet||($claim['selection']??null)!==$selected||!hash_equals((string)($claim['fingerprint']??''),$plan['fingerprint']))throw new InvalidArgumentException('Data or selection changed. Preview again before resetting.');
    if($plan['blockers'])throw new InvalidArgumentException(implode(' ',$plan['blockers']));
    $fileName='SP-Manager-Reset-Outlet-'.$outlet.'-'.gmdate('Y-m-d_H-i-s').'-'.bin2hex(random_bytes(6)).'.json';
    $sha=spBackupStore($snapshot,$fileName);
    spResetApply($pdo,$plan,$outlet);
    // Scoped generation invalidates stale browser tokens only for this outlet.
    $generation=bin2hex(random_bytes(16));
    $pdo->prepare("INSERT INTO outlet_settings(outlet_id,setting_group,setting_key,setting_value) VALUES(?,'SP-MANAGER','databaseResetGeneration',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)")->execute([$outlet,$generation]);
    $meta=['selection'=>$selected,'deleted'=>$plan['counts'],'updated'=>$plan['updateCounts'],'sha256'=>$sha,'verified'=>true];
    $pdo->prepare("INSERT INTO backup_records(outlet_id,backup_type,file_name,storage_location,created_by,status,metadata_json) VALUES(?,'SQL_RESET',?,'private-server-backup',?,'COMPLETED',?)")->execute([$outlet,$fileName.'.enc',$user,json_encode($meta,JSON_THROW_ON_ERROR)]);
    spAudit($pdo,'RESET_OUTLET_DATABASE','outlet',$outlet,null,$meta+['backup_file'=>$fileName.'.enc']);
    $response=['ok'=>true,'outlet_id'=>$outlet,'backup_file'=>$fileName.'.enc','backup_sha256'=>$sha,'deleted'=>$plan['counts'],'updated'=>$plan['updateCounts'],'cache_keys'=>$plan['keys'],'sign_in_required'=>true];
    spRequestComplete($pdo,$key,$response);$pdo->commit();spApiRespond($response,200);
}catch(InvalidArgumentException $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();spApiRespond(['ok'=>false,'error'=>$e->getMessage()],409);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('SP reset rejected: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Reset was cancelled. Check private backup storage and the server error log. Database changes were rolled back.'],503);}
