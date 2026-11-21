<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/vendor/PHPMailer/src/Exception.php';
require_once __DIR__.'/vendor/PHPMailer/src/SMTP.php';
require_once __DIR__.'/vendor/PHPMailer/src/PHPMailer.php';
require_once __DIR__.'/invoice-pdf.php';
try {
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')spApiRespond(['ok'=>false,'error'=>'POST required.'],405);
 $pdo=spApiDatabase();$body=spReadRequestBody();$outlet=(int)$_SERVER['SP_AUTH_OUTLET_ID'];$sale=(int)($body['sale_id']??0);
 if(($_GET['action']??'')==='sale-pdf'){$file=spSaleReceiptPdf($pdo,$outlet,$sale);spAudit($pdo,'RECEIPT_SHARE','sales',$sale);spApiRespond(['ok'=>true,'filename'=>$file['filename'],'pdf'=>base64_encode($file['pdf'])],200);}
 $q=$pdo->prepare('SELECT s.sale_no,c.email FROM sales s JOIN customers c ON c.id=s.customer_id WHERE s.id=? AND s.outlet_id=?');$q->execute([$sale,$outlet]);$recipient=$q->fetch();
 if(!$recipient||!filter_var($recipient['email'],FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Customer email is missing or invalid.');
 $q=$pdo->prepare('SELECT * FROM email_settings WHERE outlet_id=? AND enabled=1');$q->execute([$outlet]);$settings=$q->fetch();if(!$settings)throw new RuntimeException('Configure SMTP settings.');
 $html=(string)($body['invoiceHtml']??'');$message=(string)($body['body']??'');if(strlen($html)>2000000||strlen($message)>100000)throw new InvalidArgumentException('Email content is too large.');
 $mail=new \PHPMailer\PHPMailer\PHPMailer(true);$mail->isSMTP();$mail->Host=$settings['smtp_host'];$mail->Port=(int)$settings['smtp_port'];$mail->Timeout=15;$mail->getSMTPInstance()->Timelimit=20;$mail->SMTPAuth=true;$mail->Username=$settings['username'];$mail->Password=decryptSecret($settings['password_encrypted'],'');
 $mail->SMTPSecure=$mail->Port===465?\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
 $mail->CharSet='UTF-8';$mail->setFrom($settings['from_email'],$settings['from_name']);$mail->addAddress($recipient['email']);$mail->Subject=(string)($body['subject']??('Invoice '.$recipient['sale_no']));$mail->isHTML(true);$mail->Body=$message;$mail->AltBody=strip_tags($message);
 $file=spSaleReceiptPdf($pdo,$outlet,$sale);$mail->addStringAttachment($file['pdf'],$file['filename'],'base64','application/pdf');
 $mail->send();spAudit($pdo,'RECEIPT_EMAIL','sales',$sale);spApiRespond(['ok'=>true],200);
} catch(Throwable $e) {error_log('SP mail: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>($_GET['action']??'')==='sale-pdf'?'The invoice PDF could not be created.':'Email could not be sent. Check server SMTP configuration.'],400);}
