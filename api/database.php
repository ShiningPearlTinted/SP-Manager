<?php
declare(strict_types=1);
require_once __DIR__ . '/security.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-SP-Manager-DB-Version: V10');
header('X-SP-Manager-Database-Service: SQL-100');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? null;
$host = (string)($db['host'] ?? $config['db_host'] ?? 'localhost');
$port = (string)($db['port'] ?? $config['db_port'] ?? '3306');
$name = (string)($db['name'] ?? $config['db_name'] ?? '');
$user = (string)($db['user'] ?? $config['db_user'] ?? '');
$pass = (string)($db['pass'] ?? $config['db_pass'] ?? '');

function body(): array {
    $v = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($v) ? $v : [];
}
function out(array $v, int $s=200): never {
    http_response_code($s);
    echo json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function tableExists(PDO $pdo, string $table): bool {
    $q=$pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]);
    return (int)$q->fetchColumn() > 0;
}
function quoteIdent(string $name): string {
    return '`'.str_replace('`','``',$name).'`';
}
function columns(PDO $pdo, string $table): array {
    if(!tableExists($pdo,$table)) return [];
    $q=$pdo->query('DESCRIBE '.quoteIdent($table));
    $out=[];
    foreach($q->fetchAll() as $row) $out[(string)$row['Field']]=$row;
    return $out;
}
function outletId(PDO $pdo, mixed $value='SP01'): int {
    $v=trim((string)($value??'SP01')); if($v==='')$v='SP01';
    if(ctype_digit($v)){$q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([(int)$v]);}
    else{$q=$pdo->prepare('SELECT id FROM outlets WHERE outlet_code=? AND active=1 LIMIT 1');$q->execute([$v]);}
    $id=(int)($q->fetchColumn()?:0); if($id<=0)throw new InvalidArgumentException('Outlet not found.'); return $id;
}
function allBaseTables(PDO $pdo): array {
    $q=$pdo->query("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    return array_values(array_map(fn($r)=>(string)$r['TABLE_NAME'],$q->fetchAll()));
}
function snapshotTable(PDO $pdo, string $table): array {
    $cols=columns($pdo,$table);
    $rows=[];
    $q=$pdo->query('SELECT * FROM '.quoteIdent($table));
    foreach($q->fetchAll() as $row){
        foreach($row as $k=>$v){
            if(is_resource($v)) $row[$k]=null;
        }
        $rows[]=$row;
    }
    return ['columns'=>array_values(array_keys($cols)),'rows'=>$rows,'row_count'=>count($rows)];
}
function makeSnapshot(PDO $pdo): array {
    $tables=[];
    foreach(allBaseTables($pdo) as $table){
        $tables[$table]=snapshotTable($pdo,$table);
    }
    return [
        'format'=>'SP-MANAGER-SQL-BACKUP-V1',
        'created_at'=>gmdate('c'),
        'database'=> (string)$pdo->query('SELECT DATABASE()')->fetchColumn(),
        'table_count'=>count($tables),
        'tables'=>$tables,
    ];
}
function insertRows(PDO $pdo, string $table, array $columns, array $rows): int {
    if(!$rows) return 0;
    $currentCols=columns($pdo,$table);
    $usable=array_values(array_filter($columns,fn($c)=>isset($currentCols[$c])));
    if(!$usable) return 0;
    $colsSql=implode(',',array_map('quoteIdent',$usable));
    $ph=implode(',',array_fill(0,count($usable),'?'));
    $sql='INSERT INTO '.quoteIdent($table).' ('.$colsSql.') VALUES ('.$ph.')';
    $q=$pdo->prepare($sql);$count=0;
    foreach($rows as $row){
        $vals=[]; foreach($usable as $c)$vals[]=$row[$c]??null; $q->execute($vals); $count++;
    }
    return $count;
}
function validateSnapshot(array $snapshot): void {
    if(($snapshot['format']??'')!=='SP-MANAGER-SQL-BACKUP-V1') throw new InvalidArgumentException('Invalid SP-Manager database backup format.');
    if(!is_array($snapshot['tables']??null)) throw new InvalidArgumentException('Backup table data is missing.');
}

try{
    $pdo=spApiDatabase();
    $input=body();
    $action=strtolower(trim((string)($_GET['action']??$input['action']??$_POST['action']??'')));
    $oid=outletId($pdo,$_GET['outlet_id']??$input['outlet_id']??$_POST['outlet_id']??($_SERVER['SP_AUTH_OUTLET_ID']??''));

    if($action==='backup'){
        $snapshot=makeSnapshot($pdo);
        $fileName='SP-Manager-SQL-Backup-'.gmdate('Y-m-d_H-i-s').'.json';
        $store=!empty($input['store']);
        $storage='browser-download';
        if($store){
            $dir=__DIR__.'/backups';
            if(!is_dir($dir) && !@mkdir($dir,0700,true)) throw new RuntimeException('Database backup storage is not available.');
            if(!is_writable($dir)) throw new RuntimeException('Database backup storage is not writable.');
            $filePath=$dir.'/'.$fileName.'.gz';
            $encoded=json_encode($snapshot,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
            $compressed=gzencode($encoded,6);
            if($compressed===false) throw new RuntimeException('Database backup could not be compressed.');
            if(file_put_contents($filePath,$compressed,LOCK_EX)===false) throw new RuntimeException('Database backup file could not be written.');
            $storage='server:api/backups/'.$fileName.'.gz';
            $days=max(1,(int)($input['prune_days']??30));
            foreach(glob($dir.'/SP-Manager-SQL-Backup-*.json.gz')?:[] as $old){if(@filemtime($old)<time()-$days*86400)@unlink($old);}
            if(tableExists($pdo,'backup_records')){ $cutoff=gmdate('Y-m-d H:i:s',time()-$days*86400); $dq=$pdo->prepare("DELETE FROM backup_records WHERE outlet_id=? AND backup_type='SQL_SERVER' AND created_at<?"); $dq->execute([$oid,$cutoff]); }
        }
        if(tableExists($pdo,'backup_records')){
            $q=$pdo->prepare('INSERT INTO backup_records(outlet_id,backup_type,file_name,storage_location,created_at,status,metadata_json) VALUES(?,?,?,?,NOW(),?,?)');
            $meta=['format'=>$snapshot['format'],'table_count'=>$snapshot['table_count'],'row_counts'=>array_map(fn($v)=>(int)($v['row_count']??0),$snapshot['tables']),'stored'=>$store];
            $q->execute([$oid,$store?'SQL_SERVER':'SQL_JSON',$fileName,$storage,'COMPLETED',json_encode($meta,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)]);
        }
        out(['ok'=>true,'api_version'=>'V10','database_backup_version'=>'V1','outlet_id'=>$oid,'file_name'=>$fileName,'stored'=>$store,'storage_location'=>$storage,'snapshot'=>$store?null:$snapshot]);
    }

    if($action==='restore' && $_SERVER['REQUEST_METHOD']==='POST'){
        $snapshot=body()['snapshot']??body(); validateSnapshot($snapshot);
        $pdo->beginTransaction();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $restored=0; $tables=0;
        foreach($snapshot['tables'] as $table=>$payload){
            $table=(string)$table;
            if(!tableExists($pdo,$table)) continue;
            $meta=columns($pdo,$table); if(!$meta) continue;
            // Do not blindly restore MySQL internal/system tables or migration metadata.
            if(str_starts_with($table,'information_schema')) continue;
            $pdo->exec('DELETE FROM '.quoteIdent($table));
            $restored += insertRows($pdo,$table,is_array($payload['columns']??null)?$payload['columns']:array_keys($meta),is_array($payload['rows']??null)?$payload['rows']:[]);
            $tables++;
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $pdo->commit();
        if(tableExists($pdo,'backup_records')){
            $q=$pdo->prepare('INSERT INTO backup_records(outlet_id,backup_type,file_name,storage_location,created_at,status,metadata_json) VALUES(?,?,?,?,NOW(),?,?)');
            $q->execute([$oid,'SQL_RESTORE',null,'browser-upload','COMPLETED',json_encode(['source_format'=>$snapshot['format']??null,'restored_tables'=>$tables,'restored_rows'=>$restored,'restored_at'=>gmdate('c')],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)]);
        }
        out(['ok'=>true,'api_version'=>'V10','database_backup_version'=>'V1','outlet_id'=>$oid,'restored_tables'=>$tables,'restored_rows'=>$restored]);
    }

    if($action==='health'){
        out(['ok'=>true,'api_version'=>'V10','database_backup_version'=>'V1','database'=>$name,'outlet_id'=>$oid,'sql_first'=>true]);
    }
    throw new InvalidArgumentException('Unknown action.');
}catch(Throwable $e){
    if(isset($pdo)&&$pdo->inTransaction()){try{$pdo->exec('SET FOREIGN_KEY_CHECKS=1');}catch(Throwable $ignore){}$pdo->rollBack();}
    out(['ok'=>false,'api_version'=>'V10','database_backup_version'=>'V1','error'=>'The database backup operation could not be completed.'],500);
}
