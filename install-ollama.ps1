# Ollama Installation Script for Windows
Write-Host "Installing Ollama for Windows..." -ForegroundColor Green

# Check if Ollama is already installed
try {
    $ollamaVersion = ollama --version 2>$null
    if ($ollamaVersion) {
        Write-Host "Ollama is already installed: $ollamaVersion" -ForegroundColor Yellow
        Write-Host "Starting Ollama service..." -ForegroundColor Green
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Write-Host "Ollama service started on http://localhost:11434" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "Ollama not found, proceeding with installation..." -ForegroundColor Yellow
}

# Download Ollama installer
$installerUrl = "https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.exe"
$installerPath = "$env:TEMP\ollama-installer.exe"

Write-Host "Downloading Ollama installer..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "Download completed: $installerPath" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Ollama installer. Please download manually from: https://ollama.com" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Install Ollama
Write-Host "Installing Ollama..." -ForegroundColor Green
try {
    Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
    Write-Host "Ollama installation completed" -ForegroundColor Green
} catch {
    Write-Host "Failed to install Ollama. Please run the installer manually: $installerPath" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Clean up installer
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

# Add Ollama to PATH (if not already there)
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama"
if (Test-Path $ollamaPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$ollamaPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$ollamaPath", "User")
        Write-Host "Added Ollama to PATH" -ForegroundColor Green
    }
}

# Start Ollama service
Write-Host "Starting Ollama service..." -ForegroundColor Green
try {
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Test if Ollama is running
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "Ollama service is running on http://localhost:11434" -ForegroundColor Green
    } else {
        Write-Host "Ollama service started but may not be ready yet. Please wait a moment." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to start Ollama service automatically. Please run 'ollama serve' manually." -ForegroundColor Yellow
}

# Install recommended models
Write-Host "Installing recommended AI models..." -ForegroundColor Green
$models = @("llama3.2:3b", "llama3.2:1b")

foreach ($model in $models) {
    Write-Host "Installing $model..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "ollama" -ArgumentList "pull", $model -Wait -WindowStyle Hidden
        Write-Host "$model installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install $model. You can install it later with: ollama pull $model" -ForegroundColor Yellow
    }
}

Write-Host "`nInstallation completed!" -ForegroundColor Green
Write-Host "Ollama is now available at: http://localhost:11434" -ForegroundColor Green
Write-Host "You can now use ChatAI in your application!" -ForegroundColor Green
Write-Host "`nTo start Ollama manually, run: ollama serve" -ForegroundColor Cyan
Write-Host "To install more models, run: ollama pull <model-name>" -ForegroundColor Cyan

Read-Host "Press Enter to continue"

