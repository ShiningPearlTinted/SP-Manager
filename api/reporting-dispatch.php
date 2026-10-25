<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/reporting-lib.php';
try {
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET')throw new ReportingError('Reports are read-only.',405);
    if(!spHasPermission('manageReports'))throw new ReportingError('Reports permission required.',403);
    date_default_timezone_set('Asia/Kuala_Lumpur');$db=spApiDatabase();$db->exec("SET time_zone='+08:00'");
    $action=(string)($_GET['action']??'');$engine=new ReportingEngine($db,(int)$_SERVER['SP_AUTH_OUTLET_ID'],$_GET);
    if($action==='report-catalog')spApiRespond(['ok'=>true,'api_version'=>'V10','reports'=>rpCatalog()],200);
    if($action==='report-options')spApiRespond(['ok'=>true,'api_version'=>'V10','options'=>$engine->options()],200);
    if(!in_array($action,['run-report','report-pdf'],true))throw new ReportingError('Unknown reporting action.',404);
    $db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    $db->beginTransaction();
    $report=$engine->run((string)($_GET['report']??''));
    $labels=[];$options=$engine->options();
    foreach(['customer'=>'customers','supplier'=>'suppliers','user'=>'users','product'=>'products','group'=>'groups','terminal'=>'terminals'] as $key=>$list){$id=rpId($_GET[$key]??null);if($id)foreach($options[$list] as $option)if((int)$option['id']===$id)$labels[]=ucfirst($key).': '.$option['name'];}
    if(!empty($_GET['group']))$labels[]='Include subgroups: '.(($_GET['include_subgroups']??'1')==='1'?'Yes':'No');
    $report['applied_filter_labels']=$labels;
    $db->commit();
    if($action==='report-pdf'){
        require_once __DIR__.'/reporting-pdf.php';$bytes=rpPdf($report);header('Content-Type: application/pdf');header('Content-Disposition: attachment; filename="SP-Manager-'.$report['report']['id'].'-'.$report['period']['start'].'.pdf"');header('Content-Length: '.strlen($bytes));echo $bytes;exit;
    }
    spApiRespond($report,200);
} catch(Throwable $error){
    if(isset($db)&&$db instanceof PDO&&$db->inTransaction())$db->rollBack();
    if($error instanceof ReportingError)spApiRespond(['ok'=>false,'error'=>$error->getMessage()],$error->status);
    error_log('SP Reporting failed: '.get_class($error));spApiRespond(['ok'=>false,'error'=>'The report query could not be completed. Verify the required schema and choose a shorter period.'],503);
}
