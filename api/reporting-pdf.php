<?php
declare(strict_types=1);
// A4 landscape, bounded local data only; never fetch a logo URL on the server.
function rpPdf(array $report): string {
    $pageWidth=842;$pageHeight=595;$margin=30;$available=$pageWidth-2*$margin;
    $encode=static function(string $value): string {
        $value=preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u',' ',$value)??'';
        $encoded=@iconv('UTF-8','Windows-1252',$value);
        if($encoded===false)throw new ReportingError('This report contains characters outside the built-in PDF font. Use Print / Save PDF or Excel to preserve all characters.',422);
        $value=$encoded;
        return str_replace(['\\','(',')',"\r","\n"],['\\\\','\\(','\\)',' ',' '],$value);
    };
    $pages=[];$content='';$y=0;$cols=$report['columns'];$count=count($cols);$width=$available/max(1,$count);
    $normalWidths=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584]; $boldWidths=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
    $text=static function(float $x,float $top,string $value,int $size=8,bool $bold=false,bool $right=false)use(&$content,$pageHeight,$encode,$normalWidths,$boldWidths):void {if($right){$metrics=$bold?$boldWidths:$normalWidths;$units=0;foreach(str_split($value) as $char)$units+=$metrics[ord($char)-32]??556;$x-=$units*$size/1000;} $content.='BT /'.($bold?'F2':'F1').' '.$size.' Tf 0.12 0.15 0.2 rg '.sprintf('%.2F %.2F Td (%s) Tj ET' ,$x,$pageHeight-$top,$encode($value))."\n";};
    $line=static function(float $top)use(&$content,$margin,$pageWidth,$pageHeight):void {$content.='0.85 0.87 0.9 RG 0.4 w '.$margin.' '.($pageHeight-$top).' m '.($pageWidth-$margin).' '.($pageHeight-$top)." l S\n";};
    $clipped=false;
    $wrap=static function(string $value,int $chars)use(&$clipped):array {
        $plain=@iconv('UTF-8','Windows-1252',str_replace(["\r","\n"],[' ',' '],$value));
        if($plain===false)throw new ReportingError('This report contains characters outside the built-in PDF font. Use Print / Save PDF or Excel to preserve all characters.',422);
        $lines=explode("\n",wordwrap($plain,max(5,$chars),"\n",true));
        if(count($lines)>5){$lines=array_slice($lines,0,5);$lines[4]=substr($lines[4],0,max(1,$chars-3)).'...';$clipped=true;}
        return array_map(fn($line)=>iconv('Windows-1252','UTF-8',$line),$lines);
    };
    $header=static function()use(&$content,&$y,$report,$cols,$width,$margin,$pageHeight,$text,$line,$wrap,$available):void {
        $content='';$y=35;foreach($wrap((string)$report['company']['company_name'],95) as $part){$text($margin,$y,$part,14,true);$y+=17;}
        $address=implode(', ',array_filter(array_map(fn($k)=>(string)($report['company'][$k]??''),['building_number','street_name','postal_code','city','state'])));
        if($address!=='')foreach($wrap($address,175) as $part){$text($margin,$y,$part,8);$y+=14;}
        $text($margin,$y,$report['report']['category'].' - '.$report['report']['title'],12,true);$y+=17;
        $period=$report['report']['period']?$report['period']['start'].' to '.$report['period']['end']:'Current stock snapshot';
        foreach($wrap($report['outlet']['outlet_code'].' - '.$report['outlet']['outlet_name'].' | '.$period,170) as $part){$text($margin,$y,$part,8);$y+=15;}
        $text($margin,$y,'Generated '.$report['generated_at'].' | '.$report['row_count'].' rows',7);$y+=14;
        if(!empty($report['applied_filter_labels'])){$filter=implode(' | ',$report['applied_filter_labels']);foreach($wrap('Filters: '.$filter,145) as $part){$text($margin,$y,$part,7);$y+=10;}}
        $content.='0.94 0.95 0.97 rg '.$margin.' '.($pageHeight-$y-31).' '.$available." 35 re f\n";
        foreach($cols as $i=>$col)foreach(array_slice($wrap($col['label'],(int)($width/4.1)),0,3) as $n=>$label)$text($cols[$i]['type']==='text'?$margin+$i*$width+3:$margin+($i+1)*$width-3,$y+$n*9,$label,7,true,$cols[$i]['type']!=='text');
        $y+=35;$line($y-7);
    };
    $finish=static function()use(&$content,&$pages,$text,$pageHeight,$margin):void {$text($margin,$pageHeight-18,'SP-Manager Reporting | Page '.(count($pages)+1),7);$pages[]=$content;};
    $header();$all=$report['rows'];if($report['totals'])$all[]=['__totals'=>true,...$report['totals']];
    if(!$report['rows']){$text($margin,$y+10,'No records match the selected report filters.',9);$y+=25;}
    foreach($all as $row){$cells=[];$height=16;foreach($cols as $index=>$col){$value=$row[$col['key']]??null;if(isset($row['__totals'])&&$index===0)$value='TOTAL';elseif($value===null)$value='-';elseif($col['type']==='money')$value=number_format((float)$value,2,'.',',');$parts=$wrap((string)$value,(int)($width/3.7));$cells[]=$parts;$height=max($height,8+count($parts)*9);}
        if($y+$height>$pageHeight-42){$finish();$header();}
        if(isset($row['__totals']))$line($y-8);
        foreach($cells as $i=>$parts)foreach($parts as $n=>$part)$text($cols[$i]['type']==='text'?$margin+$i*$width+3:$margin+($i+1)*$width-3,$y+$n*9,$part,7,isset($row['__totals']),$cols[$i]['type']!=='text');
        $y+=$height;$line($y-7);
    }
    if($clipped)$report['warnings'][]='Some long cell values are abbreviated with ellipses in this PDF. Excel contains the complete recorded text.';
    if($report['warnings']){
        if($y+45>$pageHeight-42){$finish();$header();}$y+=8;$text($margin,$y,'Report notes',8,true);$y+=13;
        foreach($report['warnings'] as $warning)foreach($wrap('- '.$warning,155) as $part){if($y+12>$pageHeight-42){$finish();$header();}$text($margin,$y,$part,7);$y+=11;}
    }$finish();
    $objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>',3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',4=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];$next=5;$kids=[];
    foreach($pages as $stream){$p=$next++;$s=$next++;$kids[]="$p 0 R";$objects[$p]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$s.' 0 R >>';$objects[$s]='<< /Length '.strlen($stream).">>\nstream\n".$stream.'endstream';}
    $objects[2]='<< /Type /Pages /Kids ['.implode(' ',$kids).'] /Count '.count($pages).' >>';ksort($objects);$pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";$offset=[];
    foreach($objects as $id=>$object){$offset[$id]=strlen($pdf);$pdf.="$id 0 obj\n$object\nendobj\n";}$xref=strlen($pdf);$pdf.="xref\n0 $next\n0000000000 65535 f \n";for($i=1;$i<$next;$i++)$pdf.=sprintf("%010d 00000 n \n",$offset[$i]);return $pdf."trailer << /Size $next /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
}
