<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('SP_MANAGER_CLI',true);
$_SERVER['REQUEST_METHOD']='POST';$_GET['action']='backup';$_POST=['store'=>true,'prune_days'=>30,'outlet_id'=>$argv[1]??'SP01'];
require __DIR__.'/database.php';
