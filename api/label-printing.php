<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/hardening.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$pdo=null;
try{
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
    $action=strtolower(trim((string)($_GET['action']??'')));
    $pdo=spApiDatabase();
    $outlet=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);
    if($outlet<=0)spApiRespond(['ok'=>false,'error'=>'An assigned outlet is required.'],403);
    if(!spTableExists($pdo,'sp_label_printing'))throw new RuntimeException('Import database/SCHEMA-CURRENT.sql before using Label Printing.');
    if($method==='GET'&&$action==='list'){
        $q=$pdo->prepare('SELECT id,code,name,description,price,barcode,image_data,display_barcode,label_width_mm,created_at,updated_at FROM sp_label_printing WHERE outlet_id=? ORDER BY id DESC');
        $q->execute([$outlet]);$rows=$q->fetchAll();
        foreach($rows as &$row){$row['id']=(int)$row['id'];$row['price']=(float)$row['price'];$row['display_barcode']=(bool)$row['display_barcode'];$row['label_width_mm']=(int)$row['label_width_mm'];}unset($row);
        spApiRespond(['ok'=>true,'labels'=>$rows],200);
    }
    if($method!=='POST')spApiRespond(['ok'=>false,'error'=>'Method not allowed.'],405);
    $body=spReadRequestBody();$action=strtolower(trim((string)($body['action']??'')));
    if(!in_array($action,['save','delete'],true))spApiRespond(['ok'=>false,'error'=>'Unknown Label Printing action.'],404);
    $pdo->beginTransaction();spLockOutlet($pdo,$outlet);
    $userId=(int)($_SERVER['SP_AUTH_USER_ID']??0);
    if($action==='delete'){
        $id=filter_var($body['id']??null,FILTER_VALIDATE_INT);if($id===false||$id<=0)throw new InvalidArgumentException('Select a valid label.');
        $q=$pdo->prepare('SELECT id,code,name,description FROM sp_label_printing WHERE id=? AND outlet_id=? FOR UPDATE');$q->execute([$id,$outlet]);$old=$q->fetch();if(!$old)throw new InvalidArgumentException('Label was not found.');
        $pdo->prepare('DELETE FROM sp_label_printing WHERE id=? AND outlet_id=?')->execute([$id,$outlet]);
        spAudit($pdo,'LABEL_PRINTING_DELETE','label_printing',(int)$id,$old,null);$pdo->commit();spApiRespond(['ok'=>true,'deleted'=>(int)$id],200);
    }
    $id=empty($body['id'])?0:filter_var($body['id'],FILTER_VALIDATE_INT);if($id===false||$id<0)throw new InvalidArgumentException('Label id is invalid.');
    $name=trim((string)($body['name']??''));if($name===''||mb_strlen($name)>255)throw new InvalidArgumentException('Name is required and must be 255 characters or fewer.');
    $description=trim((string)($body['description']??''));if($description===''||mb_strlen($description)>255)throw new InvalidArgumentException('Description is required and must be 255 characters or fewer.');
    $price=spMoney($body['price']??null,'Price');
    $barcode=trim((string)($body['barcode']??''));if(strlen($barcode)>128||preg_match('/[\x00-\x1F\x7F]/',$barcode))throw new InvalidArgumentException('Barcode must contain 128 characters or fewer.');
$imageProvided=array_key_exists('image_data',$body);$imageData=trim((string)($body['image_data']??''));if($imageData!==''){if(strlen($imageData)>140000||!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$#D',$imageData,$imageMatch))throw new InvalidArgumentException('Image must be a PNG, JPG or WEBP image smaller than 100 KB after compression.');$imageBytes=base64_decode($imageMatch[2],true);$imageInfo=$imageBytes===false?false:@getimagesizefromstring($imageBytes);if($imageBytes===false||strlen($imageBytes)>100000||!is_array($imageInfo)||!in_array($imageInfo['mime']??'', ['image/jpeg','image/png','image/webp'],true))throw new InvalidArgumentException('Uploaded image data is invalid or too large.');}
    $displayBarcode=filter_var($body['display_barcode']??false,FILTER_VALIDATE_BOOLEAN)?1:0;
    $width=filter_var($body['label_width_mm']??null,FILTER_VALIDATE_INT);if($width===false||$width<20||$width>82)throw new InvalidArgumentException('Label size must be between 20 mm and 82 mm.');
    if($displayBarcode===1&&$barcode==='')throw new InvalidArgumentException('Enter a barcode before enabling barcode display.');
    if($id>0){
        $q=$pdo->prepare('SELECT * FROM sp_label_printing WHERE id=? AND outlet_id=? FOR UPDATE');$q->execute([$id,$outlet]);$old=$q->fetch();if(!$old)throw new InvalidArgumentException('Label was not found.');
        $pdo->prepare('UPDATE sp_label_printing SET name=?,description=?,price=?,barcode=?,image_data=CASE WHEN ?=1 THEN ? ELSE image_data END,display_barcode=?,label_width_mm=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND outlet_id=?')->execute([$name,$description,$price,$barcode,$imageProvided?1:0,$imageData!==''?$imageData:null,$displayBarcode,$width,$userId,$id,$outlet]);
    }else{
        $placeholder='NEW-'.bin2hex(random_bytes(8));
        $pdo->prepare('INSERT INTO sp_label_printing(outlet_id,code,name,description,price,barcode,image_data,display_barcode,label_width_mm,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([$outlet,$placeholder,$name,$description,$price,$barcode,$imageData!==''?$imageData:null,$displayBarcode,$width,$userId,$userId]);
        $id=(int)$pdo->lastInsertId();$code='LBL-'.str_pad((string)$id,6,'0',STR_PAD_LEFT);
        $pdo->prepare('UPDATE sp_label_printing SET code=? WHERE id=? AND outlet_id=?')->execute([$code,$id,$outlet]);$old=null;
    }
    $q=$pdo->prepare('SELECT id,code,name,description,price,barcode,image_data,display_barcode,label_width_mm,created_at,updated_at FROM sp_label_printing WHERE id=? AND outlet_id=?');$q->execute([$id,$outlet]);$saved=$q->fetch();$saved['id']=(int)$saved['id'];$saved['price']=(float)$saved['price'];$saved['display_barcode']=(bool)$saved['display_barcode'];$saved['label_width_mm']=(int)$saved['label_width_mm'];
    $auditOld=$old;if(is_array($auditOld))unset($auditOld['image_data']);$auditSaved=$saved;unset($auditSaved['image_data']);
    spAudit($pdo,$old?'LABEL_PRINTING_UPDATE':'LABEL_PRINTING_CREATE','label_printing', $id,$auditOld,$auditSaved);$pdo->commit();spApiRespond(['ok'=>true,'label'=>$saved],200);
}catch(InvalidArgumentException $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();spApiRespond(['ok'=>false,'error'=>$e->getMessage()],400);}
catch(Throwable $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();error_log('SP Label Printing: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Label Printing could not complete the request. Check the API and label-printing migration.'],503);}
