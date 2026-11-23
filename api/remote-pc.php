<?php
declare(strict_types=1);
// Settings > Hardware > Remote PC (accessRemotePc). Remote sessions run in Chrome Remote Desktop;
// SP-Manager lists the registered outlet PCs, keeps each PC's Chrome Remote Desktop name and records who opened a session.
// Nothing here connects to a PC: the user signs in to Google (2-Step Verification) and enters the PC's PIN there.
require_once __DIR__.'/security.php';
require_once __DIR__.'/hardening.php';
require_once __DIR__.'/print-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
const SP_REMOTE_PC_URL='https://remotedesktop.google.com/access';
try{
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
    $pdo=spApiDatabase();
    $user=(int)($_SERVER['SP_AUTH_USER_ID']??0);$current=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);
    if($user<=0||$current<=0)spApiRespond(['ok'=>false,'error'=>'An assigned outlet is required.'],403);
    spPrintRequireTables($pdo);
    if(!spPrintV2($pdo))spApiRespond(['ok'=>false,'error'=>'Run database/migrations/remote-printing-v2.sql first.','code'=>'PRINT_V2_REQUIRED'],409);
    // Outlets this user may reach: assigned outlets, plus the current one.
    $outlets=[$current=>true];
    if(spTableExists($pdo,'user_outlets')){$q=$pdo->prepare('SELECT outlet_id FROM user_outlets WHERE user_id=? AND active=1');$q->execute([$user]);foreach($q->fetchAll(PDO::FETCH_COLUMN) as $o)$outlets[(int)$o]=true;}
    $outlets=array_keys($outlets);$in=implode(',',array_fill(0,count($outlets),'?'));
    $body=$method==='POST'?spReadRequestBody():[];
    $action=strtolower(trim((string)($_GET['action']??$body['action']??'list')));
    $find=function(int $id) use($pdo,$outlets,$in){
        $q=$pdo->prepare("SELECT a.id,a.outlet_id,a.agent_name,a.machine_name,a.remote_name,o.outlet_code FROM sp_print_agents a LEFT JOIN outlets o ON o.id=a.outlet_id WHERE a.id=? AND a.status='ACTIVE' AND a.outlet_id IN ($in) LIMIT 1");
        $q->execute([$id,...$outlets]);$a=$q->fetch();
        if(!$a)spApiRespond(['ok'=>false,'error'=>'PC not found in your outlets.'],404);
        return $a;
    };
    // Audit rows go to the PC's outlet, so each outlet's History shows its own remote sessions.
    $audit=function(string $act,array $a,array $data) use($pdo){$keep=$_SERVER['SP_AUTH_OUTLET_ID']??null;$_SERVER['SP_AUTH_OUTLET_ID']=(string)$a['outlet_id'];spAudit($pdo,$act,'sp_print_agents',(int)$a['id'],null,$data+['agent_name'=>(string)$a['agent_name']]);$_SERVER['SP_AUTH_OUTLET_ID']=$keep;};
    if($method==='GET'&&$action==='list'){
        $q=$pdo->prepare("SELECT a.id,a.outlet_id,o.outlet_code,o.outlet_name,a.agent_name,a.machine_name,a.remote_name,a.agent_version,UNIX_TIMESTAMP(a.last_seen_at) last_seen FROM sp_print_agents a LEFT JOIN outlets o ON o.id=a.outlet_id WHERE a.status='ACTIVE' AND a.outlet_id IN ($in) ORDER BY o.outlet_code,a.agent_name,a.id");
        $q->execute($outlets);$pcs=[];
        foreach($q->fetchAll() as $r){$seen=(int)($r['last_seen']??0);$pcs[]=['id'=>(int)$r['id'],'outletId'=>(int)$r['outlet_id'],'outletCode'=>(string)($r['outlet_code']??''),'outletName'=>(string)($r['outlet_name']??''),'name'=>(string)$r['agent_name'],'machineName'=>(string)($r['machine_name']??''),'remoteName'=>(string)($r['remote_name']??''),'version'=>(string)($r['agent_version']??''),'lastSeen'=>$seen?:null,'online'=>$seen>=time()-SP_PRINT_ONLINE_SECONDS];}
        spApiRespond(['ok'=>true,'pcs'=>$pcs,'url'=>SP_REMOTE_PC_URL],200);
    }
    if($method!=='POST')spApiRespond(['ok'=>false,'error'=>'Method not allowed.'],405);
    if($action==='set-name'){
        $a=$find((int)($body['agent_id']??0));
        $name=spPrintCleanName($body['remote_name']??'');
        $pdo->prepare('UPDATE sp_print_agents SET remote_name=? WHERE id=?')->execute([$name!==''?$name:null,(int)$a['id']]);
        $audit('REMOTE_PC_NAME',$a,['old_name'=>(string)($a['remote_name']??''),'remote_name'=>$name]);
        spApiRespond(['ok'=>true,'remote_name'=>$name],200);
    }
    if($action==='open'){
        $a=$find((int)($body['agent_id']??0));
        $audit('REMOTE_PC_OPEN',$a,['remote_name'=>(string)($a['remote_name']??''),'machine_name'=>(string)($a['machine_name']??''),'outlet'=>(string)($a['outlet_code']??'')]);
        spApiRespond(['ok'=>true,'url'=>SP_REMOTE_PC_URL],200);
    }
    spApiRespond(['ok'=>false,'error'=>'Unknown remote PC request.'],400);
}catch(Throwable $e){
    error_log('SP remote-pc '.get_class($e).': '.$e->getMessage());
    spApiRespond(['ok'=>false,'error'=>spSafeErrorMessage($e)],500);
}
