<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/booking-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$pdo=null;
try{
 $method=strtoupper($_SERVER['REQUEST_METHOD']??'GET');$action=strtolower(trim((string)($_GET['action']??'')));
 $read=['config','list','slots','events','email-settings'];$write=['save','status','save-service','save-settings','save-email-settings'];
 if(!in_array($action,[...$read,...$write],true))throw new BookingError('Unknown booking action.',404);
 if(($method==='GET'&&!in_array($action,$read,true))||($method==='POST'&&!in_array($action,$write,true))||!in_array($method,['GET','POST'],true))throw new BookingError('Method not allowed.',405);
 $permission=in_array($action,['save-service','save-settings','email-settings','save-email-settings'],true)?'manageBookingSettings':($method==='POST'?'manageBookings':'viewBookings');bookingRequire($permission);
 $pdo=spApiDatabase();$outlet=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);if($outlet<=0)throw new BookingError('An assigned outlet is required.',403);
 foreach(['sp_bookings','sp_booking_services','sp_booking_settings','sp_booking_events'] as $table)if(!spTableExists($pdo,$table))throw new BookingError('Booking migration is required. Apply database/migrations/booking-v1.sql before using this module.',503);
 if($method==='GET'){
  if($action==='email-settings')spApiRespond(['ok'=>true,...bookingEmailConfig($pdo,$outlet)],200);
  if($action==='config'){
   $q=$pdo->prepare('SELECT * FROM sp_booking_services WHERE outlet_id=? ORDER BY active DESC,category,name');$q->execute([$outlet]);$services=$q->fetchAll();
   $q=$pdo->prepare('SELECT DISTINCT o.id,o.outlet_code,o.outlet_name FROM outlets o LEFT JOIN user_outlets uo ON uo.outlet_id=o.id AND uo.user_id=? AND uo.active=1 WHERE o.active=1 AND (uo.user_id IS NOT NULL OR o.id=?) ORDER BY o.outlet_name');$q->execute([(int)$_SERVER['SP_AUTH_USER_ID'],(int)($GLOBALS['spActor']['outlet_id']??0)]);$outlets=$q->fetchAll();
   spApiRespond(['ok'=>true,'services'=>$services,'settings'=>bookingSettings($pdo,$outlet),'outlets'=>$outlets,'outlet_id'=>$outlet,'today'=>bookingNow()->format('Y-m-d'),'timezone'=>'Asia/Kuala_Lumpur','can_manage'=>spHasPermission('manageBookings'),'can_settings'=>spHasPermission('manageBookingSettings')],200);
  }
  if($action==='slots'){
   $service=bookingId($_GET['service_id']??null,'Service');$exclude=empty($_GET['exclude_id'])?0:bookingId($_GET['exclude_id']);if($exclude)bookingRead($pdo,$outlet,$exclude);
   spApiRespond(['ok'=>true,'slots'=>bookingSlots($pdo,$outlet,$service,bookingDate($_GET['date']??null)->format('Y-m-d'),$exclude)],200);
  }
  if($action==='events'){
   $q=$pdo->prepare('SELECT e.id,e.booking_id,e.event_type,e.message,e.created_at,b.reference FROM sp_booking_events e JOIN sp_bookings b ON b.id=e.booking_id AND b.outlet_id=e.outlet_id WHERE e.outlet_id=? ORDER BY e.id DESC LIMIT 100');$q->execute([$outlet]);spApiRespond(['ok'=>true,'events'=>$q->fetchAll()],200);
  }
  if($action==='list'){
   $from=bookingDate($_GET['from']??bookingNow()->format('Y-m-01'));$to=bookingDate($_GET['to']??bookingNow()->format('Y-m-t'));if($to<$from||$to>$from->modify('+62 days'))throw new BookingError('Choose a date range of at most 63 days.');
   $where='outlet_id=? AND starts_at>=? AND starts_at<?';$params=[$outlet,$from->format('Y-m-d H:i:s'),$to->modify('+1 day')->format('Y-m-d H:i:s')];
   $search=bookingText($_GET['q']??'','Search',150);if($search!==''){$where.=' AND (customer_name LIKE ? OR phone LIKE ? OR plate LIKE ? OR reference LIKE ?)';$like='%'.strtr($search,['!'=>'!!','%'=>'!%','_'=>'!_']).'%';$where=str_replace(' LIKE ?',' LIKE ? ESCAPE \'!\'',$where);$params=[...$params,$like,$like,$like,$like];}
   $status=bookingText($_GET['status']??'','Status',24);if($status!==''){if(!in_array($status,bookingStatuses(),true))throw new BookingError('Invalid status.');$where.=' AND status=?';$params[]=$status;}
   $q=$pdo->prepare('SELECT COUNT(*) FROM sp_bookings WHERE '.$where);$q->execute($params);$total=(int)$q->fetchColumn();
   $page=max(1,min(10000,(int)($_GET['page']??1)));$limit=max(1,min(500,(int)($_GET['limit']??50)));$q=$pdo->prepare('SELECT * FROM sp_bookings WHERE '.$where.' ORDER BY starts_at,id LIMIT '.$limit.' OFFSET '.(($page-1)*$limit));$q->execute($params);
   spApiRespond(['ok'=>true,'bookings'=>$q->fetchAll(),'total'=>$total,'page'=>$page,'limit'=>$limit],200);
  }
 }
 $body=spReadRequestBody();$pdo->beginTransaction();spLockOutlet($pdo,$outlet);
 $key=spRequestKey($body,'booking:'.$action);$replay=spRequestReplay($pdo,$key,$body);if($replay!==null){$pdo->commit();spApiRespond($replay,200);}
 if($action==='save')$response=['ok'=>true,'booking'=>bookingSave($pdo,$outlet,$body)];
 elseif($action==='status'){
  $old=bookingRead($pdo,$outlet,bookingId($body['id']??null));if((int)($body['version']??-1)!==(int)$old['version'])throw new BookingError('This appointment changed. Refresh before updating.',409);
  $status=bookingText($body['status']??null,'Status',24,true);if(!in_array($status,bookingStatuses(),true))throw new BookingError('Invalid status.');
  if($status!==$old['status']){
   if(bookingConsumesCapacity($status)){$start=new DateTimeImmutable($old['starts_at'],new DateTimeZone('Asia/Kuala_Lumpur'));$end=new DateTimeImmutable($old['ends_at'],new DateTimeZone('Asia/Kuala_Lumpur'));$s=bookingSettings($pdo,$outlet)['values'];if(!bookingConsumesCapacity($old['status'])&&$start<bookingNow())throw new BookingError('A past cancelled/completed appointment cannot be reactivated.');if(bookingPeak(bookingOverlaps($pdo,$outlet,$start,$end,(int)$old['id']),$start,$end)>(int)$s['capacity'])throw new BookingError('This time is full.',409);}
   $q=$pdo->prepare('UPDATE sp_bookings SET status=?,version=version+1,updated_by=?,updated_at=? WHERE id=? AND outlet_id=? AND version=?');$q->execute([$status,(int)$_SERVER['SP_AUTH_USER_ID'],bookingNow()->format('Y-m-d H:i:s'),$old['id'],$outlet,$old['version']]);if($q->rowCount()!==1)throw new BookingError('This appointment changed. Refresh before updating.',409);
   bookingEvent($pdo,$outlet,(int)$old['id'],'status','Status changed from '.$old['status'].' to '.$status);spAudit($pdo,'booking.status','booking',(int)$old['id'],['status'=>$old['status']],['status'=>$status]);
  }$response=['ok'=>true,'booking'=>bookingRead($pdo,$outlet,(int)$old['id'])];
 }
 elseif($action==='save-service'){
  $id=empty($body['id'])?0:bookingId($body['id']);$old=$id?bookingService($pdo,$outlet,$id):null;if($old&&(int)($body['version']??-1)!==(int)$old['version'])throw new BookingError('This service changed. Refresh before saving.',409);
  $name=bookingText($body['name']??null,'Service name',150,true);$category=bookingText($body['category']??null,'Category',24,true);if(!in_array($category,['tint','coating','ppf','wrapping','other'],true))throw new BookingError('Invalid category.');$description=bookingText($body['description']??'','Description',500);$duration=filter_var($body['duration_minutes']??null,FILTER_VALIDATE_INT);if($duration===false||$duration<30||$duration>720||$duration%30!==0)throw new BookingError('Duration must be 30–720 minutes in steps of 30.');$price=bookingMoney($body['price']??null);$active=bookingBool($body['active']??true)?1:0;$stamp=bookingNow()->format('Y-m-d H:i:s');
  if($id){$q=$pdo->prepare('UPDATE sp_booking_services SET name=?,category=?,description=?,duration_minutes=?,price=?,active=?,version=version+1,updated_at=? WHERE id=? AND outlet_id=? AND version=?');$q->execute([$name,$category,$description,$duration,$price,$active,$stamp,$id,$outlet,$old['version']]);if($q->rowCount()!==1)throw new BookingError('This service changed. Refresh before saving.',409);}
  else{$q=$pdo->prepare('INSERT INTO sp_booking_services(outlet_id,name,category,description,duration_minutes,price,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)');$q->execute([$outlet,$name,$category,$description,$duration,$price,$active,$stamp,$stamp]);$id=(int)$pdo->lastInsertId();}
  $saved=bookingService($pdo,$outlet,$id);spAudit($pdo,'booking.service','booking_service',$id,$old,$saved);$response=['ok'=>true,'service'=>$saved];
 }
 elseif($action==='save-email-settings'){
  $old=bookingSettings($pdo,$outlet);if((int)($body['version']??-1)!==$old['version'])throw new BookingError('Settings changed. Reload before saving.',409);$values=$old['values'];$values['email_templates']=bookingEmailValidate((array)($body['templates']??[]));$json=json_encode($values,JSON_THROW_ON_ERROR);$stamp=bookingNow()->format('Y-m-d H:i:s');
  if($old['version']===0)$pdo->prepare('INSERT INTO sp_booking_settings(outlet_id,settings_json,updated_at) VALUES(?,?,?)')->execute([$outlet,$json,$stamp]);
  else $pdo->prepare('UPDATE sp_booking_settings SET settings_json=?,version=version+1,updated_at=? WHERE outlet_id=?')->execute([$json,$stamp,$outlet]);
  spAudit($pdo,'booking.email_settings','booking_settings',$outlet,null,['updated'=>true]);$response=['ok'=>true,...bookingEmailConfig($pdo,$outlet)];
 }
 elseif($action==='save-settings'){
  $old=bookingSettings($pdo,$outlet);if((int)($body['version']??-1)!==$old['version'])throw new BookingError('Schedule changed. Refresh before saving.',409);$settings=array_replace($old['values'],bookingValidateSettings((array)($body['settings']??[])));$json=json_encode($settings,JSON_THROW_ON_ERROR);$stamp=bookingNow()->format('Y-m-d H:i:s');
  if($old['version']===0)$pdo->prepare('INSERT INTO sp_booking_settings(outlet_id,settings_json,updated_at) VALUES(?,?,?)')->execute([$outlet,$json,$stamp]);
  else{$q=$pdo->prepare('UPDATE sp_booking_settings SET settings_json=?,version=version+1,updated_at=? WHERE outlet_id=? AND version=?');$q->execute([$json,$stamp,$outlet,$old['version']]);if($q->rowCount()!==1)throw new BookingError('Schedule changed. Refresh before saving.',409);}
  spAudit($pdo,'booking.settings','booking_settings',$outlet,$old['values'],$settings);$response=['ok'=>true,'settings'=>bookingSettings($pdo,$outlet)];
 }
 else throw new BookingError('Unknown booking action.');
 spRequestComplete($pdo,$key,$response);$pdo->commit();spApiRespond($response,200);
}catch(BookingError $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();spApiRespond(['ok'=>false,'error'=>$e->getMessage()],$e->status);
}catch(Throwable $e){if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();error_log('SP Booking: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Booking could not be completed. Check the migration and API log, then retry the same request.'],500);}
