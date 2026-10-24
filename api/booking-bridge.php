<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/booking-lib.php';
require_once __DIR__.'/booking-bridge-lib.php';
header('Cache-Control: no-store');
$pdo=null;$locks=[];$response=[];$code=200;
try{
 $proof=$GLOBALS['spBookingBridge']??null;if(!is_array($proof))throw new BookingError('Bridge authentication required.',401);
 $body=$proof['body'];$site=$proof['site_hash'];$action=bookingText($body['action']??null,'Action',24,true);if(!in_array($action,['ping','sync','slots','create','import','statuses','email-settings'],true))throw new BookingError('Unsupported website bridge action.',404);
 $pdo=spApiDatabase();foreach(['sp_bookings','sp_booking_services','sp_booking_settings','sp_booking_events','sp_booking_website_services','sp_booking_bridge_calls'] as $table)if(!spTableExists($pdo,$table))throw new BookingError('Apply booking-v1.sql and booking-website-bridge.sql before connecting the website.',503);
 if($action==='ping'){$rows=$pdo->query('SELECT id,outlet_code,outlet_name FROM outlets WHERE active=1 ORDER BY outlet_name')->fetchAll();$response=['ok'=>true,'protocol'=>1,'outlets'=>$rows];}
 elseif($action==='email-settings'){$outlet=bookingBridgeOutlet($pdo,$body['outlet_id']??null);$response=['ok'=>true,...bookingEmailConfig($pdo,$outlet)];}
 elseif($action==='slots'){$outlet=bookingBridgeOutlet($pdo,$body['outlet_id']??null);$service=bookingBridgeMappedService($pdo,$site,$outlet,$body['package_id']??null);$response=['ok'=>true,'slots'=>bookingSlots($pdo,$outlet,$service,bookingDate($body['date']??null)->format('Y-m-d')),'duration_minutes'=>(int)bookingService($pdo,$outlet,$service)['duration_minutes']];}
 elseif($action==='statuses'){
  $ids=$body['ids']??[];if(!is_array($ids)||count($ids)>100)throw new BookingError('Invalid website booking batch.');$ids=array_values(array_unique(array_map(fn($id)=>bookingId($id),$ids)));
  $rows=[];if($ids){$q=$pdo->prepare('SELECT b.*,c.response_json AS bridge_response FROM sp_bookings b JOIN sp_booking_bridge_calls c ON c.booking_id=b.id WHERE c.site_hash=? AND b.id IN ('.implode(',',array_fill(0,count($ids),'?')).')');$q->execute([$site,...$ids]);$rows=$q->fetchAll();}
  elseif(($body['recent']??false)===true){$q=$pdo->prepare('SELECT b.*,c.response_json AS bridge_response FROM sp_bookings b JOIN sp_booking_bridge_calls c ON c.booking_id=b.id WHERE c.site_hash=? AND b.ends_at>=? ORDER BY b.id DESC LIMIT 100');$q->execute([$site,bookingNow()->modify('-7 days')->format('Y-m-d H:i:s')]);$rows=$q->fetchAll();}
  foreach($rows as &$row){$cached=json_decode($row['bridge_response'],true);$row['_website']=$cached['website']??[];unset($row['bridge_response']);}unset($row);$deleted=[];if($ids){$q=$pdo->prepare('SELECT response_json FROM sp_booking_bridge_calls WHERE site_hash=? AND booking_id IS NULL');$q->execute([$site]);foreach($q->fetchAll() as $marker){$marker=json_decode($marker['response_json'],true);$gone=(int)($marker['deleted_booking_id']??0);if($gone&&in_array($gone,$ids,true))$deleted[]=$gone;}}
  $response=['ok'=>true,'bookings'=>$rows,'deleted_ids'=>array_values(array_unique($deleted))];
 }else{
  $outlets=$action==='sync'?($body['outlets']??[]):[$body['outlet_id']??null];if(!is_array($outlets)||!$outlets||count($outlets)>10)throw new BookingError('Invalid outlet mapping.');$outlets=array_values(array_unique(array_map(fn($id)=>bookingBridgeOutlet($pdo,$id),$outlets)));sort($outlets);
  // Use exactly the outlet writer lock used by the existing authenticated app.
  $database=(string)$pdo->query('SELECT DATABASE()')->fetchColumn();foreach($outlets as $id){$lock='spm:'.substr(hash('sha256',$database.'|outlet:'.$id),0,40);$q=$pdo->prepare('SELECT GET_LOCK(?,10)');$q->execute([$lock]);if((int)$q->fetchColumn()!==1)throw new BookingError('Outlet is busy. Retry the same request.',409);$locks[]=$lock;}
  $pdo->beginTransaction();foreach($outlets as $id)spLockOutlet($pdo,$id);
  $key=hash('sha256',$site.'|'.$proof['request_id']);$q=$pdo->prepare('SELECT payload_hash,response_json FROM sp_booking_bridge_calls WHERE call_key=?');$q->execute([$key]);$prior=$q->fetch();
  if($prior){if(!hash_equals($prior['payload_hash'],$proof['payload_hash']))throw new BookingError('Request id was reused with different booking data.',409);$response=json_decode($prior['response_json'],true,512,JSON_THROW_ON_ERROR);if(!empty($response['deleted_booking_id']))throw new BookingError('This booking was permanently deleted. Start a new booking request.',409);}
  else{
   $bookingId=null;
   if($action==='sync'){$packages=$body['packages']??null;if(!is_array($packages)||count($packages)>100)throw new BookingError('Invalid website package batch.');$count=0;foreach($outlets as $outlet)foreach($packages as $package){if(!is_array($package))throw new BookingError('Invalid package.');bookingBridgeService($pdo,$site,$outlet,$package);$count++;}$response=['ok'=>true,'synchronized'=>$count];}
   else{
    $outlet=$outlets[0];$_SERVER['SP_AUTH_OUTLET_ID']=(string)$outlet;$_SERVER['SP_AUTH_USER_ID']='0';$package=$body['package']??null;$b=$body['booking']??null;if(!is_array($package)||!is_array($b))throw new BookingError('Missing package or booking.');$service=bookingBridgeService($pdo,$site,$outlet,$package);
    if($action==='import')$row=bookingBridgeImport($pdo,$outlet,$service,$b);
    else{$input=array_intersect_key($b,array_flip(['date','time','customer_name','phone','email','car_model','plate','notes']));$input['service_id']=$service['id'];$input['status']='pending';$row=bookingSave($pdo,$outlet,$input);$pdo->prepare("UPDATE sp_bookings SET source='website' WHERE id=? AND outlet_id=?")->execute([$row['id'],$outlet]);$row['source']='website';}
    $request=bookingText($b['request_key']??null,'Website request id',64,true);if(!preg_match('/^[A-Za-z0-9-]{20,64}$/D',$request))throw new BookingError('Invalid website request id.');
    $branch=bookingText($body['branch']??null,'Website branch',30,true);if(!preg_match('/^[a-z0-9-]+$/D',$branch))throw new BookingError('Invalid website branch.');
    $bookingId=(int)$row['id'];$response=['ok'=>true,'booking'=>$row,'website'=>['package_id'=>(int)$package['id'],'request_key'=>$request,'branch'=>$branch]];
   }
   $pdo->prepare('INSERT INTO sp_booking_bridge_calls(call_key,site_hash,payload_hash,action_name,booking_id,response_json,created_at) VALUES(?,?,?,?,?,?,?)')->execute([$key,$site,$proof['payload_hash'],$action,$bookingId,json_encode($response,JSON_THROW_ON_ERROR),bookingNow()->format('Y-m-d H:i:s')]);
  }$pdo->commit();
 }
}catch(BookingError $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();$response=['ok'=>false,'error'=>$e->getMessage()];$code=$e->status;}
catch(Throwable $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();error_log('SP booking bridge: '.$e->getMessage());$response=['ok'=>false,'error'=>'Website booking could not be completed. Check the bridge migration/configuration.'];$code=500;}
finally{if($pdo instanceof PDO)foreach(array_reverse($locks) as $lock)try{$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);}catch(Throwable $ignored){}}
spApiRespond($response,$code);
