@echo off
echo ========================================
echo    Ollama Direct Installation
echo ========================================
echo.

echo Step 1: Opening Ollama download page...
echo Please download the Windows installer from the browser that just opened.
echo.
echo Step 2: After downloading, please run the installer manually.
echo.
echo Step 3: Once installed, come back here and press any key to continue...
pause

echo Step 4: Adding Ollama to PATH...
setx PATH "%PATH%;%LOCALAPPDATA%\Programs\Ollama" /M

echo Step 5: Starting Ollama service...
ollama serve

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

