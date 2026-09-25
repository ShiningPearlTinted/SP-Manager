<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';
try {
  if (($config['db_name'] ?? 'CHANGE_ME') === 'CHANGE_ME') throw new RuntimeException('Hostinger MySQL is not configured. Edit api/config.php.');
  $pdo = new PDO(
    'mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4',
    $config['db_user'], $config['db_pass'],
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]
  );
  $pdo->exec("CREATE TABLE IF NOT EXISTS terminals (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, terminal_code VARCHAR(64) NOT NULL, terminal_name VARCHAR(120) NOT NULL, terminal_type VARCHAR(40) NOT NULL DEFAULT 'PC POS', outlet_id VARCHAR(64) NOT NULL DEFAULT 'SP01', customer_display_id BIGINT UNSIGNED NULL, status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(id), UNIQUE KEY uq_terminal_code(terminal_code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS customer_displays (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, display_code VARCHAR(64) NOT NULL, display_name VARCHAR(120) NOT NULL, outlet_id VARCHAR(64) NOT NULL DEFAULT 'SP01', terminal_id VARCHAR(64) NULL, status ENUM('Connected','Disconnected','Inactive') NOT NULL DEFAULT 'Disconnected', last_connected DATETIME NULL, image_data LONGTEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(id), UNIQUE KEY uq_display_code(display_code), KEY idx_display_terminal(terminal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS customer_display_sessions (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, display_code VARCHAR(64) NOT NULL, terminal_id VARCHAR(64) NOT NULL, outlet_id VARCHAR(64) NOT NULL DEFAULT 'SP01', state ENUM('IDLE','CART','PAYMENT','COMPLETED','ERROR') NOT NULL DEFAULT 'IDLE', state_json LONGTEXT NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, expires_at DATETIME NULL, PRIMARY KEY(id), UNIQUE KEY uq_display_session(display_code), KEY idx_terminal(terminal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $action=$_GET['action']??'';
  if ($action==='state' && $_SERVER['REQUEST_METHOD']==='POST') {
    $b=json_decode(file_get_contents('php://input'),true) ?: []; $display=trim((string)($b['display_code']??'')); $terminal=trim((string)($b['terminal_id']??''));
    if(!$display||!$terminal) throw new InvalidArgumentException('display_code and terminal_id are required.');
    $name=trim((string)($b['display_name']??$display)); $outlet=trim((string)($b['outlet_id']??'SP01')); $state=(string)($b['state']['state']??'IDLE');
    if(!in_array($state,['IDLE','CART','PAYMENT','COMPLETED','ERROR'],true))$state='ERROR';
    $data=$b['state']??[]; $data['displayName']=$name; $data['updatedAt']=date('c');
    $pdo->beginTransaction();
    $st=$pdo->prepare("INSERT INTO customer_displays(display_code,display_name,outlet_id,terminal_id,status,last_connected) VALUES(?,?,?,?, 'Connected', NOW()) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),outlet_id=VALUES(outlet_id),terminal_id=VALUES(terminal_id),status='Connected',last_connected=NOW()");$st->execute([$display,$name,$outlet,$terminal]);
    $st=$pdo->prepare("INSERT INTO customer_display_sessions(display_code,terminal_id,outlet_id,state,state_json,expires_at) VALUES(?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 15 SECOND)) ON DUPLICATE KEY UPDATE terminal_id=VALUES(terminal_id),outlet_id=VALUES(outlet_id),state=VALUES(state),state_json=VALUES(state_json),updated_at=NOW(),expires_at=DATE_ADD(NOW(),INTERVAL 15 SECOND)");$st->execute([$display,$terminal,$outlet,$state,json_encode($data,JSON_UNESCAPED_SLASHES)]);
    $pdo->commit(); echo json_encode(['ok'=>true]); exit;
  }
  if ($action==='state' && $_SERVER['REQUEST_METHOD']==='GET') {
    $display=trim((string)($_GET['display']??'')); $terminal=trim((string)($_GET['terminal']??'')); if(!$display&&!$terminal) throw new InvalidArgumentException('display or terminal is required.');
    if($display){$st=$pdo->prepare("SELECT d.*, s.state, s.state_json, s.updated_at FROM customer_displays d LEFT JOIN customer_display_sessions s ON s.display_code=d.display_code WHERE d.display_code=? LIMIT 1");$st->execute([$display]);}else{$st=$pdo->prepare("SELECT d.*, s.state, s.state_json, s.updated_at FROM customer_displays d LEFT JOIN customer_display_sessions s ON s.display_code=d.display_code WHERE d.terminal_id=? LIMIT 1");$st->execute([$terminal]);}
    $row=$st->fetch(); if(!$row){echo json_encode(['ok'=>true,'data'=>['state'=>'IDLE','items'=>[],'total'=>0,'currency'=>'RM','companyName'=>'Shining Pearl Tinted','imageData'=>'']]);exit;}
    $data=json_decode((string)$row['state_json'],true) ?: []; $data['state']=$row['state']?:'IDLE'; $data['displayName']=$row['display_name']; $data['imageData']=$row['image_data']?:''; $data['updatedAt']=$row['updated_at'];
    if(!empty($row['updated_at']) && strtotime($row['updated_at']) < time()-15 && $data['state']!=='IDLE'){$data['state']='ERROR';}
    echo json_encode(['ok'=>true,'data'=>$data],JSON_UNESCAPED_SLASHES); exit;
  }
  if ($action==='terminal' && $_SERVER['REQUEST_METHOD']==='POST') {
    $b=json_decode(file_get_contents('php://input'),true) ?: []; $code=trim((string)($b['terminalId']??'')); $name=trim((string)($b['terminalName']??$code)); $type=trim((string)($b['terminalType']??'PC POS')); $outlet=trim((string)($b['outletId']??'SP01')); $display=trim((string)($b['displayId']??'')); $displayName=trim((string)($b['displayName']??$display));
    if(!$code||!$display)throw new InvalidArgumentException('terminalId and displayId are required.');
    $pdo->beginTransaction();
    $st=$pdo->prepare("INSERT INTO customer_displays(display_code,display_name,outlet_id,terminal_id,status,last_connected) VALUES(?,?,?,?, 'Disconnected', NULL) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),outlet_id=VALUES(outlet_id),terminal_id=VALUES(terminal_id),updated_at=NOW()");$st->execute([$display,$displayName,$outlet,$code]);
    $id=(int)$pdo->lastInsertId(); if(!$id){$q=$pdo->prepare("SELECT id FROM customer_displays WHERE display_code=?");$q->execute([$display]);$id=(int)$q->fetchColumn();}
    $st=$pdo->prepare("INSERT INTO terminals(terminal_code,terminal_name,terminal_type,outlet_id,customer_display_id,status) VALUES(?,?,?,?,?,'Active') ON DUPLICATE KEY UPDATE terminal_name=VALUES(terminal_name),terminal_type=VALUES(terminal_type),outlet_id=VALUES(outlet_id),customer_display_id=VALUES(customer_display_id),status='Active',updated_at=NOW()");$st->execute([$code,$name,$type,$outlet,$id]);
    $pdo->commit(); echo json_encode(['ok'=>true,'data'=>['terminalId'=>$code,'displayId'=>$display]]); exit;
  }
  if ($action==='image' && $_SERVER['REQUEST_METHOD']==='POST') {
    $b=json_decode(file_get_contents('php://input'),true) ?: []; $display=trim((string)($b['display_code']??'')); $img=(string)($b['image_data']??''); if(!$display||!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,#i',$img))throw new InvalidArgumentException('A PNG, JPG or WebP image is required.'); if(strlen($img)>8*1024*1024)throw new InvalidArgumentException('Image is too large. Maximum 6 MB.');
    $st=$pdo->prepare("INSERT INTO customer_displays(display_code,display_name,image_data) VALUES(?,?,?) ON DUPLICATE KEY UPDATE image_data=VALUES(image_data),updated_at=NOW()");$st->execute([$display,$display,$img]); echo json_encode(['ok'=>true]); exit;
  }
  if ($action==='terminals' && $_SERVER['REQUEST_METHOD']==='GET') { $rows=$pdo->query("SELECT t.*, d.display_code, d.display_name, d.status AS display_status, d.last_connected FROM terminals t LEFT JOIN customer_displays d ON d.id=t.customer_display_id ORDER BY t.terminal_code")->fetchAll(); echo json_encode(['ok'=>true,'data'=>$rows]);exit; }
  throw new InvalidArgumentException('Unknown customer display action.');
} catch(Throwable $e){ http_response_code(500); echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }
