@echo off
title DC-Tuner Studio
set "APPURL=https://qt4ycxmmr1hjq2m8023edrby.macaly.dev/"
call :open "%ProgramFiles%\Google\Chrome\Application\chrome.exe" && exit /b
call :open "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" && exit /b
call :open "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" && exit /b
call :open "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" && exit /b
start "" "%APPURL%"
exit /b

:open
if not exist %1 exit /b 1
start "" %1 --app="%APPURL%" --window-size=1400,900
exit /b 0
