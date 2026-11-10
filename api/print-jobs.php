<?php
declare(strict_types=1);
// Remote Printing for signed-in SP-Manager users: print PC registration, the job queue and print history.
// The print PC itself talks to print-agent.php with its own agent token.
require_once __DIR__.'/security.php';
require_once __DIR__.'/hardening.php';
require_once __DIR__.'/print-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
try{
    $method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));
    $pdo=spApiDatabase();
    $outlet=(int)($_SERVER['SP_AUTH_OUTLET_ID']??0);$user=(int)($_SERVER['SP_AUTH_USER_ID']??0);
    if($outlet<=0)spApiRespond(['ok'=>false,'error'=>'An assigned outlet is required.'],403);
    spPrintRequireTables($pdo);
    $body=$method==='POST'?spReadRequestBody():[];
    $action=strtolower(trim((string)($_GET['action']??$body['action']??'')));
    spPrintHousekeeping($pdo,$outlet);

    if($method==='GET'&&$action==='agents'){
        $q=$pdo->prepare("SELECT id,agent_name,machine_name,status,agent_version,printers_json,UNIX_TIMESTAMP(last_seen_at) last_seen,UNIX_TIMESTAMP(created_at) created,UNIX_TIMESTAMP(pairing_expires_at) pairing_expires FROM sp_print_agents WHERE outlet_id=? AND status<>'REVOKED' ORDER BY agent_name,id");
        $q->execute([$outlet]);
        spApiRespond(['ok'=>true,'agents'=>array_map('spPrintAgentOut',$q->fetchAll()),'now'=>time()],200);
    }
    if($method==='GET'&&$action==='history'){
        $limit=max(1,min(200,(int)($_GET['limit']??50)));
        $q=$pdo->prepare("SELECT j.id,j.agent_id,a.agent_name,j.printer_name,j.document_type,j.document_id,j.document_no,j.paper_size,j.copies,j.status,j.error_message,u.name requested_by_name,UNIX_TIMESTAMP(j.created_at) created,UNIX_TIMESTAMP(j.completed_at) completed FROM sp_print_jobs j LEFT JOIN sp_print_agents a ON a.id=j.agent_id LEFT JOIN users u ON u.id=j.requested_by WHERE j.outlet_id=? ORDER BY j.id DESC LIMIT ".$limit);
        $q->execute([$outlet]);
        spApiRespond(['ok'=>true,'jobs'=>array_map('spPrintJobOut',$q->fetchAll())],200);
    }
    if($method==='GET'&&$action==='job'){
        $q=$pdo->prepare('SELECT j.id,j.agent_id,a.agent_name,j.printer_name,j.document_type,j.document_id,j.document_no,j.paper_size,j.copies,j.status,j.error_message,NULL requested_by_name,UNIX_TIMESTAMP(j.created_at) created,UNIX_TIMESTAMP(j.completed_at) completed FROM sp_print_jobs j LEFT JOIN sp_print_agents a ON a.id=j.agent_id WHERE j.id=? AND j.outlet_id=? LIMIT 1');
        $q->execute([(int)($_GET['id']??0),$outlet]);$row=$q->fetch();
        if(!$row)spApiRespond(['ok'=>false,'error'=>'Print job not found.'],404);
        spApiRespond(['ok'=>true,'job'=>spPrintJobOut($row)],200);
    }
    if($method!=='POST')spApiRespond(['ok'=>false,'error'=>'Method not allowed.'],405);

    if($action==='create-pairing'){
        $name=spPrintCleanName($body['agent_name']??'');
        if($name==='')spApiRespond(['ok'=>false,'error'=>'Enter a name for this PC, for example "Counter PC".'],400);
        $q=$pdo->prepare("SELECT COUNT(*) FROM sp_print_agents WHERE outlet_id=? AND status='ACTIVE'");$q->execute([$outlet]);
        if((int)$q->fetchColumn()>=SP_PRINT_MAX_AGENTS)spApiRespond(['ok'=>false,'error'=>'This outlet already has '.SP_PRINT_MAX_AGENTS.' print PCs. Remove one first.'],409);
        // Old unused codes for this outlet stop working when a new one is issued.
        $pdo->prepare("DELETE FROM sp_print_agents WHERE outlet_id=? AND status='PENDING'")->execute([$outlet]);
        $code=spPrintNewPairingCode();
        $pdo->prepare("INSERT INTO sp_print_agents(outlet_id,agent_name,status,pairing_code_hash,pairing_expires_at,created_by) VALUES(?,?,'PENDING',?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)")
            ->execute([$outlet,$name,hash('sha256',spPrintNormalizeCode($code)),SP_PRINT_PAIRING_MINUTES,$user?:null]);
        $id=(int)$pdo->lastInsertId();
        spAudit($pdo,'PRINT_AGENT_PAIRING','sp_print_agents',$id,null,['agent_name'=>$name]);
        spApiRespond(['ok'=>true,'agent_id'=>$id,'pairing_code'=>$code,'expires_in'=>SP_PRINT_PAIRING_MINUTES*60],200);
    }
    if($action==='revoke-agent'||$action==='rename-agent'){
        $id=(int)($body['agent_id']??0);
        $q=$pdo->prepare("SELECT id,agent_name,status FROM sp_print_agents WHERE id=? AND outlet_id=? AND status<>'REVOKED' LIMIT 1");$q->execute([$id,$outlet]);$agent=$q->fetch();
        if(!$agent)spApiRespond(['ok'=>false,'error'=>'Print PC not found.'],404);
        if($action==='rename-agent'){
            $name=spPrintCleanName($body['agent_name']??'');if($name==='')spApiRespond(['ok'=>false,'error'=>'Enter a name for this PC.'],400);
            $pdo->prepare('UPDATE sp_print_agents SET agent_name=? WHERE id=? AND outlet_id=?')->execute([$name,$id,$outlet]);
            spAudit($pdo,'PRINT_AGENT_RENAME','sp_print_agents',$id,['agent_name'=>$agent['agent_name']],['agent_name'=>$name]);
            spApiRespond(['ok'=>true],200);
        }
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE sp_print_agents SET status='REVOKED',token_hash=NULL,pairing_code_hash=NULL WHERE id=? AND outlet_id=?")->execute([$id,$outlet]);
        $pdo->prepare("UPDATE sp_print_jobs SET status='CANCELLED',error_message='The print PC was removed.',content_html=NULL,completed_at=NOW() WHERE agent_id=? AND outlet_id=? AND status IN ('QUEUED','PRINTING')")->execute([$id,$outlet]);
        $pdo->commit();
        spAudit($pdo,'PRINT_AGENT_REVOKE','sp_print_agents',$id,['agent_name'=>$agent['agent_name']],null);
        spApiRespond(['ok'=>true],200);
    }
    if($action==='create-job'){
        $agentId=(int)($body['agent_id']??0);
        $printer=trim((string)($body['printer_name']??''));
        $paper=strtoupper(trim((string)($body['paper_size']??'')));
        $type=strtolower(trim((string)($body['document_type']??'')));
        $html=(string)($body['html']??'');
        $copies=max(1,min(SP_PRINT_MAX_COPIES,(int)($body['copies']??1)));
        if(!in_array($paper,SP_PRINT_PAPER_SIZES,true))spApiRespond(['ok'=>false,'error'=>'Choose A4 or A5.'],400);
        if(!in_array($type,SP_PRINT_DOCUMENT_TYPES,true))spApiRespond(['ok'=>false,'error'=>'This document type cannot be printed remotely.'],400);
        if($html===''||strlen($html)>SP_PRINT_MAX_HTML_BYTES)spApiRespond(['ok'=>false,'error'=>'The document is empty or larger than '.(int)(SP_PRINT_MAX_HTML_BYTES/1048576).' MB.'],400);
        $q=$pdo->prepare("SELECT id,agent_name,printers_json,UNIX_TIMESTAMP(last_seen_at) last_seen FROM sp_print_agents WHERE id=? AND outlet_id=? AND status='ACTIVE' LIMIT 1");$q->execute([$agentId,$outlet]);$agent=$q->fetch();
        if(!$agent)spApiRespond(['ok'=>false,'error'=>'The selected print PC is not registered for this outlet.'],404);
        // The printer and paper size are checked against what the agent read from the Windows driver.
        $printers=spPrintDecodePrinters($agent['printers_json']);$match=null;
        foreach($printers as $p)if(strcasecmp($p['name'],$printer)===0){$match=$p;break;}
        if(!$match)spApiRespond(['ok'=>false,'error'=>'Printer "'.$printer.'" was not found on '.$agent['agent_name'].'. Refresh the printer list on that PC.','code'=>'PRINTER_NOT_FOUND'],409);
        if($match['paperSizes']&&!in_array($paper,$match['paperSizes'],true))spApiRespond(['ok'=>false,'error'=>'Printer "'.$match['name'].'" does not support '.$paper.'. Supported: '.implode(', ',$match['paperSizes']).'. Choose another paper size.','code'=>'PAPER_NOT_SUPPORTED','supported'=>$match['paperSizes']],409);
        $pdo->prepare('INSERT INTO sp_print_jobs(outlet_id,agent_id,printer_name,document_type,document_id,document_no,paper_size,copies,content_html,status,requested_by,expires_at) VALUES(?,?,?,?,?,?,?,?,?,\'QUEUED\',?,DATE_ADD(NOW(),INTERVAL ? MINUTE))')
            ->execute([$outlet,$agentId,$match['name'],$type,substr(trim((string)($body['document_id']??'')),0,64)?:null,substr(trim((string)($body['document_no']??'')),0,80)?:null,$paper,$copies,$html,$user?:null,SP_PRINT_JOB_MINUTES]);
        $id=(int)$pdo->lastInsertId();
        $online=(int)($agent['last_seen']??0)>=time()-SP_PRINT_ONLINE_SECONDS;
        spApiRespond(['ok'=>true,'job_id'=>$id,'agent_online'=>$online,'message'=>$online?'Sent to '.$agent['agent_name'].'.':'Queued. '.$agent['agent_name'].' is offline; it prints when it reconnects within '.SP_PRINT_JOB_MINUTES.' minutes.'],200);
    }
    if($action==='cancel-job'){
        $id=(int)($body['job_id']??0);
        $q=$pdo->prepare("UPDATE sp_print_jobs SET status='CANCELLED',error_message='Cancelled by user.',content_html=NULL,completed_at=NOW() WHERE id=? AND outlet_id=? AND status='QUEUED'");$q->execute([$id,$outlet]);
        if(!$q->rowCount())spApiRespond(['ok'=>false,'error'=>'Only a queued job can be cancelled.'],409);
        spApiRespond(['ok'=>true],200);
    }
    spApiRespond(['ok'=>false,'error'=>'Unknown remote printing request.'],400);
}catch(Throwable $e){
    if(isset($pdo)&&$pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
    error_log('SP print-jobs '.get_class($e).': '.$e->getMessage());
    spApiRespond(['ok'=>false,'error'=>spSafeErrorMessage($e)],500);
}
