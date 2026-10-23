<?php
declare(strict_types=1);

/** Dedicated HMAC boundary. Does not use or expose an app user session token. */
function spBookingBridgeProof(string $raw,string $stamp,string $request,string $signature,string $secret,string $site,int $now):array{
 if(strlen($secret)<64||str_starts_with($secret,'CHANGE_ME'))throw new RuntimeException('Booking bridge key is not configured.');
 if(strlen($raw)>262144||!preg_match('/^[0-9]{10}$/D',$stamp)||abs($now-(int)$stamp)>300||!preg_match('/^[A-Za-z0-9_.:-]{20,100}$/D',$request)||!preg_match('/^[a-f0-9]{64}$/D',$signature))throw new InvalidArgumentException('Invalid or expired bridge signature.');
 $expected=hash_hmac('sha256',$stamp."\n".$request."\n".$raw,$secret);if(!hash_equals($expected,$signature))throw new InvalidArgumentException('Invalid or expired bridge signature.');
 $body=json_decode($raw,true);if(!is_array($body)||($body['site']??'')!==$site||!str_starts_with($site,'https://'))throw new InvalidArgumentException('Website identity does not match this bridge.');
 return ['body'=>$body,'site_hash'=>hash('sha256',$site),'request_id'=>$request,'payload_hash'=>hash('sha256',$raw)];
}
function spBookingBridgeGuard():void{
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')spApiRespond(['ok'=>false,'error'=>'Signed server-to-server POST required.'],401);
 try{
  $config=spApiConfig();$keyFile=__DIR__.'/booking-bridge-key.php';$local=is_file($keyFile)?require $keyFile:[];
  $secret=(string)($config['booking_bridge_secret']??(getenv('SP_MANAGER_BOOKING_BRIDGE_SECRET')?:($local['secret']??'')));
  $site=rtrim((string)($config['booking_bridge_site']??$local['site']??'https://shiningpearltinted.com'),'/');
  $GLOBALS['spBookingBridge']=spBookingBridgeProof(file_get_contents('php://input')?:'',(string)($_SERVER['HTTP_X_SP_BOOKING_TIMESTAMP']??''),(string)($_SERVER['HTTP_X_SP_BOOKING_REQUEST']??''),(string)($_SERVER['HTTP_X_SP_BOOKING_SIGNATURE']??''),$secret,$site,time());
 }catch(InvalidArgumentException $e){spApiRespond(['ok'=>false,'error'=>$e->getMessage()],401);}
 catch(Throwable $e){error_log('Booking bridge configuration error');spApiRespond(['ok'=>false,'error'=>'Booking bridge server configuration is incomplete.'],503);}
}
