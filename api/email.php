<?php
declare(strict_types=1);
require_once __DIR__.'/security.php';
require_once __DIR__.'/vendor/PHPMailer/src/Exception.php';
require_once __DIR__.'/vendor/PHPMailer/src/SMTP.php';
require_once __DIR__.'/vendor/PHPMailer/src/PHPMailer.php';
require_once __DIR__.'/receipt-pdf.php';
try {
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')spApiRespond(['ok'=>false,'error'=>'POST required.'],405);
 $pdo=spApiDatabase();$body=spReadRequestBody();$outlet=(int)$_SERVER['SP_AUTH_OUTLET_ID'];$sale=(int)($body['sale_id']??0);
 $q=$pdo->prepare('SELECT s.sale_no,c.email FROM sales s JOIN customers c ON c.id=s.customer_id WHERE s.id=? AND s.outlet_id=?');$q->execute([$sale,$outlet]);$recipient=$q->fetch();
 if(!$recipient||!filter_var($recipient['email'],FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Customer email is missing or invalid.');
 $q=$pdo->prepare('SELECT * FROM email_settings WHERE outlet_id=? AND enabled=1');$q->execute([$outlet]);$settings=$q->fetch();if(!$settings)throw new RuntimeException('Configure SMTP settings.');
 $html=(string)($body['invoiceHtml']??'');$message=(string)($body['body']??'');if(strlen($html)>2000000||strlen($message)>100000)throw new InvalidArgumentException('Email content is too large.');
 $mail=new \PHPMailer\PHPMailer\PHPMailer(true);$mail->isSMTP();$mail->Host=$settings['smtp_host'];$mail->Port=(int)$settings['smtp_port'];$mail->Timeout=15;$mail->getSMTPInstance()->Timelimit=20;$mail->SMTPAuth=true;$mail->Username=$settings['username'];$mail->Password=decryptSecret($settings['password_encrypted'],'');
 $mail->SMTPSecure=$mail->Port===465?\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS:\PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
 $mail->CharSet='UTF-8';$mail->setFrom($settings['from_email'],$settings['from_name']);$mail->addAddress($recipient['email']);$mail->Subject=(string)($body['subject']??('Invoice '.$recipient['sale_no']));$mail->isHTML(true);$mail->Body=$message;$mail->AltBody=strip_tags($message);
 $q=$pdo->prepare('SELECT * FROM sales WHERE id=? AND outlet_id=?');$q->execute([$sale,$outlet]);$saleRow=$q->fetch();$q=$pdo->prepare('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id');$q->execute([$sale]);$items=$q->fetchAll();$q=$pdo->prepare('SELECT * FROM customers WHERE id=?');$q->execute([$saleRow['customer_id']]);$customer=$q->fetch()?:[];$q=$pdo->prepare('SELECT * FROM company_settings WHERE outlet_id=?');$q->execute([$outlet]);$company=$q->fetch()?:[];$q=$pdo->prepare('SELECT address FROM outlets WHERE id=?');$q->execute([(int)$saleRow['outlet_id']]);$company=spInvoiceOutletCompany($company,$q->fetch()?:[]);$q=$pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM sale_payments WHERE sale_id=?');$q->execute([$sale]);$paid=(float)$q->fetchColumn();
 $q=$pdo->prepare('SELECT payment_type_name,amount FROM sale_payments WHERE sale_id=? ORDER BY id');$q->execute([$sale]);$payments=$q->fetchAll();$pdf=spReceiptPdf($company,$saleRow,$customer,$items,$paid,$payments,(string)(spApiConfig()['business_timezone']??'Asia/Kuala_Lumpur'));$mail->addStringAttachment($pdf,'Invoice-'.preg_replace('/[^A-Za-z0-9_-]/','_',$recipient['sale_no']).'.pdf','base64','application/pdf');
 $mail->send();spAudit($pdo,'RECEIPT_EMAIL','sales',$sale);spApiRespond(['ok'=>true],200);
} catch(Throwable $e) {error_log('SP mail: '.$e->getMessage());spApiRespond(['ok'=>false,'error'=>'Email could not be sent. Check server SMTP configuration.'],400);}
