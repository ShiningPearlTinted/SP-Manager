<?php
declare(strict_types=1);
// Public outlet QR registration. There is no session: the signed link names the outlet.
// A match never changes the customer record, because anyone can reach this page.
require_once __DIR__.'/security.php';

function registerFail(string $message,int $status=400): never {
    spApiRespond(['ok'=>false,'error'=>$message],$status);
}
function registerText(mixed $value,int $max): string {
    if(!is_scalar($value)&&$value!==null)registerFail('Please check the details you entered.');
    $text=trim(preg_replace('/\s+/u',' ',(string)$value)??'');
    if(mb_strlen($text)>$max||preg_match('/[\x00-\x1F\x7F]/',$text))registerFail('Please check the details you entered.');
    return $text;
}
function registerThrottle(PDO $pdo,int $outlet): void {
    $key=hash('sha256','customer-register|'.$outlet.'|'.(string)($_SERVER['REMOTE_ADDR']??'unknown'));$now=time();$limit=20;
    $pdo->prepare('INSERT INTO sp_login_attempts(bucket_key,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,VALUES(window_start),window_start)')->execute([$key,$now,$now-900,$now-900]);
    $q=$pdo->prepare('SELECT attempts FROM sp_login_attempts WHERE bucket_key=?');$q->execute([$key]);
    if((int)$q->fetchColumn()>$limit)registerFail('Too many registrations from this connection. Please try again in 15 minutes.',429);
}
function registerColumns(PDO $pdo): array {
    $q=$pdo->query("SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='customers'");
    return array_flip(array_map('strtolower',$q->fetchAll(PDO::FETCH_COLUMN)));
}
function registerSubmit(PDO $pdo,int $outlet): array {
    $raw=(string)file_get_contents('php://input',false,null,0,8193);if(strlen($raw)>8192)registerFail('Please check the details you entered.');
    $body=json_decode($raw,true);if(!is_array($body))registerFail('Please check the details you entered.');
    registerThrottle($pdo,$outlet);
    if(trim((string)($body['website']??''))!=='')return['ok'=>true,'verified'=>false]; // Hidden field only bots fill in.
    if(empty($body['consent']))registerFail('Please agree to the use of your details to continue.');
    $name=strtoupper(registerText($body['name']??'',150));
    if(mb_strlen($name)<2||preg_match('/^[=+\-@]/',$name))registerFail('Please enter your full name.');
    $phone=spNormalizePhone(registerText($body['phone']??'',32));
    if($phone==='')registerFail('Please enter a valid phone number.');
    $plateText=strtoupper(registerText($body['plate']??'',20));$plate=spNormalizePlate($plateText);
    if(strlen($plate)<2||strlen($plate)>12)registerFail('Please enter a valid vehicle plate number.');
    $brand=strtoupper(registerText($body['brand']??'',100));if(preg_match('/^[=+\-@]/',$brand))registerFail('Please check the car brand.');
    $email=strtoupper(registerText($body['email']??'',255));
    if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))registerFail('Please enter a valid email address.');

    $pdo->beginTransaction();spLockOutlet($pdo,$outlet);
    $q=$pdo->prepare('SELECT id,phone,vehicle_number FROM customers WHERE outlet_id=? OR outlet_id IS NULL ORDER BY id');$q->execute([$outlet]);$rows=$q->fetchAll();
    $byPhone=0;$byPlate=0;
    foreach($rows as $row){
        if(!$byPhone&&spNormalizePhone($row['phone']??'')===$phone)$byPhone=(int)$row['id'];
        if(!$byPlate&&spNormalizePlate($row['vehicle_number']??'')===$plate)$byPlate=(int)$row['id'];
    }
    if(!$byPlate&&spTableExists($pdo,'customer_vehicles')){
        $q=$pdo->prepare('SELECT v.customer_id,v.vehicle_number FROM customer_vehicles v JOIN customers c ON c.id=v.customer_id WHERE v.active=1 AND (c.outlet_id=? OR c.outlet_id IS NULL) ORDER BY v.id');$q->execute([$outlet]);
        foreach($q->fetchAll() as $row)if(spNormalizePlate($row['vehicle_number'])===$plate){$byPlate=(int)$row['customer_id'];break;}
    }
    $customerId=$byPhone?:$byPlate;$verified=$byPhone>0&&$byPhone===$byPlate;
    if(!$customerId){
        $codes=$pdo->prepare('SELECT code FROM customers WHERE outlet_id=?');$codes->execute([$outlet]);$top=0;
        foreach($codes->fetchAll(PDO::FETCH_COLUMN) as $code)if(preg_match('/^SP(\d{6})$/i',(string)$code,$m))$top=max($top,(int)$m[1]);
        $values=['outlet_id'=>$outlet,'code'=>'SP'.str_pad((string)($top+1),6,'0',STR_PAD_LEFT),'name'=>$name,'phone'=>$phone,'email'=>$email?:null,'vehicle_number'=>$plateText,'enabled'=>1,'is_customer'=>1,'visits'=>0,'metadata_json'=>json_encode(['source'=>'QR registration'],JSON_UNESCAPED_SLASHES)];
        if(isset(registerColumns($pdo)['car_brand']))$values['car_brand']=$brand?:null;
        $pdo->prepare('INSERT INTO customers (`'.implode('`,`',array_keys($values)).'`) VALUES ('.implode(',',array_fill(0,count($values),'?')).')')->execute(array_values($values));
        $customerId=(int)$pdo->lastInsertId();
    }
    if(spTableExists($pdo,'customer_notes')){
        $note='Name: '.$name.' · Phone: '.$phone.' · Plate: '.$plateText.($brand!==''?' · Brand: '.$brand:'').($email!==''?' · Email: '.$email:'');
        $q=$pdo->prepare("SELECT 1 FROM customer_notes WHERE customer_id=? AND note_type='QR_REGISTRATION' AND note_text=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 DAY) LIMIT 1");$q->execute([$customerId,$note]);
        if(!$q->fetchColumn())$pdo->prepare("INSERT INTO customer_notes (customer_id,note_type,note_text) VALUES (?,'QR_REGISTRATION',?)")->execute([$customerId,$note]);
    }
    $pdo->commit();
    // Only someone who knows both the phone and the plate on file sees the count.
    if(!$verified)return['ok'=>true,'verified'=>false];
    $outlets=$pdo->query('SELECT id FROM outlets WHERE active=1')->fetchAll(PDO::FETCH_COLUMN);
    return['ok'=>true,'verified'=>true,'total_visits'=>(int)(spCustomerVisitTotals($pdo,$outlets)[$customerId]['visits']??0)];
}

