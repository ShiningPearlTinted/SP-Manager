<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';

function batteryText(array $row, string $key, int $max, bool $required=false): string {
    $v=$row[$key]??'';
    if (!is_scalar($v) && $v!==null) throw new InvalidArgumentException($key.' must be text.');
    $s=trim((string)$v);
    if (($required && $s==='') || mb_strlen($s)>$max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u',$s)) throw new InvalidArgumentException($key.' is missing or too long.');
    return $s;
}
function batteryNumber(mixed $value, string $label, float $max, bool $nullable=false): ?float {
    if ($nullable && ($value===null || $value==='')) return null;
    if (!is_numeric($value) || !is_finite((float)$value) || (float)$value<0 || (float)$value>$max) throw new InvalidArgumentException($label.' must be a valid non-negative number.');
    return round((float)$value,2);
}
function batteryInteger(mixed $value, string $label, int $max): int {
    if (!is_numeric($value) || (float)$value!==floor((float)$value) || (float)$value<0 || (float)$value>$max) throw new InvalidArgumentException($label.' must be a valid whole number.');
    return (int)$value;
}
function batteryNormalize(array $r): array {
    $data=['car_brand'=>batteryText($r,'car_brand',100,true),'model'=>batteryText($r,'model',180,true)];
    for ($i=1;$i<=5;$i++) {
        $size=batteryText($r,'size_option'.$i,64);$size=$size===''?'-':$size;
        $price=batteryNumber($r['price_option'.$i]??0,'Price option '.$i,9999999999);
        if ($size==='-' && $price>0) throw new InvalidArgumentException('Price option '.$i.' requires a battery size.');
        $data['size_option'.$i]=$size;$data['price_option'.$i]=$price;
    }
    return $data;
}
function batterySave(PDO $pdo, int $outlet, array $input, bool $import=false): int {
    $data=batteryNormalize($input);
    $id=batteryInteger($input['id']??0,'ID',PHP_INT_MAX);
    $revision=batteryInteger($input['revision']??0,'Revision',4294967294);
    $q=$pdo->prepare($id>0 ? 'SELECT * FROM car_batteries WHERE outlet_id=? AND id=? FOR UPDATE' : 'SELECT * FROM car_batteries WHERE outlet_id=? AND car_brand=? AND model=? FOR UPDATE');
    $q->execute($id>0?[$outlet,$id]:[$outlet,$data['car_brand'],$data['model']]); $old=$q->fetch();
    if ($id>0 && !$old) throw new DomainException('Battery was deleted or is unavailable in this outlet. Refresh the list.');
    if ($old && (!$import && $id===0)) throw new DomainException('Car brand and model already exist in this outlet.');
    if ($old && (int)$old['revision']!==$revision) throw new DomainException('Battery changed since it was loaded: '.($data['car_brand'].' / '.$data['model']).'. Refresh before editing or importing.');
    if (!$old && $revision!==0) throw new DomainException('Battery no longer exists: '.($data['car_brand'].' / '.$data['model']).'. Refresh before importing.');
    if ($old) {
        $id=(int)$old['id'];
        $sql='UPDATE car_batteries SET '.implode(',',array_map(fn($k)=>$k.'=?',array_keys($data))).',revision=revision+1 WHERE id=? AND outlet_id=?';
        $pdo->prepare($sql)->execute([...array_values($data),$id,$outlet]);
    } else {
        $sql='INSERT INTO car_batteries (outlet_id,'.implode(',',array_keys($data)).') VALUES ('.implode(',',array_fill(0,count($data)+1,'?')).')';
        $pdo->prepare($sql)->execute([$outlet,...array_values($data)]); $id=(int)$pdo->lastInsertId();
    }
    spAudit($pdo,$import?'BATTERY_IMPORT':'BATTERY_SAVE','car_batteries',$id,$old?:null,$data);
    return $id;
}

try {
    $pdo=spApiDatabase(); $outlet=(int)$_SERVER['SP_AUTH_OUTLET_ID'];
    if (!spTableExists($pdo,'car_batteries')) spApiRespond(['ok'=>false,'error'=>'Run PRICE-CHECK-MIGRATION.sql before using Car Battery.'],503);
    $action=strtolower(trim((string)($_GET['action']??'list')));
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
    if ($action==='list' && $method==='GET') {
        $q=$pdo->prepare('SELECT * FROM car_batteries WHERE outlet_id=? ORDER BY car_brand,model,id');$q->execute([$outlet]);
        spApiRespond(['ok'=>true,'outlet_id'=>$outlet,'batteries'=>$q->fetchAll()],200);
    }
    if (!in_array($action,['save','delete','import'],true)) spApiRespond(['ok'=>false,'error'=>'Unknown action.'],404);
    if ($method!=='POST') spApiRespond(['ok'=>false,'error'=>'Use POST for battery changes.'],405);
    $body=spReadRequestBody(); $pdo->beginTransaction(); spLockOutlet($pdo,$outlet);
    if ($action==='save') {
        if (!is_array($body['battery']??null)) throw new InvalidArgumentException('Battery details are required.');
        $id=batterySave($pdo,$outlet,$body['battery']);
        $pdo->commit(); spApiRespond(['ok'=>true,'id'=>$id],200);
    }
    if ($action==='delete') {
        $id=batteryInteger($body['id']??0,'ID',PHP_INT_MAX);$revision=batteryInteger($body['revision']??0,'Revision',4294967294);
        $q=$pdo->prepare('SELECT * FROM car_batteries WHERE id=? AND outlet_id=? FOR UPDATE');$q->execute([$id,$outlet]);$old=$q->fetch();
        if (!$old || (int)$old['revision']!==$revision) throw new DomainException('Battery changed or was deleted. Refresh the list.');
        $pdo->prepare('DELETE FROM car_batteries WHERE id=? AND outlet_id=?')->execute([$id,$outlet]);spAudit($pdo,'BATTERY_DELETE','car_batteries',$id,$old,null);
        $pdo->commit();spApiRespond(['ok'=>true],200);
    }
    $rows=$body['batteries']??null;
    if (!is_array($rows) || !array_is_list($rows) || count($rows)<1 || count($rows)>10000) throw new InvalidArgumentException('Import must contain 1 to 10000 batteries.');
    $seen=[];
    foreach ($rows as $i=>$r) {
        if (!is_array($r)) throw new InvalidArgumentException('Invalid row '.($i+2));
        $data=batteryNormalize($r);$key=json_encode([mb_strtolower($data['car_brand']),mb_strtolower($data['model'])],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        if (isset($seen[$key])) throw new InvalidArgumentException('Duplicate car brand/model in import: '.($data['car_brand'].' / '.$data['model']));$seen[$key]=true;
    }
    foreach ($rows as $r) batterySave($pdo,$outlet,$r,true);
    $pdo->commit();spApiRespond(['ok'=>true,'count'=>count($rows)],200);
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();spApiRespond(['ok'=>false,'error'=>$e->getMessage()],422);
} catch (DomainException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();spApiRespond(['ok'=>false,'error'=>$e->getMessage()],409);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ($e->getCode()==='23000') spApiRespond(['ok'=>false,'error'=>'Car brand and model already exist in this outlet.'],409);
    error_log('SP Battery: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Battery database request failed. Check the server log.'],500);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();error_log('SP Battery: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Battery request could not be completed.'],500);
}
