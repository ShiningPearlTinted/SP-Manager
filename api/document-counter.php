<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V10');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$config=require __DIR__.'/config.php'; $db=$config['db']??null;
$host=(string)($db['host']??$config['db_host']??'localhost'); $port=(string)($db['port']??$config['db_port']??'3306');
$name=(string)($db['name']??$config['db_name']??''); $user=(string)($db['user']??$config['db_user']??''); $pass=(string)($db['pass']??$config['db_pass']??'');
function body():array{$x=json_decode(file_get_contents('php://input')?:'',true);return is_array($x)?$x:[];}
function outletId(PDO $pdo,string $outlet):int{$outlet=trim($outlet?:'SP01');if(ctype_digit($outlet)){$q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([(int)$outlet]);}else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$outlet]);}$id=(int)($q->fetchColumn()?:0);if(!$id)throw new RuntimeException('Outlet not found: '.$outlet);return$id;}
try{
 $pdo=spApiDatabase();
 spRequireTable($pdo,'sp_document_counters');
 $b=body(); $type=trim((string)($b['document_type']??$_GET['document_type']??'')); if($type==='')throw new InvalidArgumentException('document_type is required.');
 $oid=outletId($pdo,(string)($b['outlet_id']??$_GET['outlet_id']??'SP01'));
 if($_SERVER['REQUEST_METHOD']!=='POST')spApiRespond(['ok'=>false,'error'=>'POST required.'],405);
 $increment=max(1,(int)($b['increment']??$_GET['increment']??1)); $pdo->beginTransaction();spLockOutlet($pdo,$oid);
 $q=$pdo->prepare('SELECT current_number FROM sp_document_counters WHERE outlet_id=? AND doc_type=? FOR UPDATE');$q->execute([$oid,$type]);$row=$q->fetch();
 if($row){$current=(int)$row['current_number']+$increment;$u=$pdo->prepare('UPDATE sp_document_counters SET current_number=?,updated_at=NOW() WHERE outlet_id=? AND doc_type=?');$u->execute([$current,$oid,$type]);}
 else{$current=$increment;$i=$pdo->prepare('INSERT INTO sp_document_counters(outlet_id,doc_type,current_number,updated_at) VALUES(?,?,?,NOW())');$i->execute([$oid,$type,$current]);}
 $pdo->commit(); echo json_encode(['ok'=>true,'api_version'=>'V10','outlet_id'=>$oid,'document_type'=>$type,'counter'=>$current],JSON_UNESCAPED_SLASHES);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();http_response_code(500);echo json_encode(['ok'=>false,'api_version'=>'V10','error'=>'Database counter could not be generated.'],JSON_UNESCAPED_SLASHES);}