$outlet=(int)($_GET['o']??0);$key=(string)($_GET['k']??'');$method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
$outletName='';
try{
    $pdo=spApiDatabase();
    if($outlet>0&&hash_equals(spCustomerRegisterKey($outlet),$key)){
        $q=$pdo->prepare('SELECT outlet_name FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([$outlet]);$outletName=(string)($q->fetchColumn()?:'');
    }
    if($method==='POST'){
        if($outletName==='')registerFail('This registration link is not valid.',404);
        spApiRespond(registerSubmit($pdo,$outlet),200);
    }
}catch(Throwable $e){
    if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
    error_log('SP customer register: '.get_class($e).': '.$e->getMessage());
    if($method==='POST')registerFail('Registration could not be completed. Please try again or ask our staff.',503);
}
if($method!=='GET'){http_response_code(405);exit;}

$nonce=base64_encode(random_bytes(16));
header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'none'; style-src 'nonce-".$nonce."'; script-src 'nonce-".$nonce."'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');
if($outletName==='')http_response_code(404);
$title=htmlspecialchars($outletName,ENT_QUOTES,'UTF-8');
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Customer registration</title>
<style nonce="<?=$nonce?>">
*{box-sizing:border-box}
body{margin:0;min-height:100vh;padding:16px;background:#f4f6f8;color:#172033;font:15px/1.45 Inter,"Segoe UI",system-ui,Arial,sans-serif}
main{width:100%;max-width:460px;margin:0 auto;padding:24px;border:1px solid #e2e5ea;border-radius:16px;background:#fff}
h1{margin:0 0 2px;font-size:21px}
main>p{margin:0 0 20px;color:#64748b}
label{display:block;margin:0 0 14px;font-size:13px;font-weight:600}
input[type=text],input[type=tel],input[type=email]{display:block;width:100%;height:44px;margin-top:6px;padding:0 12px;border:1px solid #cfd9e3;border-radius:9px;background:#fff;color:inherit;font:inherit;font-weight:400}
input:focus{outline:2px solid #087ea4;outline-offset:1px}
.upper{text-transform:uppercase}
.consent{display:flex;gap:9px;align-items:flex-start;font-weight:400;color:#475467}
.consent input{flex:none;width:18px;height:18px;margin:2px 0 0;accent-color:#087ea4}
.trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
button{width:100%;height:46px;border:0;border-radius:9px;background:#087ea4;color:#fff;font:inherit;font-weight:700;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
.error{margin:0 0 14px;padding:10px 12px;border:1px solid #f3c2c2;border-radius:9px;background:#fff5f5;color:#b42318}
.done{text-align:center}
.done strong{display:block;margin:14px 0 2px;font-size:36px;color:#087ea4}
[hidden]{display:none!important}
</style>
</head>
<body>
<main>
<?php if($outletName===''): ?>
<h1>Link not valid</h1>
<p>Please scan the QR code at the outlet again.</p>
<?php else: ?>
<div id="form-view">
<h1>Customer registration</h1>
<p><?=$title?></p>
<div class="error" id="error" role="alert" hidden></div>
<form id="form" novalidate>
<label>Full name<input type="text" name="name" class="upper" maxlength="150" autocomplete="name" required></label>
<label>Phone number<input type="tel" name="phone" maxlength="32" autocomplete="tel" placeholder="012 345 6789" required></label>
<label>Vehicle plate number<input type="text" name="plate" class="upper" maxlength="20" placeholder="VXX 1234" required></label>
<label>Car brand (optional)<input type="text" name="brand" class="upper" maxlength="100" placeholder="PERODUA"></label>
<label>Email (optional)<input type="email" name="email" maxlength="255" autocomplete="email"></label>
<label class="trap" aria-hidden="true">Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
<label class="consent"><input type="checkbox" name="consent" required><span>I agree that <?=$title?> may keep these details for my service records.</span></label>
<button type="submit" id="submit">Register</button>
</form>
</div>
<div class="done" id="done-view" hidden>
<h1>Thank you!</h1>
<p id="done-message">Your registration has been received.</p>
<div id="visit-view" hidden><strong id="visit-count"></strong><span>completed visits</span></div>
</div>
<script nonce="<?=$nonce?>">
const form=document.getElementById('form'),errorBox=document.getElementById('error'),submit=document.getElementById('submit');
form.addEventListener('submit',async event=>{
  event.preventDefault();errorBox.hidden=true;submit.disabled=true;
  const data=new FormData(form);
  const body={name:data.get('name'),phone:data.get('phone'),plate:data.get('plate'),brand:data.get('brand'),email:data.get('email'),website:data.get('website'),consent:data.get('consent')==='on'};
  try{
    const response=await fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw new Error(result.error||'Registration could not be completed.');
    document.getElementById('form-view').hidden=true;document.getElementById('done-view').hidden=false;
    if(result.verified){document.getElementById('done-message').textContent='Welcome back.';document.getElementById('visit-count').textContent=String(result.total_visits);document.getElementById('visit-view').hidden=false;}
  }catch(error){errorBox.textContent=error.message||'Registration could not be completed.';errorBox.hidden=false;submit.disabled=false;}
});
</script>
<?php endif; ?>
</main>
</body>
</html>
