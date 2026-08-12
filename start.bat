@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title ⚡ WORKPRO BOT — WashiX 2026

:: ══════════════════════════════════════════════
::   WORKPRO LAUNCHER v2.0 — WashiX & Vapark
:: ══════════════════════════════════════════════

set "RESTART_DELAY=5"
set "RUN_CMD="
set "RUN_LABEL="

:BOOT
cls
color 05

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║    ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗██████╗ ██████╗      ║
echo  ║    ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔══██╗██╔══██╗     ║
echo  ║    ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ██████╔╝██████╔╝     ║
echo  ║    ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ██╔═══╝ ██╔══██╗     ║
echo  ║    ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗██║     ██║  ██║     ║
echo  ║     ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝     ║
echo  ║                                                              ║
echo  ║   ⚡  OWNER LAUNCH SYSTEM 2026  ⚡   by WashiX ^& Vapark    ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: ── SYSTEM CHECKS ──────────────────────────────────────────────────
color 0B
echo  ┌─────────────────────────────────────────┐
echo  │           SYSTEM DIAGNOSTICS            │
echo  └─────────────────────────────────────────┘

:: Node.js check
color 0E
echo.
echo  ▶  ตรวจสอบ Node.js...
timeout /t 1 /nobreak >nul
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ╔══════════════════════════════════════════╗
    echo  ║  ✖  ERROR: ไม่พบ Node.js!               ║
    echo  ║     กรุณาติดตั้งจาก nodejs.org ก่อน     ║
    echo  ╚══════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do set NODE_VER=%%v
color 0A
echo  ✔  Node.js !NODE_VER! พร้อมใช้งาน

:: .env check
color 0E
echo  ▶  ตรวจสอบ .env...
timeout /t 1 /nobreak >nul
if not exist ".env" (
    color 0C
    echo.
    echo  ╔══════════════════════════════════════════╗
    echo  ║  ✖  WARNING: ไม่พบไฟล์ .env!            ║
    echo  ║     กรุณาสร้างไฟล์ .env ก่อนเปิด BOT    ║
    echo  ╚══════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
color 0A
echo  ✔  .env พร้อม

:: node_modules check
color 0E
echo  ▶  ตรวจสอบ node_modules...
timeout /t 1 /nobreak >nul
if not exist "node_modules\" (
    color 0C
    echo  ⚠  ไม่พบ node_modules — กำลังติดตั้ง...
    color 0F
    npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo  ╔══════════════════════════════════════════╗
        echo  ║  ✖  ERROR: npm install ล้มเหลว!         ║
        echo  ╚══════════════════════════════════════════╝
        echo.
        pause
        exit /b 1
    )
)
color 0A
echo  ✔  node_modules พร้อม
echo.

:: ── MODE SELECTION ──────────────────────────────────────────────────
color 0D
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                   เลือกโหมดการเปิด BOT                      ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║   [ 1 ]  node index.js    —  Classic / Direct               ║
echo  ║   [ 2 ]  npm start        —  Production Mode                ║
echo  ║   [ 3 ]  npm run dev      —  Dev Mode (nodemon/hot-reload)   ║
echo  ║   [ 4 ]  ดูข้อมูล BOT     —  Info / Debug Check             ║
echo  ║   [ 0 ]  ออก              —  Exit                           ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
color 0F
set /p "CHOICE=  ▶  เลือก [0-4]: "

if "%CHOICE%"=="1" (
    set "RUN_CMD=node index.js"
    set "RUN_LABEL=node index.js — Classic Mode"
    goto :CONFIRM_RUN
)
if "%CHOICE%"=="2" (
    set "RUN_CMD=npm start"
    set "RUN_LABEL=npm start — Production Mode"
    goto :CONFIRM_RUN
)
if "%CHOICE%"=="3" (
    set "RUN_CMD=npm run dev"
    set "RUN_LABEL=npm run dev — Dev / Hot-Reload Mode"
    goto :CONFIRM_RUN
)
if "%CHOICE%"=="4" goto :DEBUG_INFO
if "%CHOICE%"=="0" goto :EXIT_NOW

color 0C
echo  ✖  กรุณาเลือก 0-4 เท่านั้น
timeout /t 2 /nobreak >nul
goto :BOOT

