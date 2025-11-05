@echo off
echo ========================================
echo    Ollama Installation for Windows
echo ========================================
echo.

echo Step 1: Downloading Ollama installer...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.exe' -OutFile 'ollama-installer.exe'}"

if not exist "ollama-installer.exe" (
    echo ERROR: Failed to download Ollama installer
    echo Please download manually from: https://ollama.com
    pause
    exit /b 1
)

echo Step 2: Installing Ollama...
ollama-installer.exe /S

echo Step 3: Waiting for installation...
timeout /t 5 /nobreak >nul

echo Step 4: Starting Ollama service...
start /b ollama serve

echo Step 5: Waiting for service to start...
timeout /t 10 /nobreak >nul

echo Step 6: Installing AI model (llama3.2:3b)...
ollama pull llama3.2:3b

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo Ollama is now running on: http://localhost:11434
echo You can now use ChatAI in your application!
echo.
echo To start Ollama manually in the future, run:
echo   ollama serve
echo.
echo To install more models, run:
echo   ollama pull ^<model-name^>
echo.
pause

