@echo off
setlocal EnableExtensions EnableDelayedExpansion

net session >nul 2>&1
if not "%errorlevel%"=="0" goto :NOTADMIN

set "SCRIPT_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "& { param([string]$scriptDir) " ^
  "  $ErrorActionPreference='Stop';" ^
  "  $roots=@();" ^
  "  if($env:ProgramFiles){ $roots += (Join-Path $env:ProgramFiles 'TikTok LIVE Studio') }" ^
  "  if(${env:ProgramFiles(x86)}){ $roots += (Join-Path ${env:ProgramFiles(x86)} 'TikTok LIVE Studio') }" ^
  "  $roots = $roots | Where-Object { Test-Path $_ -PathType Container } | Select-Object -Unique;" ^
  "  if(-not $roots){ throw 'Could not find TikTok LIVE Studio install folder under Program Files.' }" ^
  "  $candidates=@();" ^
  "  foreach($r in $roots){ $candidates += Get-ChildItem -Path (Join-Path $r '*') -Directory -ErrorAction SilentlyContinue | ForEach-Object { " ^
  "    $v=$null; try{ $v=[version]$_.Name } catch { $v=$null };" ^
  "    [pscustomobject]@{ Dir=$_.FullName; Version=$v; Name=$_.Name } } }" ^
  "  $candidates = $candidates | Where-Object { $_.Version -ne $null } | Sort-Object Version -Descending;" ^
  "  if(-not $candidates){ throw 'No version folders found (expected something like 1.28.0).' }" ^
  "$verDir = $candidates[0].Dir;" ^
  "  $preloadDir = Join-Path $verDir 'resources\\app\\electron\\preload';" ^
  "  $servicePreload = Join-Path $preloadDir 'servicePreload.js';" ^
  "  $liveCenterPreload = Join-Path $preloadDir 'liveCenterContainerPreload.js';" ^
  "  $webviewPreload = Join-Path $preloadDir 'webviewContainerPreload.js';" ^
  "  if(-not (Test-Path $servicePreload -PathType Leaf)){ throw ('servicePreload.js not found at: ' + $servicePreload) }" ^
  "  if(-not $scriptDir){ throw 'Could not determine installer directory.' }" ^
  "  $bridgeSrc = Join-Path $scriptDir 'bridge.js';" ^
  "  if(-not (Test-Path $bridgeSrc -PathType Leaf)){ throw ('bridge.js not found next to installer at: ' + $bridgeSrc) }" ^
  "  $bannerSrc = Join-Path $scriptDir 'banner1.png';" ^
  "  $starSabersSrc = Join-Path $scriptDir 'star-sabers.png';" ^
  "  if(-not (Test-Path $bannerSrc -PathType Leaf)){ throw ('banner1.png not found next to installer at: ' + $bannerSrc) }" ^
  "  if(-not (Test-Path $starSabersSrc -PathType Leaf)){ throw ('star-sabers.png not found next to installer at: ' + $starSabersSrc) }" ^
  "  $reqBridgeLine = \"require('./bridge.js');\";" ^
  "  function Inject-Req([string]$Path, [string]$Tag, [string]$ReqLine){ if(-not (Test-Path $Path -PathType Leaf)){ Write-Host ('  SKIP ' + $Tag + ': file not found at ' + $Path) -ForegroundColor Yellow; return; }; $c = Get-Content -LiteralPath $Path -Raw -Encoding UTF8; if($c -notmatch [regex]::Escape($ReqLine)){ Set-Content -LiteralPath $Path -Value ($ReqLine + \"`r`n\" + $c) -Encoding UTF8; Write-Host ('  OK ' + $Tag + ': injected') -ForegroundColor Green; } else { Write-Host ('  OK ' + $Tag + ': already injected') -ForegroundColor Green; } }" ^
  "  Inject-Req $servicePreload 'servicePreload.js' $reqBridgeLine;" ^
  "  Inject-Req $liveCenterPreload 'liveCenterContainerPreload.js' $reqBridgeLine;" ^
  "  Inject-Req $webviewPreload 'webviewContainerPreload.js' $reqBridgeLine;" ^
  "  Copy-Item -LiteralPath $bridgeSrc -Destination (Join-Path $preloadDir 'bridge.js') -Force;" ^
  "  Copy-Item -LiteralPath $bannerSrc -Destination (Join-Path $preloadDir 'banner1.png') -Force;" ^
  "  Copy-Item -LiteralPath $starSabersSrc -Destination (Join-Path $preloadDir 'star-sabers.png') -Force;" ^
  "  Write-Host 'Bridge files and Splash screen injected.' -ForegroundColor Green;" ^
  "  Write-Host ('Installed into: ' + $preloadDir);" ^
  "  exit 0" ^
"} '%SCRIPT_DIR%'"

if not "%errorlevel%"=="0" goto :ERR
echo.
echo Installed successfully.
echo - Restart TikTok LIVE Studio.
echo.
echo Press any key to close this window...
pause >nul
goto :EOF

:NOTADMIN
echo.
echo ERROR: This installer must be run as Administrator.
echo.
echo Manual install steps:
echo.
echo 1) Close TikTok LIVE Studio completely.
echo.
echo 2) Open Windows Notepad as Administrator.
echo.
echo 3) Find the latest TikTok LIVE Studio version folder, normally:
echo.
echo    C:\Program Files\TikTok LIVE Studio\{version}\resources\app\electron\preload
echo.
echo 4) Open each of these files and add this as the FIRST line:
echo.
echo    servicePreload.js
echo    require('./bridge.js');
echo.
echo    liveCenterContainerPreload.js
echo    require('./bridge.js');
echo.
echo    webviewContainerPreload.js
echo    require('./bridge.js');
echo.
echo 5) Copy these three files into the same preload folder:
echo.
echo    bridge.js
echo    banner1.png
echo    star-sabers.png
echo.
echo 6) Restart TikTok LIVE Studio.
echo.
echo Press any key to close this window...
pause >nul
exit /b 1


:ERR
echo.
echo Install failed.
echo If TikTok LIVE Studio is installed in a non-standard location, run this installer as admin then update the paths in the script.
echo.
echo Press any key to close this window...
pause >nul
exit /b 1
