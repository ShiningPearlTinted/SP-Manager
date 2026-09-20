$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$fr='http://127.0.0.1:18767'
$agent='http://127.0.0.1:18765'
Write-Host '[0] Starting FastReport bridge in background...'
$launcher=Join-Path $root 'start-fastreport-hidden.vbs'
Start-Process -FilePath 'wscript.exe' -ArgumentList @($launcher) -WindowStyle Hidden
$ready=$false
for($i=1;$i -le 60;$i++){
  try { $s=Invoke-RestMethod "$fr/status" -TimeoutSec 1; $ready=$true; break } catch { Start-Sleep -Milliseconds 500 }
}
if(-not $ready){
  Write-Host '    FAIL: FastReport bridge did not start.'
  $elog=Join-Path $root 'fastreport-startup-error.log'
  if(Test-Path $elog){ Write-Host '    Startup error log:'; Get-Content $elog -Tail 30 }
  exit 1
}
Write-Host '[1] Checking FastReport bridge...'
try { $s=Invoke-RestMethod "$fr/status" -TimeoutSec 5; Write-Host "    OK - $($s.engine) / $($s.template)" } catch { Write-Host "    FAIL: $($_.Exception.Message)"; exit 1 }
$payload=[ordered]@{
 paper='A4'; pageW=210; pageH=297; roll=$true; rollHeight=250
 margins=[ordered]@{top=0;left=0;right=0;bottom=0}; columns=2; labelW=50; labelH=35; rowGap=0; colGap=0
 showName=$true; showPrice=$true; showCode=$true; showBarcode=$true; taxInclusive=$true; borders=$true
 barcodeType='EAN13'; nameSize=16; priceSize=16; barcodeHeight=20; copies=1
 products=@(
  [ordered]@{id=1;name='TEST PRODUCT 1';unit='pcs';code='SP001';barcode='4006381333931';price=180.00},
  [ordered]@{id=2;name='TEST PRODUCT 2';unit='pcs';code='SP002';barcode='4012345678901';price=280.00}
 )
}
$json=$payload | ConvertTo-Json -Depth 12 -Compress
$tmp=Join-Path $env:TEMP 'SP-Manager-FastReport-Test.pdf'
try { Remove-Item $tmp -Force -ErrorAction SilentlyContinue } catch {}
function Post-Pdf($url,$body){
 $req=[Net.HttpWebRequest][Net.WebRequest]::Create($url);$req.Method='POST';$req.ContentType='application/json; charset=utf-8';$req.Timeout=120000;$req.ReadWriteTimeout=120000
 $bytes=[Text.Encoding]::UTF8.GetBytes($body);$req.ContentLength=$bytes.Length
 $st=$req.GetRequestStream();$st.Write($bytes,0,$bytes.Length);$st.Close()
 try {$resp=$req.GetResponse()} catch {$r=$_.Exception.Response;if($r){$reader=New-Object IO.StreamReader($r.GetResponseStream());$msg=$reader.ReadToEnd();throw "HTTP $([int]$r.StatusCode): $msg"};throw}
 $ms=New-Object IO.MemoryStream;$resp.GetResponseStream().CopyTo($ms);$resp.Close();return $ms.ToArray()
}
Write-Host '[2] Sending valid JSON to REAL FastReport...'
try {
 $pdf=Post-Pdf "$fr/price-tags/pdf" $json
 [IO.File]::WriteAllBytes($tmp,$pdf)
 Write-Host "    PDF bytes: $($pdf.Length)"
 if($pdf.Length -lt 1000){throw 'PDF output is unexpectedly small'}
 Write-Host "    PASS - $tmp"
 Start-Process $tmp
} catch { Write-Host "    FAIL: $($_.Exception.Message)"; exit 1 }
Write-Host '[3] Testing Local Agent FastReport proxy...'
try {
 $as=Invoke-RestMethod "$agent/status" -TimeoutSec 5
 Write-Host "    Agent: $($as.version), Proxy: $($as.fastReportProxy)"
 $pdf2=Post-Pdf "$agent/price-tags/pdf" $json
 Write-Host "    Proxy PDF bytes: $($pdf2.Length)"
 if($pdf2.Length -lt 1000){throw 'Proxy PDF output is unexpectedly small'}
 Write-Host '    PASS - Local Agent proxy works.'
} catch { Write-Host "    FAIL: $($_.Exception.Message)"; exit 1 }
Write-Host ''
Write-Host 'ALL FASTREPORT TESTS PASSED.'
