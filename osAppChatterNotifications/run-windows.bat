@echo off
REM ==============================================================================
REM Chatter Notifications Desktop App - Windows Run Script
REM ==============================================================================

echo ==========================================
echo Chatter Notifications Desktop App
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [31mX Node.js is not installed![0m
    echo.
    echo Please install Node.js 22.x from: https://nodejs.org/
    echo Minimum version: v22.0.0
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [31mX npm is not installed![0m
    echo.
    echo npm should come with Node.js installation
    pause
    exit /b 1
)

REM Get and display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo [32m✓ Node.js version: %NODE_VERSION%[0m
echo [32m✓ npm version: %NPM_VERSION%[0m
echo.

REM Check Node.js major version
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION:~1%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% LSS 22 (
    echo [33mWARNING: Node.js version is too old![0m
    echo.
    echo Current version: %NODE_VERSION%
    echo Required version: v22.0.0 or higher
    echo.
    echo Please upgrade Node.js: https://nodejs.org/
    echo.
    set /p CONTINUE="Do you want to continue anyway? (y/N): "
    if /i not "%CONTINUE%"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
) else (
    echo [32m✓ Node.js version check passed (v%NODE_MAJOR%.x >= v22.0.0)[0m
    echo.
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [33m📦 Installing dependencies...[0m
    echo This may take a minute...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [31mX Failed to install dependencies[0m
        pause
        exit /b 1
    )
    echo.
    echo [32m✓ Dependencies installed successfully![0m
    echo.
) else (
    echo [32m✓ Dependencies already installed[0m
    echo.
)

REM Verify Electron is installed
if not exist "node_modules\electron\" (
    echo [33m⚠ Electron not found. Installing...[0m
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [31mX Failed to install Electron[0m
        pause
        exit /b 1
    )
    echo [32m✓ Electron installed[0m
    echo.
)

REM Start the application
echo [36m🚀 Starting Chatter Notifications Desktop App...[0m
echo.
echo Server: https://osnotificationscenter.onrender.com
echo.
echo If the app window doesn't open, check the error messages above.
echo Press Ctrl+C to stop the application
echo ==========================================
echo.

call npm start

REM Check if app exited with error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [31mX Application exited with error code: %ERRORLEVEL%[0m
    echo.
    echo Common fixes:
    echo 1. Delete node_modules folder and run this script again
    echo 2. Make sure all files are present: main.js, index.html, package.json
    echo 3. Check if antivirus is blocking Electron
    echo.
    pause
    exit /b %ERRORLEVEL%
)
