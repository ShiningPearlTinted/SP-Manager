$ErrorActionPreference='Stop'
$Port=18767
$HostName='127.0.0.1'
$Base=Split-Path -Parent $MyInvocation.MyCommand.Path
$FrDir=Join-Path $Base 'fastreport'
$Frx=Join-Path $FrDir 'ProductsPriceTags.frx'

# Load the actual FastReport assemblies shipped with the SP-Manager FastReport package.
Add-Type -Path (Join-Path $FrDir 'FastReport.dll')
try { Add-Type -Path (Join-Path $FrDir 'FastReport.Bars.dll') } catch {}
try { Add-Type -Path (Join-Path $FrDir 'FastReport.SQLite.dll') } catch {}

function Send-Bytes($stream,[int]$status,[string]$contentType,[byte[]]$bytes,[string]$disposition='') {
  if($status -eq 200){$reason='OK'}elseif($status -eq 204){$reason='No Content'}else{$reason='Error'}
  $extra=''
  if($disposition){$extra="Content-Disposition: $disposition`r`n"}
  $hdr="HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: Content-Type`r`nAccess-Control-Allow-Methods: GET,POST,OPTIONS`r`n$extra`r`n"
  $hb=[Text.Encoding]::ASCII.GetBytes($hdr);$stream.Write($hb,0,$hb.Length);if($bytes.Length -gt 0){$stream.Write($bytes,0,$bytes.Length)};$stream.Flush()
}
function Send-Json($stream,[int]$status,$obj){$body=($obj|ConvertTo-Json -Compress -Depth 12);Send-Bytes $stream $status 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($body))}
function Read-Request($client){
  $stream=$client.GetStream();$buf=New-Object byte[] 8192;$ms=New-Object IO.MemoryStream
  do{$n=$stream.Read($buf,0,$buf.Length);if($n -le 0){break};$ms.Write($buf,0,$n);$raw=[Text.Encoding]::ASCII.GetString($ms.ToArray());$headerEnd=$raw.IndexOf("`r`n`r`n");}while($headerEnd -lt 0 -and $ms.Length -lt 4MB)
  if($headerEnd -lt 0){throw 'Invalid HTTP request'}
  $head=$raw.Substring(0,$headerEnd);$lines=$head -split "`r`n";$parts=$lines[0].Split(' ');$method=$parts[0];$path=$parts[1];$cl=0;foreach($l in $lines){if($l -match '^(?i)Content-Length:\s*(\d+)'){$cl=[int]$Matches[1]}}
  $headerBytes=$headerEnd+4;$bodyBytes=$ms.ToArray();$need=$headerBytes+$cl
  while($bodyBytes.Length -lt $need){$n=$stream.Read($buf,0,$buf.Length);if($n -le 0){break};$ms.Write($buf,0,$n);$bodyBytes=$ms.ToArray()}
  if($cl -gt 0){$body=[Text.Encoding]::UTF8.GetString($bodyBytes,$headerBytes,$cl)}else{$body=''}
  return @{stream=$stream;method=$method;path=$path;body=$body}
}
function MmToPx([double]$mm){ return [single]($mm*96.0/25.4) }
function Configure-Barcode($barcode,[string]$type){
  $map=@{
    'EAN13'='EAN13'; 'EAN8'='EAN8'; 'UPC A'='UPC-A'; 'UPC E0'='UPC-E0'; 'UPC E1'='UPC-E1';
    'CODE 39'='Code39'; 'CODE 128'='Code128'; 'CODE 93'='Code93'; 'Interleaved 2 of 5 (ITF)'='2/5 Interleaved'; 'CODABAR'='Codabar'
  }
  $sym=$map[$type]; if(!$sym){$sym='EAN13'}
  $barcode.SymbologyName=$sym
  $barcode.ShowText=$true
  $barcode.AutoSize=$false
}
function Build-Report([object]$b){
  if(!(Test-Path $Frx)){throw "FastReport template not found: $Frx"}
  $ds=New-Object System.Data.DataSet('ProductsDataSet')
  $dt=New-Object System.Data.DataTable('Product')
  [void]$dt.Columns.Add('Id',[object]);[void]$dt.Columns.Add('Name',[string]);[void]$dt.Columns.Add('MeasurementUnit',[string]);[void]$dt.Columns.Add('Code',[string]);[void]$dt.Columns.Add('Barcode',[string]);[void]$dt.Columns.Add('Price',[decimal])
  foreach($p in @($b.products)){
    $r=$dt.NewRow(); if($null -eq $p.id){$r['Id']=0}else{$r['Id']=$p.id}; $r['Name']=[string]$p.name; $r['MeasurementUnit']=[string]$p.unit; $r['Code']=[string]$p.code; $r['Barcode']=[string]$p.barcode; $r['Price']=[decimal]([double]$p.price); [void]$dt.Rows.Add($r)
  }
  [void]$ds.Tables.Add($dt)
  # SP-Manager uses the supplied ProductsPriceTags.frx and an explicit RM price script.
  # Keep the FastReport process culture at Malaysia for all other locale-sensitive formatting.
  $culture=[System.Globalization.CultureInfo]::GetCultureInfo('ms-MY')
  [System.Threading.Thread]::CurrentThread.CurrentCulture=$culture
  [System.Threading.Thread]::CurrentThread.CurrentUICulture=$culture
  $report=New-Object FastReport.Report
  $report.Load($Frx)
  $report.RegisterData($ds,'ProductsDataSet',$true)
  $page=$report.FindObject('Page1')
  $band=$report.FindObject('Data1')
  $code=$report.FindObject('TextCode')
  $name=$report.FindObject('TextName')
  $price=$report.FindObject('TextPrice')
  $barcode=$report.FindObject('Barcode1')
  $roll=[bool]$b.roll
  if($roll){
    # The supplied price-tag template uses a 190mm band on a 210mm A4 page.
    # The 10mm side margins create the exact 190mm printable label width.
    $rollLeft=10.0; $rollRight=10.0
    $page.LeftMargin=[float]$rollLeft; $page.RightMargin=[float]$rollRight
    $page.TopMargin=[float]$b.margins.top; $page.BottomMargin=[float]$b.margins.bottom
  } else {
    $page.LeftMargin=[float]$b.margins.left;$page.RightMargin=[float]$b.margins.right;$page.TopMargin=[float]$b.margins.top;$page.BottomMargin=[float]$b.margins.bottom
  }
  # Roll-paper mode uses the supplied template's original DataBand as one full-width roll label:
  # 190mm (718.2px) wide x 62.5mm (236.25px) high, one label per row.
  # The page itself is unlimited vertically.
  $originalRollW=190.0
  $originalRollH=62.5
  # Roll mode keeps the A4 paper width in the layout; the template DataBand is
  # the 190mm-wide printable label. UI columns/label-size values are retained
  # for compatibility but do not override the original roll template geometry.
  if($roll){
    $effectiveCols=1
    $effectiveLabelW=$originalRollW
    $effectiveLabelH=$originalRollH
    $rows=[Math]::Max(1,[int]$b.products.Count)
    $effectivePageW=[double]$b.pageW
    $effectivePageH=([double]$rows*$originalRollH)+([double]([Math]::Max(0,$rows-1))*[double]$b.rowGap)+[double]$b.margins.top+[double]$b.margins.bottom
  } else {
    $effectiveCols=[Math]::Max(1,[int]$b.columns)
    $effectiveLabelW=[double]$b.labelW
    $effectiveLabelH=[double]$b.labelH
    $rows=0
    $effectivePageW=[double]$b.pageW
    $effectivePageH=[double]$b.pageH
  }
  if($roll -and $effectivePageH -lt $originalRollH){$effectivePageH=$originalRollH}
  $page.PaperWidth=[float]$effectivePageW
  $page.PaperHeight=[float]$effectivePageH
  $page.UnlimitedHeight=$roll
  $page.PrintOnRollPaper=$roll
  if($roll){$page.UnlimitedHeightValue=MmToPx($effectivePageH)}
  $band.Width=MmToPx($effectiveLabelW)
  $band.Height=MmToPx($effectiveLabelH+[double]$b.rowGap)
  $band.Columns.Count=$effectiveCols
  if($roll){$effectiveColGap=0}else{$effectiveColGap=[double]$b.colGap}
  $band.Columns.Width=MmToPx($effectiveLabelW+$effectiveColGap)
  $band.Columns.Layout=[FastReport.ColumnLayout]::AcrossThenDown
  $code.Visible=[bool]$b.showCode
  $name.Visible=[bool]$b.showName
  $price.Visible=[bool]$b.showPrice
  $barcode.Visible=[bool]$b.showBarcode
  $code.Width=MmToPx(5);$code.Height=$band.Height;$code.Left=0;$code.Top=0
  $name.Left=$code.Width;$name.Width=$band.Columns.Width-$code.Width;$name.Height=MmToPx(7.5);$name.Top=0
  $price.Left=$code.Width;$price.Width=$band.Columns.Width-$code.Width;$price.Height=MmToPx(12.5);$price.Top=$name.Height
  $name.Font=New-Object System.Drawing.Font('Arial',[float]$b.nameSize,[System.Drawing.FontStyle]::Regular)
  $price.Font=New-Object System.Drawing.Font('Arial',[float]$b.priceSize,[System.Drawing.FontStyle]::Bold)
  # Price is formatted by the template's OnPriceBeforePrint event as RM0.00.
  # Keep the original TextPrice format object intact; do not set UseLocale at runtime.
  $price.Text='[Product.Price]'
  $barcode.Width=MmToPx(34.06)
  $barcode.Height=MmToPx(20.0)
  $barcode.Top=MmToPx(32.5)
  $barcode.Left=($band.Columns.Width-$barcode.Width)/2+$code.Width
  if($roll){Configure-Barcode $barcode 'EAN13'}else{Configure-Barcode $barcode ([string]$b.barcodeType)}
  if(!$b.borders){$band.Border.Lines=[FastReport.BorderLines]::None}
  else{$band.Border.Lines=[FastReport.BorderLines]::All;$band.Border.Color=[System.Drawing.Color]::Gray}
  return $report
}
function Handle($req){
  $s=$req.stream
  try{
    if($req.method -eq 'OPTIONS'){Send-Bytes $s 204 'text/plain; charset=utf-8' ([byte[]]@());return}
    if($req.method -eq 'GET' -and ($req.path -eq '/' -or $req.path -eq '/status')){Send-Json $s 200 @{connected=$true;fastReport=$true;engine='FastReport .NET';version='2019.1.5';port=$Port;template='ProductsPriceTags.frx';templateSource='SP-Manager bundled ProductsPriceTags.frx';build='V9-SP-MANAGER-ORIGINAL-ROLL-RM-BARCODE'};return}
    if($req.method -eq 'POST' -and $req.path -eq '/price-tags/pdf'){
      $b=$req.body|ConvertFrom-Json
      $report=Build-Report $b
      [void]$report.Prepare()
      $export=New-Object FastReport.Export.Pdf.PDFExport
      $export.PrintScaling=$false;$export.AllowPrint=$true;$export.Producer='SP-Manager';$export.Title='SP-Manager Price Tags'
      $ms=New-Object IO.MemoryStream
      $report.Export($export,$ms)
      $bytes=$ms.ToArray();$ms.Dispose();$report.Dispose()
      Send-Bytes $s 200 'application/pdf' $bytes 'inline; filename="Price-Tags-FastReport.pdf"';return
    }
    Send-Json $s 404 @{ok=$false;error='Not found'}
  }catch{ $e=$_.Exception; $inner=''; if($e.InnerException){$inner=$e.InnerException.ToString()}; Send-Json $s 500 @{ok=$false;error=$e.Message;details=$_.ScriptStackTrace;inner=$inner;type=$e.GetType().FullName} }
}
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($HostName),$Port);$listener.Start()
Write-Host "SP-Manager FastReport Bridge listening on http://$HostName`:$Port"
while($true){$client=$listener.AcceptTcpClient();try{$req=Read-Request $client;Handle $req}catch{try{Send-Json $client.GetStream() 500 @{ok=$false;error=$_.Exception.Message}}catch{}}finally{$client.Close()}}
