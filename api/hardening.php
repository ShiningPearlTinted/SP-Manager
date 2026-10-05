<?php
declare(strict_types=1);

/** Release 1.0.45: shared business invariants. No runtime DDL. */
function spRequireTable(PDO $pdo, string $table): void {
    if (!spTableExists($pdo, $table)) throw new RuntimeException('Release 1.0.45 migration is required: '.$table);
}
function spRequireColumns(PDO $pdo, string $table, array $columns): void {
    spRequireTable($pdo, $table);
    $q=$pdo->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?');
    $q->execute([$table]); $found=array_fill_keys($q->fetchAll(PDO::FETCH_COLUMN),true);
    foreach($columns as $column) if(!isset($found[$column])) throw new RuntimeException('Release 1.0.45 migration is required: '.$table.'.'.$column);
}
function spDateTime(mixed $value): ?string {
    if($value===null || $value==='') return null;
    try { return (new DateTimeImmutable((string)$value,new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'); }
    catch(Throwable $e) { throw new InvalidArgumentException('Invalid date/time.'); }
}
function spMoney(mixed $value, string $label='Amount', bool $negative=false): float {
    if(!is_numeric($value) || !is_finite((float)$value) || abs((float)$value)>999999999) throw new InvalidArgumentException($label.' is invalid.');
    $amount=round((float)$value,2);
    if(!$negative && $amount<0) throw new InvalidArgumentException($label.' cannot be negative.');
    return $amount;
}
function spQuantity(mixed $value): float {
    if(!is_numeric($value) || !is_finite((float)$value) || (float)$value<=0 || (float)$value>1000000) throw new InvalidArgumentException('Quantity must be positive and within the supported range.');
    return round((float)$value,3);
}
function spOutletSettings(PDO $pdo,int $outlet): array {
    $q=$pdo->prepare("SELECT setting_value FROM outlet_settings WHERE outlet_id=? AND setting_group='SP-MANAGER' AND setting_key='settings' LIMIT 1");
    $q->execute([$outlet]);$data=json_decode((string)$q->fetchColumn(),true);return is_array($data)?$data:[];
}
function spAssertOpenDay(PDO $pdo,int $outlet,mixed $date): void {
    $stamp=spDateTime($date) ?? gmdate('Y-m-d H:i:s');
    $zone=(string)(spApiConfig()['business_timezone']??'Asia/Kuala_Lumpur');
    $business=(new DateTimeImmutable($stamp,new DateTimeZone('UTC')))->setTimezone(new DateTimeZone($zone))->format('Y-m-d');
    $q=$pdo->prepare('SELECT status FROM end_of_day WHERE outlet_id=? AND business_date=? FOR UPDATE');$q->execute([$outlet,$business]);
    if(strtoupper((string)$q->fetchColumn())==='CLOSED') throw new RuntimeException('This business day is closed. Create an adjustment on an open business day.');
}
function spLockOutlet(PDO $pdo,int $outlet): void {
    if(!$pdo->inTransaction()) throw new LogicException('Outlet lock requires a transaction.');
    $q=$pdo->prepare('SELECT id FROM outlets WHERE id=? AND active=1 FOR UPDATE');$q->execute([$outlet]);
    if(!$q->fetchColumn()) throw new RuntimeException('Outlet is inactive or missing.');
}
function spAudit(PDO $pdo,string $action,string $entity,?int $id=null,?array $old=null,?array $new=null): void {
    $redact=function($value) use (&$redact) { if(!is_array($value))return$value;$out=[];foreach($value as $k=>$v){if(preg_match('/password|secret|api_token|auth_token|encryption_key/i',(string)$k))$out[$k]='[REDACTED]';else$out[$k]=$redact($v);}return$out; };
    $q=$pdo->prepare('INSERT INTO audit_logs(outlet_id,user_id,action_name,entity_type,entity_id,old_data,new_data) VALUES(?,?,?,?,?,?,?)');
    $q->execute([(int)($_SERVER['SP_AUTH_OUTLET_ID']??0)?:null,(int)($_SERVER['SP_AUTH_USER_ID']??0)?:null,$action,$entity,$id,$old===null?null:json_encode($redact($old),JSON_THROW_ON_ERROR),$new===null?null:json_encode($redact($new),JSON_THROW_ON_ERROR)]);
}
function spRequestKey(array $payload,string $scope): string {
    $raw=trim((string)($payload['request_id']??$_SERVER['HTTP_IDEMPOTENCY_KEY']??''));
    if(!preg_match('/^[A-Za-z0-9_.:-]{8,100}$/',$raw)) throw new InvalidArgumentException('A stable request_id is required for '.$scope.'.');
    return hash('sha256',$scope.'|'.(int)($_SERVER['SP_AUTH_OUTLET_ID']??0).'|'.$raw);
}
function spRequestReplay(PDO $pdo,string $key,array $payload): ?array {
    $hash=hash('sha256',json_encode($payload,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES));
    $pdo->prepare('INSERT IGNORE INTO sp_request_receipts(request_key,user_id,payload_hash) VALUES(?,?,?)')->execute([$key,(int)($_SERVER['SP_AUTH_USER_ID']??0),$hash]);
    $q=$pdo->prepare('SELECT user_id,payload_hash,response_json FROM sp_request_receipts WHERE request_key=? FOR UPDATE');$q->execute([$key]);$row=$q->fetch();
    if(!$row || (int)$row['user_id']!==(int)($_SERVER['SP_AUTH_USER_ID']??0) || !hash_equals((string)$row['payload_hash'],$hash)) throw new RuntimeException('request_id was already used with a different request.');
    return $row['response_json']?json_decode($row['response_json'],true,512,JSON_THROW_ON_ERROR):null;
}
function spRequestComplete(PDO $pdo,string $key,array $response): void {
    $pdo->prepare('UPDATE sp_request_receipts SET response_json=? WHERE request_key=?')->execute([json_encode($response,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES),$key]);
}
function spNextDocumentNumber(PDO $pdo,int $outlet,string $type,string $prefix): string {
    // All namespaces share one counter source; outlet lock serializes first inserts.
    spLockOutlet($pdo,$outlet);
    $pdo->prepare('INSERT IGNORE INTO sp_document_counters(outlet_id,doc_type,current_number) VALUES(?,?,0)')->execute([$outlet,$type]);
    $q=$pdo->prepare('SELECT current_number FROM sp_document_counters WHERE outlet_id=? AND doc_type=? FOR UPDATE');$q->execute([$outlet,$type]);$n=(int)$q->fetchColumn();
    for($i=0;$i<1000;$i++) {
        $no=$prefix.str_pad((string)(++$n),8,'0',STR_PAD_LEFT);
        $used=false;
        foreach($type==='Invoice'?[['sales','sale_no'],['invoices','invoice_no']]:($type==='Quotation'?[['quotations','quotation_no']]:($type==='Order'?[['open_orders','order_no']]:($type==='Purchase'?[['purchases','purchase_no']]:[]))) as [$table,$col]) {
            $c=$pdo->prepare('SELECT 1 FROM `'.$table.'` WHERE outlet_id=? AND `'.$col.'`=? LIMIT 1');$c->execute([$outlet,$no]);if($c->fetchColumn())$used=true;
        }
        if(!$used){$pdo->prepare('UPDATE sp_document_counters SET current_number=? WHERE outlet_id=? AND doc_type=?')->execute([$n,$outlet,$type]);return$no;}
    }
    throw new RuntimeException('Document number allocation requires counter reconciliation.');
}
function spNormalizeSale(PDO $pdo,int $outlet,array $sale): array {
    $items=$sale['items']??null;if(!is_array($items)||!$items||count($items)>500)throw new InvalidArgumentException('Sale requires 1–500 item rows.');
    $settings=spOutletSettings($pdo,$outlet);$subtotal=0.0;$normalized=[];
    foreach($items as $item) {
        if(!is_array($item))throw new InvalidArgumentException('Invalid sale item.');
        $pid=(int)($item['productDbId']??$item['product_id']??$item['productId']??$item['id']??0);
        $q=$pdo->prepare('SELECT p.*,po.active AS outlet_active,po.stock_qty FROM products p JOIN product_outlets po ON po.product_id=p.id AND po.outlet_id=? WHERE p.id=? AND p.active=1 AND po.active=1 FOR UPDATE');$q->execute([$outlet,$pid]);$p=$q->fetch();
        if(!$p)throw new InvalidArgumentException('Product is not active in this outlet.');
        $qty=spQuantity($item['qty']??$item['quantity']??0);$price=spMoney($item['price']??$item['unitPrice']??$p['selling_price'],'Unit price');
        if(empty($p['allow_price_change']) && abs($price-(float)$p['selling_price'])>0.005 && abs($price-spPromotionPrice($pdo,$p,$qty))>0.005)throw new InvalidArgumentException('This product does not allow price changes.');
        if(!empty($settings['order']['preventSaleBelowCost']) && $price<(float)$p['cost_price'])throw new InvalidArgumentException('Sale price cannot be below cost.');
        $discount=spMoney($item['discount']??0,'Item discount');$tax=spMoney($item['tax']??0,'Item tax');$base=round($qty*$price,2);
        if($discount>$base)throw new InvalidArgumentException('Item discount exceeds its value.');
        if($discount>0 && !spHasPermission('manageDiscount'))throw new RuntimeException('Discount permission is required.');
        if($discount>0||$tax>0)throw new InvalidArgumentException('POS item tax/discount must be expressed in checked cart totals.');$line=$base;$subtotal+=$base;
        $normalized[]=[...$item,'id'=>$pid,'productDbId'=>$pid,'productId'=>$pid,'product_id'=>$pid,'qty'=>$qty,'quantity'=>$qty,'price'=>$price,'discount'=>$discount,'tax'=>$tax,'lineTotal'=>$line,'total'=>$line,'costSnapshot'=>(float)$p['cost_price']];
    }
    $discount=spMoney($sale['discount']??0,'Cart discount');$tax=spMoney($sale['tax']??0,'Cart tax');
    $itemTotal=array_sum(array_column($normalized,'lineTotal'));if($discount>$itemTotal)throw new InvalidArgumentException('Cart discount exceeds its value.');
    $q=$pdo->prepare("SELECT setting_value FROM outlet_settings WHERE outlet_id=? AND setting_group='SP-MANAGER' AND setting_key='taxRate' LIMIT 1");$q->execute([$outlet]);$rate=(float)(json_decode((string)$q->fetchColumn(),true)??0);
    if($rate<0||$rate>100)throw new RuntimeException('Configured tax rate is invalid.');
    $inclusive=!empty($settings['products']['taxInclusive']);
    $customerDiscount=0.0;$cid=(int)($sale['customerId']??$sale['customer_id']??0);
    if($cid>0){$q=$pdo->prepare('SELECT discount_percent,tax_exempt FROM customers WHERE id=? AND (outlet_id=? OR outlet_id IS NULL)');$q->execute([$cid,$outlet]);$customer=$q->fetch();if($customer){$customerDiscount=round($subtotal*min(100,max(0,(float)$customer['discount_percent']))/100,2);if(!empty($customer['tax_exempt']))$rate=0.0;}}
    if($discount>$customerDiscount+0.005&&!spHasPermission('manageDiscount'))throw new RuntimeException('Manual discount permission is required.');
    $taxBase=($settings['products']['discountRule']??'After tax')==='Before tax'?$subtotal-$discount:$subtotal-$customerDiscount;
    $expectedTax=round($inclusive?($subtotal-$discount)*$rate/(100+$rate):max(0,$taxBase)*$rate/100,2);
    if(abs($tax-$expectedTax)>0.02)throw new InvalidArgumentException('Tax does not match configured tax rules. Refresh settings.');
    $tax=$expectedTax;$total=round($subtotal-$discount+($inclusive?0:$tax),2);
    if(isset($sale['total']) && abs(spMoney($sale['total'],'Total')-$total)>0.01)throw new InvalidArgumentException('Sale total does not match its item rows. Refresh the cart.');
    $pays=[];$paid=0.0;if(!is_array($sale['payments']??[]))throw new InvalidArgumentException('Payments must be an array.');
    foreach(($sale['payments']??[]) as $pay) {
        if(!is_array($pay))throw new InvalidArgumentException('Invalid payment.');$id=(int)($pay['paymentTypeDbId']??$pay['payment_type_id']??$pay['paymentTypeId']??0);
        $q=$pdo->prepare('SELECT * FROM payment_types WHERE id=? AND enabled=1 AND outlet_id=? LIMIT 1');$q->execute([$id,spMasterOutletId($pdo)]);$pt=$q->fetch();if(!$pt)throw new InvalidArgumentException('Payment type is disabled or missing.');
        $amount=spMoney($pay['amount']??0,'Payment amount');$tendered=spMoney($pay['tendered']??$amount,'Tendered');$change=spMoney($pay['change']??$pay['changeAmount']??0,'Change');if($change>$tendered)throw new InvalidArgumentException('Change exceeds tendered amount.');if($amount>$total-$paid && strcasecmp((string)$pt['payment_name'],'Cash')===0){$tendered=max($tendered,$amount);$amount=max(0,round($total-$paid,2));$change=round($tendered-$amount,2);}if(empty($pt['mark_paid']))$amount=0;
        if(!empty($pt['customer_required']) && empty($sale['customerId'])&&empty($sale['customer_id']))throw new InvalidArgumentException('This payment requires a customer.');
        $pays[]=[...$pay,'paymentTypeId'=>$id,'paymentTypeDbId'=>$id,'payment_type_id'=>$id,'payment'=>$pt['payment_name'],'amount'=>$amount,'tendered'=>$tendered,'change'=>$change,'paid'=>!empty($pt['mark_paid'])];$paid+=$amount;
    }
    if($paid>$total+0.01)throw new InvalidArgumentException('Recorded payments cannot exceed total. Record cash tender/change separately.');
    $status=!empty($sale['voided'])?'VOIDED':(!empty($sale['refunded'])?'REFUNDED':strtoupper(trim((string)($sale['status']??'COMPLETED'))));
    if(!in_array($status,['COMPLETED','VOIDED','REFUNDED','CANCELLED'],true))throw new InvalidArgumentException('Invalid sale status.');
    return [...$sale,'items'=>$normalized,'payments'=>$pays,'subtotal'=>round($subtotal,2),'discount'=>$discount,'tax'=>$tax,'total'=>$total,'paid'=>$paid+0.005>=$total,'paymentAmount'=>$paid,'paymentStatus'=>$paid+0.005>=$total?'PAID':($paid>0?'PARTIAL':'UNPAID'),'status'=>$status];
}
function spStateRevision(PDO $pdo,int $outlet,string $key): int {
    $q=$pdo->prepare('SELECT revision FROM sp_state_versions WHERE outlet_id=? AND state_key=?');$q->execute([$outlet,$key]);return(int)($q->fetchColumn()?:0);
}
function spCheckStateRevision(PDO $pdo,int $outlet,string $key,mixed $revision): void {
    $pdo->prepare('INSERT IGNORE INTO sp_state_versions(outlet_id,state_key,revision) VALUES(?,?,0)')->execute([$outlet,$key]);
    $q=$pdo->prepare('SELECT revision FROM sp_state_versions WHERE outlet_id=? AND state_key=? FOR UPDATE');$q->execute([$outlet,$key]);$current=(int)$q->fetchColumn();
    if($revision===null || !ctype_digit((string)$revision) || (int)$revision!==$current)throw new RuntimeException('This list changed on another terminal. Refresh it before saving.');
}
function spAdvanceStateRevision(PDO $pdo,int $outlet,string $key): int {
    $pdo->prepare('INSERT INTO sp_state_versions(outlet_id,state_key,revision) VALUES(?,?,1) ON DUPLICATE KEY UPDATE revision=revision+1')->execute([$outlet,$key]);return spStateRevision($pdo,$outlet,$key);
}
function spHasPermission(string $permission): bool {
    $actor=$GLOBALS['spActor']??[];return ($actor['role_name']??'')==='Administrator' || !empty((json_decode((string)($actor['permissions_json']??''),true)?:[])[$permission]);
}
function spValidateUserChange(PDO $pdo, int $target, array $input, int $outlet): void {
    $actor=$GLOBALS['spActor']??[];$admin=($actor['role_name']??'')==='Administrator';
    $old=null;
    if($target>0){$q=$pdo->prepare('SELECT u.*,r.role_name FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? FOR UPDATE');$q->execute([$target]);$old=$q->fetch();if(!$old)throw new RuntimeException('User not found.');}
    if(!$admin) {
        if(($input['role']??'')==='Administrator'||($old['role_name']??'')==='Administrator')throw new RuntimeException('Only an Administrator may manage Administrator accounts.');
        if($old && (int)$old['outlet_id']!==$outlet)throw new RuntimeException('Target user belongs to another outlet.');
        foreach((array)($input['outlet_ids']??$input['outlets']??[$outlet]) as $id)if(!is_scalar($id)||(int)$id!==$outlet)throw new RuntimeException('Only an Administrator may assign other outlets.');
        foreach((array)($input['permissions']??[]) as $key=>$enabled)if($enabled && !spHasPermission((string)$key))throw new RuntimeException('Cannot grant a permission you do not hold.');
    }
    if($old && $old['role_name']==='Administrator' && (int)$old['enabled']===1 && (empty($input['enabled'])||($input['role']??'')!=='Administrator')) {
        $q=$pdo->prepare("SELECT id FROM users WHERE enabled=1 AND role_id=? AND id<>? FOR UPDATE");$q->execute([(int)$old['role_id'],$target]);if(!$q->fetch())throw new RuntimeException('At least one enabled Administrator must remain.');
    }
}
function spThrottleLogin(PDO $pdo,string $username):void {
 $ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');$now=time();$buckets=[[hash('sha256',strtolower($username).'|'.$ip),10],[hash('sha256','ip:'.$ip),100]];
 foreach($buckets as [$key,$limit]){$pdo->prepare('INSERT INTO sp_login_attempts(bucket_key,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=IF(window_start<? ,1,attempts+1),window_start=IF(window_start<? ,VALUES(window_start),window_start)')->execute([$key,$now,$now-900,$now-900]);$q=$pdo->prepare('SELECT attempts FROM sp_login_attempts WHERE bucket_key=?');$q->execute([$key]);if((int)$q->fetchColumn()>$limit)spApiRespond(['ok'=>false,'error'=>'Too many sign-in attempts. Try again in 15 minutes.'],429);}
}
function spSaleTransition(PDO $pdo,int $outlet,int $id,array $old,array $sale): void {
    $before=strtoupper((string)($old['status']??'COMPLETED'));$after=strtoupper((string)($sale['status']??'COMPLETED'));if($before===$after)return;
    if(in_array($before,['VOIDED','REFUNDED','CANCELLED'],true))throw new RuntimeException('Finalized reversal cannot be reopened.');
    $reason=trim((string)($sale['voidReason']??$sale['refundReason']??$sale['reason']??''));
    if(in_array($after,['VOIDED','REFUNDED','CANCELLED'],true)&&$reason==='')throw new InvalidArgumentException('A reversal reason is required.');
    $user=(int)($_SERVER['SP_AUTH_USER_ID']??0);
    $pdo->prepare('INSERT INTO sale_status_history(sale_id,old_status,new_status,reason,created_by) VALUES(?,?,?,?,?)')->execute([$id,$before,$after,$reason?:null,$user]);
    if($after==='REFUNDED'){$pdo->prepare('INSERT INTO sale_refunds(outlet_id,original_sale_id,refund_no,amount,reason,created_by) VALUES(?,?,?,?,?,?)')->execute([$outlet,$id,'REF-'.$id,spMoney($old['total']??0),$reason,$user]);$refund=(int)$pdo->lastInsertId();$q=$pdo->prepare('SELECT * FROM sale_items WHERE sale_id=?');$q->execute([$id]);foreach($q->fetchAll() as $item)$pdo->prepare('INSERT INTO sale_refund_items(refund_id,sale_item_id,product_id,quantity,amount) VALUES(?,?,?,?,?)')->execute([$refund,$item['id'],$item['product_id'],$item['quantity'],$item['line_total']]);}
    if(in_array($after,['VOIDED','CANCELLED'],true))$pdo->prepare('INSERT INTO sale_voids(outlet_id,sale_id,void_reason,voided_by) VALUES(?,?,?,?)')->execute([$outlet,$id,$reason,$user]);
}

function cryptoKey(string $dbName):string {$key=(string)(spApiConfig()['encryption_key']??'');if(strlen($key)<64)throw new RuntimeException('A separate random encryption_key of at least 64 characters is required.');return hash('sha256',$key,true);}

function encryptSecret(string $plain,string $dbName):string {if($plain==='')return'';$iv=random_bytes(12);$tag='';$cipher=openssl_encrypt($plain,'aes-256-gcm',cryptoKey($dbName),OPENSSL_RAW_DATA,$iv,$tag,'SP-Manager:SMTP');if($cipher===false)throw new RuntimeException('Encryption failed.');return'gcm1:'.base64_encode($iv.$tag.$cipher);}

function decryptSecret(string $stored,string $dbName):string {if($stored==='')return'';if(!str_starts_with($stored,'gcm1:'))throw new RuntimeException('Re-enter the SMTP password after upgrading encryption.');$raw=base64_decode(substr($stored,5),true);if($raw===false||strlen($raw)<29)throw new RuntimeException('Invalid encrypted secret.');$plain=openssl_decrypt(substr($raw,28),'aes-256-gcm',cryptoKey($dbName),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),'SP-Manager:SMTP');if($plain===false)throw new RuntimeException('Secret authentication failed.');return$plain;}

/** Existing financial rows remain immutable. Amend notes, receive money or reverse. */
function spReviseSale(PDO $pdo,int $outlet,array $sale):array {
 $id=(int)($sale['dbId']??$sale['saleDbId']??0);$q=$pdo->prepare('SELECT * FROM sales WHERE id=? AND outlet_id=? FOR UPDATE');$q->execute([$id,$outlet]);$old=$q->fetch();if(!$old)throw new RuntimeException('Sale not found in this outlet.');spAssertOpenDay($pdo,$outlet,$old['sale_date']);
 foreach(['subtotal','discount','tax','total'] as $field)if(abs(spMoney($sale[$field]??$old[$field])-(float)$old[$field])>0.005)throw new InvalidArgumentException('Financial sale rows are immutable. Reverse and create a new sale.');
 $q=$pdo->prepare('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id');$q->execute([$id]);$stored=$q->fetchAll();$received=$sale['items']??[];if(count($stored)!==count($received))throw new InvalidArgumentException('Sale items cannot be replaced.');
 foreach($stored as $n=>$item){$it=$received[$n];if((int)($it['productDbId']??$it['productId']??$it['id']??0)!==(int)$item['product_id']||abs((float)($it['qty']??$it['quantity']??0)-(float)$item['quantity'])>0.0005||abs((float)($it['price']??0)-(float)$item['unit_price'])>0.005)throw new InvalidArgumentException('Sale items cannot be replaced.');}
 $status=!empty($sale['voided'])?'VOIDED':(!empty($sale['refunded'])?'REFUNDED':strtoupper((string)($sale['status']??$old['status'])));$sale['status']=$status;
 if(!in_array($status,['COMPLETED','VOIDED','REFUNDED','CANCELLED'],true))throw new InvalidArgumentException('Invalid sale status.');
 $oldStatus=strtoupper($old['status']);if(in_array($oldStatus,['VOIDED','REFUNDED','CANCELLED'],true)&&$status!==$oldStatus)throw new RuntimeException('Reversal cannot be reopened.');
 $q=$pdo->prepare('SELECT * FROM sale_payments WHERE sale_id=? ORDER BY id');$q->execute([$id]);$oldPayments=$q->fetchAll();$payments=$sale['payments']??[];$paid=0.0;$normalized=[];
 foreach($payments as $n=>$pay){$pid=resolvePaymentType($pdo,$outlet,$pay);$q=$pdo->prepare('SELECT * FROM payment_types WHERE id=?');$q->execute([$pid]);$pt=$q->fetch();if(!$pt)throw new InvalidArgumentException('Payment method missing.');$amount=spMoney($pay['amount']??0);$prior=$oldPayments[$n]??null;
  if($prior){if($pid!==(int)$prior['payment_type_id']||abs($amount-(float)$prior['amount'])>0.005)throw new InvalidArgumentException('Recorded payments cannot be altered.');}
  else {if(empty($pt['enabled'])||empty($pt['mark_paid']))throw new InvalidArgumentException('Enabled paid payment method required.');if($amount<=0)throw new InvalidArgumentException('Received payment must be positive.');}
  $paid+=$amount;$normalized[]=[...$pay,'paymentTypeDbId'=>$pid,'payment'=>$pt['payment_name'],'amount'=>$amount];
 }
 if(count($payments)<count($oldPayments))throw new InvalidArgumentException('Recorded payments cannot be removed.');if($paid>(float)$old['total']+0.005)throw new InvalidArgumentException('Payment exceeds outstanding balance.');
 if(in_array($oldStatus,['VOIDED','REFUNDED','CANCELLED'],true)&&count($payments)!==count($oldPayments))throw new RuntimeException('Finalized sale cannot receive payments.');
 if($status!==$oldStatus){spSaleTransition($pdo,$outlet,$id,$old,$sale);if(in_array($status,['VOIDED','REFUNDED','CANCELLED'],true)){foreach($stored as $item)adjustStock($pdo,$outlet,(int)$item['product_id'],(float)$item['quantity'],$old['sale_no'],$id);}}
 foreach(array_slice($normalized,count($oldPayments)) as $pay){$pdo->prepare('INSERT INTO sale_payments(sale_id,payment_type_id,payment_type_name,amount,tendered,change_amount,reference_no,paid_at) VALUES(?,?,?,?,?,?,?,?)')->execute([$id,$pay['paymentTypeDbId'],$pay['payment'],$pay['amount'],$pay['tendered']??$pay['amount'],0,$pay['referenceNo']??null,spDateTime($pay['paidAt']??$pay['date']??null)??gmdate('Y-m-d H:i:s')]);}
 $paymentStatus=$paid+0.005>=(float)$old['total']?'PAID':($paid>0?'PARTIAL':'UNPAID');$notes=(string)($sale['internalNote']??'');if($notes==='')$notes=(string)($sale['note']??$old['notes']??'');
 $pdo->prepare('UPDATE sales SET status=?,payment_status=?,notes=? WHERE id=? AND outlet_id=?')->execute([$status,$paymentStatus,$notes,$id,$outlet]);if((int)$old['customer_id']>0)refreshLoyalty($pdo,$outlet,(int)$old['customer_id']);spAudit($pdo,'SALE_AMEND','sales',$id,$old,['status'=>$status,'payment_status'=>$paymentStatus,'notes'=>$notes]);
 return ['ok'=>true,'api_version'=>'V11','sale_id'=>$id,'sale_no'=>$old['sale_no'],'outlet_id'=>$outlet];
}

function spSetInventory(PDO $pdo,int $outlet,int $product,float $quantity,?float $expected=null):void {
 if(!spHasPermission('manageInventory'))throw new RuntimeException('Inventory permission required.');if(!$pdo->inTransaction())throw new LogicException('Inventory change requires a transaction.');
 $q=$pdo->prepare('SELECT po.stock_qty,COALESCE(po.cost_price,p.cost_price) AS cost,p.is_service FROM product_outlets po JOIN products p ON p.id=po.product_id WHERE po.product_id=? AND po.outlet_id=? FOR UPDATE');$q->execute([$product,$outlet]);$old=$q->fetch();if(!$old)throw new RuntimeException('Outlet assignment required.');
 $before=(float)$old['stock_qty'];if(abs($quantity-$before)<0.0005)return;if($expected!==null&&abs($expected-$before)>0.0005)throw new RuntimeException('Stock changed on another terminal. Refresh before counting.');$delta=round($quantity-$before,3);if(abs($delta)<0.0005)return;
 if(!is_finite($quantity)||abs($quantity)>1000000)throw new InvalidArgumentException('Invalid stock count.');if($quantity<0&&!empty(spOutletSettings($pdo,$outlet)['order']['preventNegativeInventory']))throw new InvalidArgumentException('Negative stock is disabled.');
 $pdo->prepare('UPDATE product_outlets SET stock_qty=? WHERE product_id=? AND outlet_id=?')->execute([$quantity,$product,$outlet]);
 if(empty($old['is_service']))$pdo->prepare('INSERT INTO stock_movements(outlet_id,product_id,movement_type,reference_type,quantity,stock_before,stock_after,unit_cost,notes,created_by) VALUES(?,?,?, ?,?,?,?,?,?,?)')->execute([$outlet,$product,'INVENTORY_COUNT','INVENTORY_COUNT',$delta,$before,$quantity,$old['cost'],'Verified stock count',(int)$_SERVER['SP_AUTH_USER_ID']]);
 spAudit($pdo,'INVENTORY_COUNT','product_outlets',$product,['stock'=>$before],['stock'=>$quantity]);spAdvanceStateRevision($pdo,$outlet,'stockHistory');
}

function spMasterOutletId(PDO $pdo):int {$id=(int)$pdo->query("SELECT id FROM outlets WHERE active=1 ORDER BY (outlet_code='SP01') DESC,id LIMIT 1")->fetchColumn();if(!$id)throw new RuntimeException('Master outlet missing.');return$id;}
function spPromotionPrice(PDO $pdo,array $product,float $qty):float {
 $price=(float)$product['selling_price'];$now=new DateTimeImmutable('now',new DateTimeZone((string)(spApiConfig()['business_timezone']??'Asia/Kuala_Lumpur')));$day=(int)$now->format('w');$date=$now->format('Y-m-d');
 $q=$pdo->prepare('SELECT * FROM promotions WHERE outlet_id=? AND active=1 ORDER BY id');$q->execute([spMasterOutletId($pdo)]);
 foreach($q->fetchAll() as $row){$meta=json_decode((string)$row['data_json'],true);if(!is_array($meta))continue;if(!empty($meta['startDate'])&&$meta['startDate']>$date)continue;if(!empty($meta['endDate'])&&$meta['endDate']<$date)continue;$days=$meta['daysOfWeek']??[];if($days&&!in_array($day,array_map('intval',$days),true))continue;
  foreach(($meta['items']??[]) as $it){if((int)($it['productId']??0)!==(int)$product['id'])continue;if(!empty($it['conditional'])&&$qty<(float)($it['quantity']??0))continue;$value=spMoney($it['value']??0);$price=($it['priceType']??'discount')==='fixed'?$value:max(0,$price-$price*min(100,$value)/100);break;}
 }
 return round($price,2);
}
