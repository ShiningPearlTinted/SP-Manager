<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
header('Content-Type: application/json; charset=utf-8');
function offBody():array{$v=json_decode(file_get_contents('php://input')?:'',true);return is_array($v)?$v:[];}
function offReply(array $data,int $status=200):never{http_response_code($status);echo json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
try{
 $publicAction=strtolower(trim((string)($_GET['action']??'')));if($publicAction==='health'){try{$healthPdo=spApiDatabase();offReply(['ok'=>true,'database'=>(int)$healthPdo->query('SELECT 1')->fetchColumn()===1]);}catch(Throwable $healthError){offReply(['ok'=>false],503);}}
 $pdo=spApiDatabase();$b=offBody();$action=strtolower(trim((string)($b['action']??$_GET['action']??'')));$outlet=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);$user=(int)($_SERVER['SP_AUTH_USER_ID']??0);
 if($action!=='register'||($_SERVER['REQUEST_METHOD']??'')!=='POST')offReply(['ok'=>false,'error'=>'Unsupported offline request.'],400);
 $device=trim((string)($b['device_id']??''));if(!preg_match('/^[a-f0-9-]{36}$/i',$device))offReply(['ok'=>false,'error'=>'Invalid terminal ID.'],400);
 if((string)($_SERVER['SP_AUTH_DEVICE_ID']??'')!==''&&!hash_equals((string)$_SERVER['SP_AUTH_DEVICE_ID'],$device))offReply(['ok'=>false,'error'=>'Terminal identity does not match this signed-in session.'],403);
 foreach(['sp_offline_devices','sp_offline_stock_quotas','product_outlets'] as $table)if(!spTableExists($pdo,$table))throw new RuntimeException('Offline migration is required before device registration.');
 $config=spApiConfig();$limit=max(1,min(20,(int)($config['offline_terminal_slots']??3)));$expiry=date('Y-m-d H:i:s',time()+259200);
 $pdo->beginTransaction();
 $q=$pdo->prepare('SELECT user_id,outlet_id,status FROM sp_offline_devices WHERE device_id=? FOR UPDATE');$q->execute([$device]);$old=$q->fetch();
 if($old&&((int)$old['user_id']!==$user||(int)$old['outlet_id']!==$outlet))throw new RuntimeException('This terminal is already registered to a different user or outlet.');
 $q=$pdo->prepare("SELECT COUNT(*) FROM sp_offline_devices WHERE outlet_id=? AND status='ACTIVE' AND expires_at>NOW() AND device_id<>?");$q->execute([$outlet,$device]);$active=(int)$q->fetchColumn();if(!$old&&$active >= $limit)throw new RuntimeException('This outlet has reached its offline terminal limit.');
 if($old){$pdo->prepare("UPDATE sp_offline_devices SET status='ACTIVE',expires_at=?,last_seen_at=NOW() WHERE device_id=?")->execute([$expiry,$device]);}
 else{$pdo->prepare("INSERT INTO sp_offline_devices(device_id,outlet_id,user_id,status,expires_at,last_seen_at) VALUES(?,?,?,'ACTIVE',?,NOW())")->execute([$device,$outlet,$user,$expiry]);}
 $slots=max(1,$limit-$active);$q=$pdo->prepare('SELECT product_id,stock_qty FROM product_outlets WHERE outlet_id=? AND active=1 ORDER BY product_id ASC FOR UPDATE');$q->execute([$outlet]);$quotas=[];
 foreach($q->fetchAll() as $p){$pid=(int)$p['product_id'];$stock=max(0,(float)$p['stock_qty']);$sum=$pdo->prepare("SELECT COALESCE(SUM(GREATEST(0,q.reserved_qty-q.consumed_qty)),0) FROM sp_offline_stock_quotas q JOIN sp_offline_devices d ON d.device_id=q.device_id WHERE q.outlet_id=? AND q.product_id=? AND q.device_id<>? AND d.status='ACTIVE' AND d.expires_at>NOW()");$sum->execute([$outlet,$pid,$device]);$otherHeld=(float)$sum->fetchColumn();$existing=$pdo->prepare('SELECT reserved_qty,consumed_qty FROM sp_offline_stock_quotas WHERE device_id=? AND outlet_id=? AND product_id=? FOR UPDATE');$existing->execute([$device,$outlet,$pid]);$prior=$existing->fetch();$consumed=(float)($prior['consumed_qty']??0);$ownHeld=max(0,(float)($prior['reserved_qty']??0)-$consumed);$available=max(0,$stock-$otherHeld-$ownHeld);$share=$slots===1?$available:floor($available/$slots*1000)/1000;$reserved=$prior?(float)$prior['reserved_qty']+$share:$share;$up=$pdo->prepare('INSERT INTO sp_offline_stock_quotas(device_id,outlet_id,product_id,reserved_qty,consumed_qty) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE reserved_qty=GREATEST(reserved_qty,VALUES(reserved_qty)),updated_at=NOW()');$up->execute([$device,$outlet,$pid,$reserved,$consumed]);$quotas[(string)$pid]=max(0,$reserved-$consumed);}
 $pdo->commit();offReply(['ok'=>true,'api_version'=>'V1','device_id'=>$device,'outlet_id'=>$outlet,'expires_at'=>$expiry,'expires_epoch'=>(time()+259200),'grant'=>spIssueOfflineApiToken($user,$outlet,$device),'quotas'=>$quotas,'terminal_limit'=>$limit]);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();offReply(['ok'=>false,'error'=>$e->getMessage()],400);}
