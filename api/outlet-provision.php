<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php';
$db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost');
$port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??'');
$user=(string)($db['user']??$config['db_user']??'');
$pass=(string)($db['pass']??$config['db_pass']??'');
function body():array{$v=json_decode(file_get_contents('php://input')?:'',true);return is_array($v)?$v:[];}
function tableExists(PDO $pdo,string $table):bool{$q=$pdo->prepare('SHOW TABLES LIKE ?');$q->execute([$table]);return(bool)$q->fetchColumn();}
function cols(PDO $pdo,string $table):array{$q=$pdo->query('DESCRIBE `'.str_replace('`','``',$table).'`');$o=[];foreach($q->fetchAll() as $r)$o[$r['Field']]=$r;return$o;}
function outletId(PDO $pdo,string|int $v):int{$s=trim((string)$v);if($s==='')throw new InvalidArgumentException('Outlet is required.');if(ctype_digit($s)){$q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([(int)$s]);}else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$s]);}$id=(int)($q->fetchColumn()?:0);if(!$id)throw new RuntimeException('Outlet not found: '.$s);return$id;}
function copyPaymentTypes(PDO $pdo,int $sourceId,int $targetId):int{
 if(!tableExists($pdo,'payment_types'))return 0;
 $s=cols($pdo,'payment_types');
 if(!isset($s['outlet_id'])||!isset($s['payment_code'])||!isset($s['payment_name']))return 0;
 $fields=['outlet_id','payment_code','payment_name','enabled','quick_payment','customer_required','change_allowed','mark_paid','print_receipt','open_cash_drawer','shortcut_key','sort_order'];
 $fields=array_values(array_filter($fields,fn($f)=>isset($s[$f])));
 $q=$pdo->prepare('SELECT `'.implode('`,`',$fields).'` FROM payment_types WHERE outlet_id=? ORDER BY sort_order ASC,id ASC');$q->execute([$sourceId]);$rows=$q->fetchAll();
 $added=0;
 foreach($rows as $r){
   $code=(string)($r['payment_code']??''); if($code==='')continue;
   $exists=$pdo->prepare('SELECT id FROM payment_types WHERE outlet_id=? AND payment_code=? LIMIT 1');$exists->execute([$targetId,$code]);
   if($exists->fetchColumn())continue;
   $data=$r;$data['outlet_id']=$targetId;
   $fs=array_keys($data);$st=$pdo->prepare('INSERT INTO payment_types (`'.implode('`,`',$fs).'`) VALUES ('.implode(',',array_fill(0,count($fs),'?')).')');$st->execute(array_values($data));$added++;
 }
 return $added;
}
try{
 if($name===''||$user==='')throw new RuntimeException('Database configuration is incomplete.');
 $pdo=spApiDatabase();
 $b=body();$action=strtolower(trim((string)($_GET['action']??$_POST['action']??$b['action']??'provision')));
 if($action!=='provision')throw new InvalidArgumentException('Unsupported outlet provision action.');
 $source=outletId($pdo,$b['source_outlet_id']??$_GET['source_outlet_id']??'');
 $target=outletId($pdo,$b['target_outlet_id']??$_GET['target_outlet_id']??'');
 if($source===$target)throw new InvalidArgumentException('Source and target outlets must be different.');
 $pdo->beginTransaction();
 $paymentsAdded=copyPaymentTypes($pdo,$source,$target);
 $pdo->commit();
 echo json_encode(['ok'=>true,'api_version'=>'V1','source_outlet_id'=>$source,'target_outlet_id'=>$target,'payment_types_added'=>$paymentsAdded],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'api_version'=>'V1','error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);}
