<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('SP_MANAGER_CLI',true);require_once __DIR__.'/security.php';
/** Restore only an empty, explicitly named staging database; never the configured live DB. */
try {
 $file=$argv[1]??'';$target=$argv[2]??'';$config=spApiConfig();$db=$config['db']??[];
 if(!preg_match('/^[A-Za-z0-9_]+_(?:restore|staging)(?:_[0-9]+)?$/',$target)||strcasecmp($target,(string)($db['name']??''))===0)throw new RuntimeException('Choose a different database ending in _restore or _staging.');
 if(!is_file($file)||filesize($file)>268435456)throw new RuntimeException('Backup file missing or too large.');$raw=file_get_contents($file);
 if(str_starts_with($raw,'SPB2')){$key=(string)($config['encryption_key']??'');if(strlen($key)<64)throw new RuntimeException('Encryption key missing.');$compressed=openssl_decrypt(substr($raw,32),'aes-256-gcm',hash_hkdf('sha256',$key,32,'SP-Manager:backup'),OPENSSL_RAW_DATA,substr($raw,4,12),substr($raw,16,16),'SPB2');if($compressed===false)throw new RuntimeException('Backup authentication failed.');$raw=gzdecode($compressed,268435456);if($raw===false)throw new RuntimeException('Invalid compressed backup.');}
 $snapshot=json_decode($raw,true,512,JSON_THROW_ON_ERROR);if(($snapshot['format']??'')!=='SP-MANAGER-SQL-BACKUP-V1'||!is_array($snapshot['tables']??null))throw new RuntimeException('Invalid backup format.');
 $pdo=new PDO('mysql:host='.($db['host']??'127.0.0.1').';port='.($db['port']??3306).';dbname='.$target.';charset=utf8mb4',(string)($db['user']??''),(string)($db['pass']??''),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $tables=$pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name")->fetchAll(PDO::FETCH_COLUMN);$provided=array_keys($snapshot['tables']);sort($tables);sort($provided);if($tables!==$provided)throw new RuntimeException('Table manifest mismatch. Initialize staging with the matching release schema.');
 foreach($tables as $table){if((int)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()!==0)throw new RuntimeException('Staging database must be empty.');$columns=$pdo->query('DESCRIBE `'.$table.'`')->fetchAll(PDO::FETCH_COLUMN);$entry=$snapshot['tables'][$table];if(($entry['columns']??[])!==$columns||!is_array($entry['rows']??null))throw new RuntimeException('Column manifest mismatch for '.$table);foreach($entry['rows'] as $row)if(!is_array($row)||array_keys($row)!==$columns)throw new RuntimeException('Row shape mismatch for '.$table);}
 $rows=0;$pdo->beginTransaction();$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
 try {
  foreach($tables as $table){$entry=$snapshot['tables'][$table];$columns=$entry['columns'];$sql='INSERT INTO `'.$table.'` (`'.implode('`,`',$columns).'`) VALUES('.implode(',',array_fill(0,count($columns),'?')).')';$stmt=$pdo->prepare($sql);foreach($entry['rows'] as $row){$stmt->execute(array_values($row));$rows++;}}
  $fk=$pdo->query('SELECT constraint_name,table_name,column_name,referenced_table_name,referenced_column_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name IS NOT NULL ORDER BY table_name,constraint_name,ordinal_position')->fetchAll();$groups=[];foreach($fk as $r)$groups[$r['table_name'].'|'.$r['constraint_name']][]=$r;
  foreach($groups as $group){$child=$group[0]['table_name'];$parent=$group[0]['referenced_table_name'];$join=[];$nonnull=[];foreach($group as $r){$join[]='p.`'.$r['referenced_column_name'].'`=c.`'.$r['column_name'].'`';$nonnull[]='c.`'.$r['column_name'].'` IS NOT NULL';}$sql='SELECT COUNT(*) FROM `'.$child.'` c WHERE '.implode(' AND ',$nonnull).' AND NOT EXISTS(SELECT 1 FROM `'.$parent.'` p WHERE '.implode(' AND ',$join).')';if((int)$pdo->query($sql)->fetchColumn()>0)throw new RuntimeException('Foreign key validation failed for '.$child);}
  $pdo->exec('UPDATE users SET session_version=session_version+1');$pdo->exec('SET FOREIGN_KEY_CHECKS=1');$pdo->commit();
 } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;} finally {$pdo->exec('SET FOREIGN_KEY_CHECKS=1');}
 echo json_encode(['ok'=>true,'staging_database'=>$target,'tables'=>count($tables),'rows'=>$rows,'foreign_keys_validated'=>count($groups),'sessions_revoked'=>true],JSON_PRETTY_PRINT).PHP_EOL;
} catch(Throwable $e){fwrite(STDERR,'Restore rejected: '.$e->getMessage().PHP_EOL);exit(1);}
