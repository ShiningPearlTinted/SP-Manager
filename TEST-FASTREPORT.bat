@echo off
setlocal
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "OUT=%TEMP%\SP-Manager-FastReport-Test.pdf"
echo ================================================
echo SP-Manager REAL FastReport Engine Test v1.2.0
echo ================================================
echo.
"%PS_EXE%" -NoProfile -Command "try{$s=Invoke-RestMethod 'http://127.0.0.1:18765/status' -TimeoutSec 3; $s|Format-List}catch{Write-Host ('Agent ERROR: '+$_.Exception.Message);exit 1}"
if errorlevel 1 goto END
"%PS_EXE%" -NoProfile -Command "$body=@{paper='A4';pageW=210;pageH=297;roll=$false;rollHeight=100;margins=@{top=5;left=5;right=5;bottom=5};columns=2;labelW=105;labelH=148.5;rowGap=0;colGap=0;showName=$true;showPrice=$true;showCode=$true;showBarcode=$true;taxInclusive=$true;borders=$true;barcodeType='EAN13';nameSize=16;priceSize=12;barcodeHeight=42;copies=1;products=@(@{id=1;name='FASTREPORT TEST';unit='pcs';code='TEST001';barcode='9551234567890';price=12.50})}|ConvertTo-Json -Depth 8 -Compress | Set-Content -Encoding UTF8 '%TEMP%\fr-body.json'; $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:18765/price-tags/pdf' -Method POST -ContentType 'application/json; charset=utf-8' -InFile '%TEMP%\fr-body.json' -TimeoutSec 30; [IO.File]::WriteAllBytes('%TEMP%\SP-Manager-FastReport-Test.pdf', $r.Content); Write-Host ('HTTP '+$r.StatusCode+' PDF bytes '+(Get-Item '%TEMP%\SP-Manager-FastReport-Test.pdf').Length)"
if errorlevel 1 (
 echo.
 echo [FAIL] FastReport PDF generation failed.
 echo Check %%ProgramData%%\SP-Manager\fastreport-console.log
 goto END
)
if exist "%OUT%" echo.
echo.
echo [PASS] REAL FastReport PDF generated:
echo %OUT%
start "" "%OUT%"
:END
pause
