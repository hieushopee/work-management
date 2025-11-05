@echo off
echo ========================================
echo    Starting Ollama with Docker
echo ========================================
echo.

echo Step 1: Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Step 2: Waiting for Docker to start...
timeout /t 30 /nobreak >nul

echo Step 3: Running Ollama container...
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

echo Step 4: Waiting for Ollama to start...
timeout /t 10 /nobreak >nul

echo Step 5: Installing AI model (llama3.2:3b)...
docker exec -it ollama ollama pull llama3.2:3b

echo.
echo ========================================
echo    Ollama is now running!
echo ========================================
echo.
echo Ollama is available at: http://localhost:11434
echo You can now use ChatAI in your application!
echo.
echo To stop Ollama: docker stop ollama
echo To start Ollama: docker start ollama
echo.
pause

