@echo off
echo Installing Ollama for Windows...
echo.

REM Check if Ollama is already installed
ollama --version >nul 2>&1
if %errorlevel% == 0 (
    echo Ollama is already installed.
    ollama --version
    goto :install_models
)

echo Downloading Ollama installer...
powershell -Command "& {Invoke-WebRequest -Uri 'https://ollama.com/download/windows' -OutFile 'ollama-windows-amd64.exe'}"

echo Installing Ollama...
ollama-windows-amd64.exe /S

echo Waiting for installation to complete...
timeout /t 10 /nobreak >nul

echo Cleaning up installer...
del ollama-windows-amd64.exe

:install_models
echo.
echo Installing AI models...
echo This may take several minutes depending on your internet connection.
echo.

echo Installing Llama 3.2 3B (recommended for most users)...
ollama pull llama3.2:3b

echo Installing Llama 3.2 1B (faster, smaller model)...
ollama pull llama3.2:1b

echo Installing Mistral 7B (good alternative)...
ollama pull mistral:7b

echo.
echo Installation complete!
echo.
echo Available models:
ollama list

echo.
echo Starting Ollama service...
ollama serve

echo.
echo Ollama is now running on http://localhost:11434
echo You can now use Lobe Chat in your application!
echo.
pause

