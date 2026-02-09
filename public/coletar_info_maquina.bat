@echo off
setlocal EnableDelayedExpansion

set "serial="
set "hostname="
set "mac_lan="
set "mac_wifi="

for /f "tokens=2 delims==" %%A in ('wmic bios get serialnumber /value ^| find "="') do set "serial=%%A"
for /f "delims=" %%A in ('hostname') do set "hostname=%%A"

for /f "skip=1 tokens=1-3 delims=," %%A in ('wmic nic where "NetEnabled=true" get MACAddress^,Name /format:csv') do (
  set "mac=%%B"
  set "name=%%C"
  if defined mac (
    echo !name! | findstr /i "wi-fi wireless wlan" >nul && (
      if not defined mac_wifi set "mac_wifi=!mac!"
    )
    echo !name! | findstr /i "ethernet lan" >nul && (
      if not defined mac_lan set "mac_lan=!mac!"
    )
  )
)

if not defined mac_lan (
  for /f "skip=1 tokens=1-4 delims=," %%A in ('getmac /v /fo csv') do (
    echo %%A | findstr /i "ethernet lan" >nul && (
      if not defined mac_lan set "mac_lan=%%C"
    )
  )
)

if not defined mac_wifi (
  for /f "skip=1 tokens=1-4 delims=," %%A in ('getmac /v /fo csv') do (
    echo %%A | findstr /i "wi-fi wireless wlan" >nul && (
      if not defined mac_wifi set "mac_wifi=%%C"
    )
  )
)

set "output=%~dp0machine_info.txt"
(
  echo serial=%serial%
  echo hostname=%hostname%
  echo mac_lan=%mac_lan%
  echo mac_wifi=%mac_wifi%
) > "%output%"

echo Arquivo gerado em: %output%
endlocal