:: ── DEBUG INFO ───────────────────────────────────────────────────────
:DEBUG_INFO
cls
color 0B
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                      BOT DEBUG INFO                         ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
color 0F
echo   📁  Working Directory : %CD%
echo   🟢  Node.js Version   : !NODE_VER!
echo.
color 0E
echo   🔍  ตรวจสอบ package.json...
if exist "package.json" (
    color 0A
    echo   ✔  พบ package.json
    echo.
    color 0F
    type package.json
) else (
    color 0C
    echo   ✖  ไม่พบ package.json!
)
echo.
color 0E
echo   🔍  ไฟล์ในโปรเจกต์:
echo.
color 0F
dir /b /a-d 2>nul
echo.
color 0D
echo  ─────────────────────────────────────────────────────────────
pause
goto :BOOT

:: ── CONFIRM RUN ──────────────────────────────────────────────────────
:CONFIRM_RUN
cls
color 0D
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    ยืนยันการเปิด BOT                         ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║   📌  คำสั่งที่เลือก : !RUN_LABEL!
echo  ║   📅  วันที่         : %date%
echo  ║   🕐  เวลา           : %time:~0,8%
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
color 0F
set /p "CONFIRM=  ▶  ยืนยันเปิด BOT? (Y/N): "
if /i "!CONFIRM!"=="Y" goto :RUN_BOT
if /i "!CONFIRM!"=="N" goto :BOOT
goto :CONFIRM_RUN

:: ── RUN LOOP ─────────────────────────────────────────────────────────
:RUN_BOT
cls
color 0D
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║  ✅  WORKPRO BOT กำลังทำงาน — WashiX 2026                  ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  📌  Mode   : !RUN_LABEL!
echo  ║  📅  Start  : %date%  %time:~0,8%                    ║
echo  ║  🛑  กด Ctrl+C เพื่อหยุด BOT                               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
color 0F

!RUN_CMD!

:: ── CRASH HANDLER ────────────────────────────────────────────────────
:CRASHED
cls
color 0C
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║  ⚠️   BOT หยุดทำงาน / พบข้อผิดพลาด!                       ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  🕐  เวลาที่หยุด : %time:~0,8%                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
color 0E
echo  ┌─────────────────────────────────────────────────────────────┐
echo  │              รอการอนุมัติจาก Owner                          │
echo  └─────────────────────────────────────────────────────────────┘
echo.
color 0F
echo   [ R ]  Restart BOT ทันที
echo   [ W ]  รอ 5 วิ แล้ว Restart อัตโนมัติ
echo   [ M ]  กลับเมนูหลัก (เปลี่ยนโหมด)
echo   [ L ]  ดู Log / Debug Info
echo   [ X ]  ปิดโปรแกรม
echo.
set /p "CRASH_CHOICE=  ▶  เลือก [R/W/M/L/X]: "

if /i "!CRASH_CHOICE!"=="R" (
    echo.
    color 0A
    echo  ▶  กำลัง Restart BOT...
    timeout /t 1 /nobreak >nul
    goto :RUN_BOT
)
if /i "!CRASH_CHOICE!"=="W" (
    echo.
    color 0E
    echo  ▶  รอ !RESTART_DELAY! วินาที แล้วจะ Restart อัตโนมัติ...
    timeout /t !RESTART_DELAY! /nobreak
    goto :RUN_BOT
)
if /i "!CRASH_CHOICE!"=="M" goto :BOOT
if /i "!CRASH_CHOICE!"=="L" (
    cls
    color 0B
    echo.
    echo  ╔══════════════════════════════════════════════════════════════╗
    echo  ║                    CRASH DEBUG INFO                         ║
    echo  ╚══════════════════════════════════════════════════════════════╝
    echo.
    color 0F
    echo   📁  Directory  : %CD%
    echo   🟢  Node       : !NODE_VER!
    echo   📌  Last CMD   : !RUN_CMD!
    echo   🕐  Crash Time : %time:~0,8%  —  %date%
    echo.
    if exist "error.log" (
        color 0C
        echo  ── error.log ──────────────────────────────
        type error.log
        echo  ───────────────────────────────────────────
    ) else (
        color 0E
        echo  ℹ️  ไม่พบ error.log ในโปรเจกต์
    )
    echo.
    pause
    goto :CRASHED
)
if /i "!CRASH_CHOICE!"=="X" goto :EXIT_NOW

color 0C
echo  ✖  กรุณาเลือก R / W / M / L / X
timeout /t 2 /nobreak >nul
goto :CRASHED

:: ── EXIT ─────────────────────────────────────────────────────────────
:EXIT_NOW
cls
color 05
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║        ขอบคุณที่ใช้งาน WORKPRO BOT — WashiX 2026           ║
echo  ║                    See you next time! ⚡                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
timeout /t 2 /nobreak >nul
exit /b 0
