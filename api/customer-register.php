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
// The login screen logo, falling back to the company logo, then to another outlet's.
function registerLogo(PDO $pdo,int $outlet): string {
    if(!spTableExists($pdo,'company_settings'))return'';
    $q=$pdo->prepare('SELECT metadata_json,logo_url FROM company_settings ORDER BY outlet_id=? DESC,outlet_id');$q->execute([$outlet]);
    foreach($q->fetchAll() as $row){
        $meta=json_decode((string)($row['metadata_json']??''),true);$meta=is_array($meta)?$meta:[];
        $logo=trim((string)($meta['loginLogo']??''))?:trim((string)($meta['logo']??''))?:trim((string)($row['logo_url']??''));
        if(preg_match('#^(data:image/|https://)#i',$logo))return$logo;
    }
    return'';
}
// Brands and models come from sp_car_models; until it is filled, from the Price Check car list.
function registerCars(PDO $pdo): array {
    $rows=[];
    if(spTableExists($pdo,'sp_car_models'))$rows=$pdo->query('SELECT brand,model FROM sp_car_models WHERE active=1')->fetchAll();
    if(!$rows&&spTableExists($pdo,'car_batteries'))$rows=$pdo->query('SELECT DISTINCT car_brand brand,model FROM car_batteries')->fetchAll();
    $cars=[];
    foreach($rows as $row){
        $brand=trim((string)$row['brand']);$model=trim((string)$row['model']);if($brand==='')continue;
        $key=strtoupper($brand);$cars[$key]??=['brand'=>$brand,'models'=>[]];
        if($model!=='')$cars[$key]['models'][strtoupper($model)]=$model;
    }
    uasort($cars,fn($a,$b)=>strnatcasecmp($a['brand'],$b['brand']));
    $list=[];
    foreach($cars as $car){$models=array_values($car['models']);natcasesort($models);$list[]=['brand'=>$car['brand'],'models'=>array_values($models)];}
    return$list;
}
function registerSubmit(PDO $pdo,int $outlet): array {
    $raw=(string)file_get_contents('php://input',false,null,0,8193);if(strlen($raw)>8192)registerFail('Please check the details you entered.');
    $body=json_decode($raw,true);if(!is_array($body))registerFail('Please check the details you entered.');
    registerThrottle($pdo,$outlet);
    if(trim((string)($body['website']??''))!=='')return['ok'=>true,'verified'=>false]; // Hidden field only bots fill in.
    $name=strtoupper(registerText($body['name']??'',150));
    if(mb_strlen($name)<2||preg_match('/^[=+\-@]/',$name))registerFail('Please enter your name.');
    $phone=spNormalizePhone(registerText($body['phone']??'',32));
    if($phone==='')registerFail('Please enter a valid phone number.');
    $brand=strtoupper(registerText($body['brand']??'',100));
    if($brand===''||preg_match('/^[=+\-@]/',$brand))registerFail('Please select your car brand.');
    $model=strtoupper(registerText($body['model']??'',150));
    if($model===''||preg_match('/^[=+\-@]/',$model))registerFail('Please select your car model.');
    $plateText=strtoupper(registerText($body['plate']??'',20));$plate=spNormalizePlate($plateText);
    if(strlen($plate)<2||strlen($plate)>12)registerFail('Please enter a valid car plate number.');
    $email=strtoupper(registerText($body['email']??'',255));
    if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))registerFail('Please enter a valid email address.');

    $pdo->beginTransaction();spLockOutlet($pdo,$outlet);
    $q=$pdo->prepare('SELECT id,phone,vehicle_number FROM customers WHERE outlet_id=? OR outlet_id IS NULL ORDER BY id');$q->execute([$outlet]);$rows=$q->fetchAll();
    $byPhone=0;$byPlate=0;
    foreach($rows as $row){
        if(!$byPhone&&spNormalizePhone($row['phone']??'')===$phone)$byPhone=(int)$row['id'];
        if(!$byPlate&&spNormalizePlate($row['vehicle_number']??'')===$plate)$byPlate=(int)$row['id'];
    }
    $vehicles=spTableExists($pdo,'customer_vehicles');
    if(!$byPlate&&$vehicles){
        $q=$pdo->prepare('SELECT v.customer_id,v.vehicle_number FROM customer_vehicles v JOIN customers c ON c.id=v.customer_id WHERE v.active=1 AND (c.outlet_id=? OR c.outlet_id IS NULL) ORDER BY v.id');$q->execute([$outlet]);
        foreach($q->fetchAll() as $row)if(spNormalizePlate($row['vehicle_number'])===$plate){$byPlate=(int)$row['customer_id'];break;}
    }
    $customerId=$byPhone?:$byPlate;$verified=$byPhone>0&&$byPhone===$byPlate;
    if(!$customerId){
        $codes=$pdo->prepare('SELECT code FROM customers WHERE outlet_id=?');$codes->execute([$outlet]);$top=0;
        foreach($codes->fetchAll(PDO::FETCH_COLUMN) as $code)if(preg_match('/^SP(\d{6})$/i',(string)$code,$m))$top=max($top,(int)$m[1]);
        $values=['outlet_id'=>$outlet,'code'=>'SP'.str_pad((string)($top+1),6,'0',STR_PAD_LEFT),'name'=>$name,'phone'=>$phone,'email'=>$email?:null,'vehicle_number'=>$plateText,'enabled'=>1,'is_customer'=>1,'visits'=>0,'metadata_json'=>json_encode(['source'=>'QR registration'],JSON_UNESCAPED_SLASHES)];
        if(isset(registerColumns($pdo)['car_brand']))$values['car_brand']=mb_substr($brand.' '.$model,0,100); // Car Brand shows the full car, e.g. HONDA CITY.
        $pdo->prepare('INSERT INTO customers (`'.implode('`,`',array_keys($values)).'`) VALUES ('.implode(',',array_fill(0,count($values),'?')).')')->execute(array_values($values));
        $customerId=(int)$pdo->lastInsertId();
        if($vehicles)$pdo->prepare('INSERT INTO customer_vehicles (outlet_id,customer_id,vehicle_number,make,model) VALUES (?,?,?,?,?)')->execute([$outlet,$customerId,$plateText,$brand,$model]);
    }
    if(spTableExists($pdo,'customer_notes')){
        $note='Name: '.$name.' · Phone: '.$phone.' · Plate: '.$plateText.' · Car: '.$brand.' '.$model.($email!==''?' · Email: '.$email:'');
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
$outletName='';$logo='';$cars=[];
try{
    $pdo=spApiDatabase();
    if($outlet>0&&hash_equals(spCustomerRegisterKey($outlet),$key)){
        $q=$pdo->prepare('SELECT outlet_name FROM outlets WHERE id=? AND active=1 LIMIT 1');$q->execute([$outlet]);$outletName=(string)($q->fetchColumn()?:'');
    }
    if($method==='POST'){
        if($outletName==='')registerFail('This registration link is not valid.',404);
        spApiRespond(registerSubmit($pdo,$outlet),200);
    }
    if($outletName!==''){$logo=registerLogo($pdo,$outlet);$cars=registerCars($pdo);}
}catch(Throwable $e){
    if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
    error_log('SP customer register: '.get_class($e).': '.$e->getMessage());
    if($method==='POST')registerFail('Registration could not be completed. Please try again or ask our staff.',503);
}
if($method!=='GET'){http_response_code(405);exit;}

$nonce=base64_encode(random_bytes(16));
header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'none'; img-src data: https:; style-src 'nonce-".$nonce."'; script-src 'nonce-".$nonce."'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');
if($outletName==='')http_response_code(404);
$carsJson=json_encode($cars,JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0a0a0b">
<title>Customer Registration</title>
<style nonce="<?=$nonce?>">
*{box-sizing:border-box}
html{background:#0a0a0b}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;color:#f5f5f6;font:16px/1.4 Inter,"Segoe UI",system-ui,-apple-system,Arial,sans-serif;background:linear-gradient(rgba(8,8,9,.72),rgba(8,8,9,.86)),url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop") center/cover fixed no-repeat,#0a0a0b}
main{width:100%;max-width:448px;padding:36px 34px 34px;border:1px solid rgba(239,47,58,.32);border-radius:24px;background:linear-gradient(180deg,rgba(25,25,28,.97),rgba(15,15,17,.98));box-shadow:0 24px 70px rgba(0,0,0,.65),0 0 44px rgba(225,29,42,.16)}
.logo{display:block;max-width:190px;max-height:96px;margin:0 auto 22px;object-fit:contain}
h1{margin:0;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-.01em;text-align:center}
.tagline{margin:8px 0 24px;color:#b7b7bd;font-size:14px;text-align:center}
label{display:block;margin:0 0 15px;font-size:13.5px;font-weight:600}
input,select{display:block;width:100%;height:48px;margin-top:7px;padding:0 15px;border:1px solid #38383d;border-radius:12px;background-color:#242427;color:#fff;font:inherit;font-weight:400;appearance:none;-webkit-appearance:none;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:#85858c}
input:focus,select:focus{outline:0;border-color:#ef2f3a;box-shadow:0 0 0 3px rgba(239,47,58,.25)}
select{padding-right:42px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:18px}
select:disabled{opacity:.55;cursor:not-allowed}
select.empty{color:#d4d4d8}
option{background:#242427;color:#fff}
.other{margin-top:8px}
.upper{text-transform:uppercase}
.upper::placeholder{text-transform:none}
.trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
button{display:block;width:100%;min-height:52px;margin-top:20px;border:0;border-radius:12px;background:linear-gradient(90deg,#ff2f38,#b80d16);color:#fff;font:inherit;font-size:14.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 26px rgba(225,29,42,.32);transition:filter .15s}
button:hover:not(:disabled){filter:brightness(1.1)}
button:focus-visible{outline:2px solid #fff;outline-offset:2px}
button:disabled{opacity:.6;cursor:default}
.error{margin:0 0 15px;padding:11px 14px;border:1px solid rgba(239,47,58,.6);border-radius:12px;background:rgba(239,47,58,.14);color:#ffb4b8;font-size:14px}
.notice{margin:13px 0 0;color:#85858c;font-size:12px;text-align:center}
.done{text-align:center}
.done p{margin:10px 0 0;color:#c7c7cc}
.done strong{display:block;margin:18px 0 0;font-size:46px;line-height:1;font-weight:800;color:#ff3b44}
.done span{color:#c7c7cc;font-size:14px}
[hidden]{display:none!important}
@media (max-width:420px){main{padding:28px 20px 26px;border-radius:20px}h1{font-size:26px}body{background-attachment:scroll}}
</style>
</head>
<body>
<main>
<?php if($logo!==''): ?><img class="logo" src="<?=htmlspecialchars($logo,ENT_QUOTES,'UTF-8')?>" alt="Shining Pearl Tinted"><?php endif; ?>
<?php if($outletName===''): ?>
<h1>Link not valid</h1>
<?php else: ?>
<div id="form-view">
<h1>Customer Registration</h1>
<p class="tagline">Premium Automotive Window Film</p>
<div class="error" id="error" role="alert" hidden></div>
<form id="form" novalidate>
<label>Customer Name<input type="text" name="name" class="upper" maxlength="150" autocomplete="name" placeholder="Enter Customer Name"></label>
<label>Phone Number<input type="tel" name="phone" maxlength="32" autocomplete="tel" inputmode="tel" placeholder="0123456789"></label>
<label>Email (optional)<input type="email" name="email" maxlength="255" autocomplete="email" inputmode="email" placeholder="name@example.com"></label>
<label>Car Brand<select id="brand" class="empty"><option value="">Select Car Brand</option></select><input type="text" id="brand-other" class="upper other" maxlength="100" aria-label="Car Brand" placeholder="Enter Car Brand" hidden></label>
<label>Car Model<select id="model" class="empty" disabled><option value="">Select Car Model</option></select><input type="text" id="model-other" class="upper other" maxlength="150" aria-label="Car Model" placeholder="Enter Car Model" hidden></label>
<label>Car Plate Number<input type="text" name="plate" class="upper" maxlength="20" autocomplete="off" placeholder="ABC1234"></label>
<label class="trap" aria-hidden="true">Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
<button type="submit" id="submit">Register Customer</button>
<p class="notice">Your details are kept for service records.</p>
</form>
</div>
<div class="done" id="done-view" hidden>
<h1>Thank You</h1>
<p id="done-message">Registration received.</p>
<div id="visit-view" hidden><strong id="visit-count"></strong><span>completed visits</span></div>
</div>
<script type="application/json" id="cars"><?=$carsJson?></script>
<script nonce="<?=$nonce?>">
const OTHER='__other__',cars=JSON.parse(document.getElementById('cars').textContent||'[]');
const $=id=>document.getElementById(id),form=$('form'),errorBox=$('error'),submit=$('submit'),brand=$('brand'),model=$('model'),brandOther=$('brand-other'),modelOther=$('model-other');
const fill=(select,placeholder,values)=>{select.replaceChildren(new Option(placeholder,''),...values.map(v=>new Option(v,v)),new Option('Other',OTHER));};
const mark=()=>{brand.classList.toggle('empty',!brand.value);model.classList.toggle('empty',!model.value);};
const syncModel=()=>{modelOther.hidden=model.value!==OTHER;if(!modelOther.hidden)modelOther.focus();mark();};
const syncBrand=()=>{
  const isOther=brand.value===OTHER,car=cars.find(c=>c.brand===brand.value);
  brandOther.hidden=!isOther;
  fill(model,'Select Car Model',car?car.models:[]);
  model.disabled=!brand.value;
  if(isOther){model.value=OTHER;modelOther.hidden=false;brandOther.focus();}else modelOther.hidden=true;
  mark();
};
fill(brand,'Select Car Brand',cars.map(c=>c.brand));
brand.addEventListener('change',syncBrand);model.addEventListener('change',syncModel);
form.addEventListener('submit',async event=>{
  event.preventDefault();errorBox.hidden=true;submit.disabled=true;
  const data=new FormData(form);
  const body={name:data.get('name'),phone:data.get('phone'),brand:brand.value===OTHER?brandOther.value:brand.value,model:model.value===OTHER?modelOther.value:model.value,plate:data.get('plate'),email:data.get('email'),website:data.get('website')};
  try{
    const response=await fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw new Error(result.error||'Registration could not be completed.');
    $('form-view').hidden=true;$('done-view').hidden=false;
    if(result.verified){$('done-message').textContent='Welcome back.';$('visit-count').textContent=String(result.total_visits);$('visit-view').hidden=false;}
  }catch(error){errorBox.textContent=error.message||'Registration could not be completed.';errorBox.hidden=false;submit.disabled=false;window.scrollTo({top:0,behavior:'smooth'});}
});
</script>
<?php endif; ?>
</main>
</body>
</html>
