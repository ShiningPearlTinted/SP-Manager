<?php
declare(strict_types=1);

final class BookingError extends RuntimeException {
 public function __construct(string $message,public readonly int $status=400){parent::__construct($message);}
}
function bookingRequire(string $permission):void{if(!spHasPermission($permission))throw new BookingError('Booking permission required.',403);}
function bookingText(mixed $value,string $label,int $max=150,bool $required=false):string{
 if(!is_scalar($value)&&$value!==null)throw new BookingError($label.' must be text.');
 $text=trim((string)($value??''));if(($required&&$text==='')||strlen($text)>$max||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$text))throw new BookingError($label.' is missing, invalid or too long.');return $text;
}
function bookingId(mixed $value,string $label='Identifier'):int{if(!is_scalar($value)||!preg_match('/^[1-9][0-9]{0,17}$/D',(string)$value))throw new BookingError($label.' is invalid.');return (int)$value;}
function bookingBool(mixed $v):bool{if(!in_array($v,[true,false,0,1,'0','1'],true))throw new BookingError('Invalid checkbox value.');return in_array($v,[true,1,'1'],true);}
function bookingDate(mixed $value):DateTimeImmutable{
 $raw=bookingText($value,'Date',10,true);$date=DateTimeImmutable::createFromFormat('!Y-m-d',$raw,new DateTimeZone('Asia/Kuala_Lumpur'));
 if(!$date||$date->format('Y-m-d')!==$raw)throw new BookingError('Enter a valid date.');return $date;
}
function bookingNow():DateTimeImmutable{return new DateTimeImmutable('now',new DateTimeZone('Asia/Kuala_Lumpur'));}
function bookingDefaults():array{return ['enabled'=>true,'open'=>'10:00','close'=>'22:00','capacity'=>1,'days'=>[1,2,3,4,5,6,7],'holidays'=>[],'notice_minutes'=>60,'horizon_days'=>90];}
function bookingSettings(PDO $pdo,int $outlet):array{
 $q=$pdo->prepare('SELECT settings_json,version FROM sp_booking_settings WHERE outlet_id=?');$q->execute([$outlet]);$row=$q->fetch();$saved=$row?json_decode($row['settings_json'],true):[];return ['values'=>array_replace(bookingDefaults(),is_array($saved)?$saved:[]),'version'=>$row?(int)$row['version']:0];
}
function bookingValidateSettings(array $v):array{
 $d=bookingDefaults();foreach(['enabled'] as $key)$d[$key]=bookingBool($v[$key]??false);
 foreach(['open','close'] as $key){$d[$key]=bookingText($v[$key]??'',$key,5,true);if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$d[$key]))throw new BookingError('Use a valid opening and closing time.');}
 if($d['open']>=$d['close'])throw new BookingError('Closing time must be after opening time.');
 foreach(['capacity'=>[1,20],'notice_minutes'=>[0,1440],'horizon_days'=>[1,365]] as $key=>[$min,$max]){if(filter_var($v[$key]??null,FILTER_VALIDATE_INT)===false||(int)$v[$key]<$min||(int)$v[$key]>$max)throw new BookingError('Invalid '.$key.'.');$d[$key]=(int)$v[$key];}
 if(!is_array($v['days']??null)||!is_array($v['holidays']??null))throw new BookingError('Invalid operating days or closed dates.');
 $d['days']=[];foreach($v['days'] as $day){if(!in_array($day,[1,2,3,4,5,6,7,'1','2','3','4','5','6','7'],true))throw new BookingError('Invalid operating day.');$d['days'][]=(int)$day;}$d['days']=array_values(array_unique($d['days']));if($d['enabled']&&!$d['days'])throw new BookingError('Choose at least one operating day.');
 if(count($v['holidays'])>366)throw new BookingError('Too many closed dates.');$d['holidays']=array_values(array_unique(array_map(fn($day)=>bookingDate($day)->format('Y-m-d'),$v['holidays'])));return $d;
}
function bookingMoney(mixed $value):?string{
 if($value===null||$value==='')return null;
 if(!is_scalar($value)||!preg_match('/^\d{1,9}(?:\.\d{1,2})?$/D',(string)$value))throw new BookingError('Enter a valid non-negative price.');return number_format((float)$value,2,'.','');
}
function bookingService(PDO $pdo,int $outlet,int $id):array{
 $q=$pdo->prepare('SELECT * FROM sp_booking_services WHERE id=? AND outlet_id=?');$q->execute([$id,$outlet]);$s=$q->fetch();if(!$s)throw new BookingError('Service not found in this outlet.',404);return $s;
}
function bookingStatuses():array{return ['pending','confirmed','in_progress','completed','cancelled','no_show'];}
function bookingConsumesCapacity(string $status):bool{return in_array($status,['pending','confirmed','in_progress'],true);}
function bookingPeak(array $rows,DateTimeImmutable $start,DateTimeImmutable $end):int{
 $events=[[$start->getTimestamp(),1],[$end->getTimestamp(),-1]];
 foreach($rows as $r){$a=(new DateTimeImmutable($r['starts_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp();$b=(new DateTimeImmutable($r['ends_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp();if($a<$end->getTimestamp()&&$b>$start->getTimestamp()){$events[]=[max($a,$start->getTimestamp()),1];$events[]=[min($b,$end->getTimestamp()),-1];}}
 usort($events,fn($a,$b)=>$a[0]===$b[0]?$a[1]<=>$b[1]:$a[0]<=>$b[0]);$count=0;$max=0;foreach($events as $event){$count+=$event[1];$max=max($max,$count);}return $max;
}
function bookingOverlaps(PDO $pdo,int $outlet,DateTimeImmutable $start,DateTimeImmutable $end,int $exclude=0):array{
 $q=$pdo->prepare("SELECT starts_at,ends_at FROM sp_bookings WHERE outlet_id=? AND status IN ('pending','confirmed','in_progress') AND starts_at<? AND ends_at>? AND id<>?");$q->execute([$outlet,$end->format('Y-m-d H:i:s'),$start->format('Y-m-d H:i:s'),$exclude]);return $q->fetchAll();
}
function bookingWindow(array $settings,DateTimeImmutable $day,int $minutes):?array{
 $today=bookingNow()->setTime(0,0);
 if(!$settings['enabled']||$day<$today||$day>$today->modify('+'.$settings['horizon_days'].' days')||!in_array((int)$day->format('N'),$settings['days'],true)||in_array($day->format('Y-m-d'),$settings['holidays'],true))return null;
 $open=new DateTimeImmutable($day->format('Y-m-d').' '.$settings['open'],new DateTimeZone('Asia/Kuala_Lumpur'));$close=new DateTimeImmutable($day->format('Y-m-d').' '.$settings['close'],new DateTimeZone('Asia/Kuala_Lumpur'));
 return ['open'=>$open,'close'=>$close,'duration'=>$minutes];
}
function bookingSlots(PDO $pdo,int $outlet,int $service,string $date,int $exclude=0):array{
 $s=bookingService($pdo,$outlet,$service);$duration=(int)$s['duration_minutes'];
 if($exclude){$old=bookingRead($pdo,$outlet,$exclude);if((int)$old['service_id']===$service)$duration=(int)(((new DateTimeImmutable($old['ends_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp()-(new DateTimeImmutable($old['starts_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp())/60);}
 if(!(int)$s['active']&&!$exclude)return []; $settings=bookingSettings($pdo,$outlet)['values'];$day=bookingDate($date);$window=bookingWindow($settings,$day,$duration);if(!$window)return [];
 $rows=bookingOverlaps($pdo,$outlet,$window['open'],$window['close'],$exclude);$slots=[];$earliest=bookingNow()->modify('+'.$settings['notice_minutes'].' minutes');
 for($t=$window['open'];($end=$t->modify('+'.$window['duration'].' minutes'))<=$window['close'];$t=$t->modify('+30 minutes'))if($t>=$earliest&&bookingPeak($rows,$t,$end)<=(int)$settings['capacity'])$slots[]=$t->format('H:i');return $slots;
}
function bookingRead(PDO $pdo,int $outlet,int $id):array{
 $q=$pdo->prepare('SELECT * FROM sp_bookings WHERE id=? AND outlet_id=?');$q->execute([$id,$outlet]);$r=$q->fetch();if(!$r)throw new BookingError('Booking not found in this outlet.',404);return $r;
}
function bookingEvent(PDO $pdo,int $outlet,int $id,string $type,string $message):void{
 $q=$pdo->prepare('INSERT INTO sp_booking_events(outlet_id,booking_id,actor_id,event_type,message,created_at) VALUES(?,?,?,?,?,?)');$q->execute([$outlet,$id,(int)($_SERVER['SP_AUTH_USER_ID']??0)?:null,$type,$message,bookingNow()->format('Y-m-d H:i:s')]);
}
function bookingSave(PDO $pdo,int $outlet,array $b):array{
 $id=empty($b['id'])?0:bookingId($b['id']);$old=$id?bookingRead($pdo,$outlet,$id):null;
 if($old&&(int)($b['version']??-1)!==(int)$old['version'])throw new BookingError('This appointment changed. Refresh before saving.',409);
 $service=bookingService($pdo,$outlet,bookingId($b['service_id']??null,'Service'));if(!(int)$service['active']&&(!$old||(int)$old['service_id']!==(int)$service['id']))throw new BookingError('Choose an active service.');
 $date=bookingDate($b['date']??null);$time=bookingText($b['time']??null,'Time',5,true);if(!preg_match('/^(?:[01][0-9]|2[0-3]):(?:00|30)$/D',$time))throw new BookingError('Choose a time on a 30-minute boundary.');
 $start=new DateTimeImmutable($date->format('Y-m-d').' '.$time,new DateTimeZone('Asia/Kuala_Lumpur'));$sameService=$old&&(int)$old['service_id']===(int)$service['id'];$duration=$sameService?(int)(((new DateTimeImmutable($old['ends_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp()-(new DateTimeImmutable($old['starts_at'],new DateTimeZone('Asia/Kuala_Lumpur')))->getTimestamp())/60):(int)$service['duration_minutes'];$end=$start->modify('+'.$duration.' minutes');
 $status=bookingText($b['status']??'pending','Status',24,true);if(!in_array($status,bookingStatuses(),true))throw new BookingError('Invalid status.');
 $changed=!$old||$old['starts_at']!==$start->format('Y-m-d H:i:s')||!$sameService;
 if(!$old&&!in_array($status,['pending','confirmed'],true))throw new BookingError('New appointments must be pending or confirmed.');
 if(bookingConsumesCapacity($status)){
  $settings=bookingSettings($pdo,$outlet)['values'];$window=bookingWindow($settings,$date,$duration);
  $reactivating=$old&&!bookingConsumesCapacity($old['status']);
  if(($changed||$reactivating)&&(!$window||$start<$window['open']||$end>$window['close']||$start<bookingNow()->modify('+'.$settings['notice_minutes'].' minutes')))throw new BookingError('This time is outside the available operating schedule.');
  if(bookingPeak(bookingOverlaps($pdo,$outlet,$start,$end,$id),$start,$end)>(int)$settings['capacity'])throw new BookingError('This slot is full. Choose another time.',409);
 }
 $name=bookingText($b['customer_name']??null,'Customer name',150,true);$phone=bookingText($b['phone']??null,'Phone',32,true);$phone=preg_replace('/[\s()+-]/','',$phone);if(!preg_match('/^[0-9]{9,15}$/D',$phone))throw new BookingError('Enter a valid phone number.');$email=bookingText($b['email']??'','Email',190);if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))throw new BookingError('Enter a valid email.');
 $car=bookingText($b['car_model']??null,'Car model',150,true);$plate=strtoupper(bookingText($b['plate']??null,'Number plate',32,true));$notes=bookingText($b['notes']??'','Notes',2000);$stamp=bookingNow()->format('Y-m-d H:i:s');$user=(int)($_SERVER['SP_AUTH_USER_ID']??0)?:null;
 // Retain the original service and price snapshot on later edits to that service.
 $snapshot=$sameService?$old:['service_name'=>$service['name'],'service_category'=>$service['category'],'description'=>$service['description'],'price'=>$service['price']];
 if($id){$q=$pdo->prepare('UPDATE sp_bookings SET service_id=?,service_name=?,service_category=?,description=?,price=?,starts_at=?,ends_at=?,status=?,customer_name=?,phone=?,email=?,car_model=?,plate=?,notes=?,version=version+1,updated_by=?,updated_at=? WHERE id=? AND outlet_id=? AND version=?');$q->execute([$service['id'],$snapshot['service_name'],$snapshot['service_category'],$snapshot['description'],$snapshot['price'],$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s'),$status,$name,$phone,$email,$car,$plate,$notes,$user,$stamp,$id,$outlet,$old['version']]);if($q->rowCount()!==1)throw new BookingError('This appointment changed. Refresh before saving.',409);}
 else{$ref='SPB-'.bookingNow()->format('ymd').'-'.strtoupper(bin2hex(random_bytes(4)));$q=$pdo->prepare('INSERT INTO sp_bookings(outlet_id,reference,service_id,service_name,service_category,description,price,starts_at,ends_at,status,customer_name,phone,email,car_model,plate,notes,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');$q->execute([$outlet,$ref,$service['id'],$snapshot['service_name'],$snapshot['service_category'],$snapshot['description'],$snapshot['price'],$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s'),$status,$name,$phone,$email,$car,$plate,$notes,$user,$user,$stamp,$stamp]);$id=(int)$pdo->lastInsertId();}
 $row=bookingRead($pdo,$outlet,$id);bookingEvent($pdo,$outlet,$id,$old?($changed?'rescheduled':'updated'):'created',($old?'Updated':'Created').' '.$row['reference'].' · '.$status.' · '.$start->format('d M Y H:i'));spAudit($pdo,$old?'booking.update':'booking.create','booking',$id,$old,$row);return $row;
}
