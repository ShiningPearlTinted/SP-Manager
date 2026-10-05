<?php
declare(strict_types=1);
/** Outlet address wins for invoices; company record remains unchanged. */
function spInvoiceOutletCompany(array $company,array $outlet):array {
 $company['outlet_address']=trim((string)($outlet['address']??''));
 return $company;
}
/** A4 PDF invoice, using authoritative DB records; no remote resources fetched. */
function spReceiptPdf(array $company,array $sale,array $customer,array $items,float $paid,array $payments=[],string $timezone='Asia/Kuala_Lumpur'):string {
 $logoPath=__DIR__.'/assets/invoice-logo.jpg';$logo=is_file($logoPath)?file_get_contents($logoPath):null;$logoInfo=$logo?getimagesizefromstring($logo):null;
 // Inline JPEG company logos are supported without adding a PHP extension.
 $meta=json_decode((string)($company['metadata_json']??''),true);$src=(string)($company['logo_url']??($meta['logo']??''));
 if(strlen($src)<6000000&&preg_match('#^data:image/jpeg;base64,(.+)$#s',$src,$m)){$raw=base64_decode($m[1],true);$info=$raw?@getimagesizefromstring($raw):false;if($info&&$info[0]*$info[1]<=16000000&&$info[2]===IMAGETYPE_JPEG){$logo=$raw;$logoInfo=$info;}}
 $customerMeta=json_decode((string)($customer['metadata_json']??''),true);if(!is_array($customerMeta))$customerMeta=[];
 $money=static fn($v)=>'RM '.number_format((float)$v,2);
 $date=static function($v)use($timezone):string{try{return(new DateTimeImmutable((string)$v,new DateTimeZone('UTC')))->setTimezone(new DateTimeZone($timezone))->format('d/m/Y');}catch(Throwable){return(string)$v;}};
 $pages=[];$stream='';$pageNumber=0;
 $text=static function(float $x,float $y,string $s,float $size=8,bool $bold=false,bool $right=false)use(&$stream):void{$v=iconv('UTF-8','Windows-1252//TRANSLIT',$s);if($v===false)$v='';if($right)$x-=strlen($v)*$size*0.51;$v=str_replace(['\\','(',')',"\r","\n"],['\\\\','\\(','\\)',' ',' '],$v);$stream.='BT /'.($bold?'F2':'F1').' '.$size.' Tf 1 0 0 1 '.$x.' '.(842-$y).' Tm ('.$v.") Tj ET\n";};
 $line=static function($x,$y,$x2,$y2)use(&$stream):void{$stream.="0.65 G 0.4 w $x ".(842-$y)." m $x2 ".(842-$y2)." l S 0 G\n";};
 $rect=static function($x,$y,$w,$h)use(&$stream):void{$stream.="0.65 G 0.4 w $x ".(842-$y-$h)." $w $h re S 0 G\n";};
 $header=static function(bool $continued=false)use(&$stream,&$pageNumber,$logoInfo,$company,$sale,$customer,$customerMeta,$text,$line,$date):float{
  $stream='';$pageNumber++;$text(24,36,'INVOICE',14,true);
  if($logoInfo){$w=90;$h=min(55,$w*$logoInfo[1]/$logoInfo[0]);$stream.="q $w 0 0 $h 477 ".(842-42-$h)." cm /Logo Do Q\n";}
  $text(24,62,(string)($company['company_name']??'SP-Manager'),8,true);$y=74;
  $outletAddress=trim((string)($company['outlet_address']??''));
  $addressLines=$outletAddress!==''?explode("\n",wordwrap(str_replace(["\r\n","\r"],"\n",$outletAddress),65,"\n",true)):[trim(($company['building_number']??'').' '.($company['street_name']??'')),(string)($company['additional_street_name']??''),trim(($company['postal_code']??'').' '.($company['city']??'')),(string)($company['state']??'')];
  if(count($addressLines)>12)throw new InvalidArgumentException('Outlet invoice address is too long.');
  foreach($addressLines as $a)if(trim($a)!==''){$text(24,$y,$a);$y+=11;}
  foreach(['phone_number'=>'Phone: ','email'=>'Email: '] as $key=>$label)if(!empty($company[$key])){$text(24,$y,$label.$company[$key]);$y+=11;}
  $rule=max(139,$y+9);$line(24,$rule,571,$rule);$by=$rule+21;$text(24,$by,'Bill to',8,true);$text(24,$by+15,(string)($customer['name']??'Walk-in customer'),8,true);$cy=$by+29;
  foreach(['phone'=>'Phone: ','email'=>'Email: '] as $key=>$label)if(!empty($customer[$key])){$text(24,$cy,$label.$customer[$key]);$cy+=12;}
  $vehicle=(string)($customer['vehicle_number']??$customerMeta['vehicleNumber']??$customerMeta['vehicle_number']??'');if($vehicle!==''){$text(24,$cy,'Vehicle No.: '.$vehicle);$cy+=12;}
  $text(571,$by,'Invoice No. '.(string)$sale['sale_no'],8,false,true);$text(571,$by+12,'Date: '.$date($sale['sale_date']),8,false,true);$text(571,$by+24,'Due date: '.$date($sale['due_date']??$sale['sale_date']),8,false,true);$text(571,$by+36,'Payment status: '.(string)($sale['payment_status']??'UNPAID'),8,false,true);
  if($continued)$text(24,$cy+10,'Continued',8,true);return max($by+65,$cy+18)+($continued?14:0);
 };
 $xs=[24,50,285,339,415,480,571];$table=static function(float $y)use($text,$rect,$line,$xs):float{$rect(24,$y,547,17);foreach(array_slice($xs,1,-1) as $x)$line($x,$y,$x,$y+17);foreach(['#','Item','Quantity','Unit price','Discount','Total'] as $i=>$label)$text($xs[$i]+4,$y+11,$label,7,true);return$y+17;};
 $finish=static function()use(&$pages,&$stream,&$pageNumber,$text):void{$text(567,792,'Page '.$pageNumber,7,false,true);$pages[]=$stream;};
 $y=$table($header());
 foreach($items as $n=>$item){$details=explode("\n",wordwrap((string)$item['product_name'],47,"\n",true));if(!empty($item['warranty_enabled']))$details[]='Warranty '.(int)$item['warranty_years'].' Year';if(!empty($item['maintenance_enabled']))$details[]='Free Maintenance '.(int)$item['maintenance_count'].' x';$height=max(24,count($details)*11+9);if($height>430)throw new InvalidArgumentException('Invoice item description is too long.');if($y+$height>735){$finish();$y=$table($header(true));}
  $rect(24,$y,547,$height);foreach(array_slice($xs,1,-1) as $x)$line($x,$y,$x,$y+$height);$text(28,$y+12,(string)($n+1),7.5);foreach($details as $i=>$d)$text(54,$y+12+$i*11,$d,7.5);
  $text(335,$y+12,rtrim(rtrim(number_format((float)$item['quantity'],3,'.',''),'0'),'.'),7.5,false,true);$text(411,$y+12,number_format((float)$item['unit_price'],2),7.5,false,true);$text(476,$y+12,$money($item['discount']??0),7.5,false,true);$text(567,$y+12,$money($item['line_total']),7.5,false,true);$y+=$height;
 }
 if($y+110+count($payments)*13>748){$finish();$y=$header(true);}$y+=17;
 foreach(['discount'=>'Discount','tax'=>'Tax'] as $key=>$label)if(!empty($sale[$key])){$text(390,$y,$label);$text(567,$y,$money($sale[$key]),8,false,true);$y+=13;}
 $rect(390,$y-9,181,19);$text(395,$y+3,'Total',8,true);$text(567,$y+3,$money($sale['total']),8,true,true);$y+=29;$text(390,$y,'Payment breakdown:',8,true);$y+=15;
 foreach($payments as $payment){if($y>720){$finish();$y=$header(true);$text(390,$y,'Payment breakdown (continued):',8,true);$y+=15;}$text(390,$y,'Payment ('.substr((string)($payment['payment_type_name']??'Payment'),0,22).')',8);$text(567,$y,$money($payment['amount']),8,false,true);$y+=13;}
 if($y>715){$finish();$y=$header(true);}$text(390,$y,'Paid amount:',8);$text(567,$y,$money($paid),8,false,true);$y+=13;$text(390,$y,'Amount due:',8);$text(567,$y,$money(max(0,(float)$sale['total']-$paid)),8,false,true);$finish();
 $objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>',3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',4=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];$next=5;$logoId=0;
 if($logoInfo){$logoId=$next++;$objects[$logoId]='<< /Type /XObject /Subtype /Image /Width '.$logoInfo[0].' /Height '.$logoInfo[1].' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '.strlen($logo).">>\nstream\n".$logo."\nendstream";}
 $kids=[];foreach($pages as $content){$pid=$next++;$sid=$next++;$kids[]="$pid 0 R";$objects[$pid]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>'.($logoId?' /XObject << /Logo '.$logoId.' 0 R >>':'').' >> /Contents '.$sid.' 0 R >>';$objects[$sid]='<< /Length '.strlen($content).">>\nstream\n".$content.'endstream';}
 $objects[2]='<< /Type /Pages /Kids ['.implode(' ',$kids).'] /Count '.count($pages).' >>';ksort($objects);$pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";$offsets=[];foreach($objects as $id=>$object){$offsets[$id]=strlen($pdf);$pdf.="$id 0 obj\n$object\nendobj\n";}$xref=strlen($pdf);$pdf.="xref\n0 $next\n0000000000 65535 f \n";for($i=1;$i<$next;$i++)$pdf.=sprintf("%010d 00000 n \n",$offsets[$i]);return$pdf."trailer << /Size $next /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
}
