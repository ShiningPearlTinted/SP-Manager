<?php
declare(strict_types=1);

/** Shared format and encrypted storage for ordinary backups and outlet reset. */
function spBackupIdent(string $value): string { return '`'.str_replace('`','``',$value).'`'; }
function spBackupSnapshot(PDO $pdo,bool $lockRows=false): array {
    $owns=!$pdo->inTransaction();
    if($owns){$pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$pdo->beginTransaction();}
    try {
        $tables=[];
        foreach($pdo->query("SELECT TABLE_NAME,ENGINE FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll() as $table){
            if(strtoupper((string)$table['ENGINE'])!=='INNODB')throw new RuntimeException('Backup requires transactional InnoDB tables.');
            $name=(string)$table['TABLE_NAME'];
            $cols=$pdo->query('DESCRIBE '.spBackupIdent($name))->fetchAll();
            $names=array_column($cols,'Field');
            $primary=array_column(array_filter($cols,fn($c)=>$c['Key']==='PRI'),'Field');
            $order=$primary?' ORDER BY '.implode(',',array_map('spBackupIdent',$primary)):'';
            $rows=$pdo->query('SELECT * FROM '.spBackupIdent($name).$order.($lockRows?' FOR UPDATE':''))->fetchAll();
            $tables[$name]=['columns'=>$names,'rows'=>$rows,'row_count'=>count($rows)];
        }
        $snapshot=['format'=>'SP-MANAGER-SQL-BACKUP-V1','created_at'=>gmdate('c'),'database'=>(string)$pdo->query('SELECT DATABASE()')->fetchColumn(),'table_count'=>count($tables),'tables'=>$tables];
        if($owns)$pdo->commit();
        return $snapshot;
    }catch(Throwable $e){if($owns&&$pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function spBackupDirectory(): string {
    $dir=realpath((string)(spApiConfig()['backup_dir']??''));
    if(!$dir||!is_dir($dir)||!is_writable($dir))throw new RuntimeException('Configure a writable private backup_dir before resetting.');
    $web=realpath((string)(($_SERVER['DOCUMENT_ROOT']??'')?:__DIR__));
    $normalize=fn($p)=>strtolower(rtrim(str_replace('\\','/',$p),'/'));
    if($web&&($normalize($dir)===$normalize($web)||str_starts_with($normalize($dir),$normalize($web).'/')))throw new RuntimeException('backup_dir must be outside the webroot.');
    if(strlen((string)(spApiConfig()['encryption_key']??''))<64)throw new RuntimeException('Configure the backup encryption key before resetting.');
    return $dir;
}
function spBackupRead(string $path): array {
    $blob=file_get_contents($path);
    if(!is_string($blob)||strlen($blob)<33||substr($blob,0,4)!=='SPB2')throw new RuntimeException('Backup verification failed.');
    $key=hash_hkdf('sha256',(string)spApiConfig()['encryption_key'],32,'SP-Manager:backup');
    $plain=openssl_decrypt(substr($blob,32),'aes-256-gcm',$key,OPENSSL_RAW_DATA,substr($blob,4,12),substr($blob,16,16),'SPB2');
    $json=$plain===false?false:gzdecode($plain);
    if($json===false)throw new RuntimeException('Backup verification failed.');
    return json_decode($json,true,512,JSON_THROW_ON_ERROR);
}
function spBackupStore(array $snapshot,string $fileName): string {
    $dir=spBackupDirectory();
    if(basename($fileName)!==$fileName||!preg_match('/^[A-Za-z0-9_.-]+\.json$/',$fileName))throw new InvalidArgumentException('Invalid backup filename.');
    $json=json_encode($snapshot,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    $compressed=gzencode($json,6);if($compressed===false)throw new RuntimeException('Backup compression failed.');
    $iv=random_bytes(12);$tag='';$key=hash_hkdf('sha256',(string)spApiConfig()['encryption_key'],32,'SP-Manager:backup');
    $encrypted=openssl_encrypt($compressed,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag,'SPB2');
    if($encrypted===false)throw new RuntimeException('Backup encryption failed.');
    $blob='SPB2'.$iv.$tag.$encrypted;$path=$dir.DIRECTORY_SEPARATOR.$fileName.'.enc';
    $file=@fopen($path,'xb');if($file===false)throw new RuntimeException('Cannot create a new private backup file.');
    try{if(fwrite($file,$blob)!==strlen($blob)||!fflush($file))throw new RuntimeException('Backup write failed.');if(function_exists('fsync')&&!fsync($file))throw new RuntimeException('Backup flush failed.');}
    finally{fclose($file);}
    @chmod($path,0600);
    if(!hash_equals(hash('sha256',$json),hash('sha256',json_encode(spBackupRead($path),JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE))))throw new RuntimeException('Backup verification failed.');
    return hash_file('sha256',$path);
}
