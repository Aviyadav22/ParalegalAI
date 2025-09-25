# Multi-Instance ChromaDB Setup Script for ParalegalAI (PowerShell)
# This script sets up a multi-instance ChromaDB environment on Windows

param(
    [string]$Action = "setup"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Check if Docker is installed
function Test-Docker {
    try {
        $dockerVersion = docker --version
        $dockerComposeVersion = docker-compose --version
        Write-Success "Docker and Docker Compose are installed"
        Write-Host "  Docker: $dockerVersion" -ForegroundColor $Colors.White
        Write-Host "  Docker Compose: $dockerComposeVersion" -ForegroundColor $Colors.White
        return $true
    }
    catch {
        Write-Error "Docker or Docker Compose is not installed. Please install Docker Desktop first."
        return $false
    }
}

# Create necessary directories
function New-ChromaDBDirectories {
    Write-Status "Creating ChromaDB data directories..."
    
    $directories = @("chromadb-data-1", "chromadb-data-2", "chromadb-data-3")
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor $Colors.White
        } else {
            Write-Host "  Exists: $dir" -ForegroundColor $Colors.White
        }
    }
    
    Write-Success "ChromaDB data directories created"
}

# Setup environment file
function Set-EnvironmentFile {
    Write-Status "Setting up environment configuration..."
    
    if (!(Test-Path ".env")) {
        if (Test-Path "env.multi-instance.example") {
            Copy-Item "env.multi-instance.example" ".env"
            Write-Success "Environment file created from example"
        } else {
            Write-Warning "Environment example file not found. Please create .env manually."
        }
    } else {
        Write-Warning ".env file already exists. Please update it manually if needed."
    }
}

# Start ChromaDB instances
function Start-ChromaDBInstances {
    Write-Status "Starting ChromaDB instances..."
    
    # Start ChromaDB nodes
    docker-compose -f docker-compose.multi-instance.yml up -d chromadb-1 chromadb-2 chromadb-3
    
    Write-Status "Waiting for ChromaDB instances to be ready..."
    Start-Sleep -Seconds 30
    
    # Check if instances are running
    for ($i = 1; $i -le 3; $i++) {
        $port = 8000 + $i
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "ChromaDB Node $i is running on port $port"
            }
        }
        catch {
            Write-Error "ChromaDB Node $i is not responding on port $port"
        }
    }
}

# Start load balancer
function Start-LoadBalancer {
    Write-Status "Starting Nginx load balancer..."
    
    docker-compose -f docker-compose.multi-instance.yml up -d chromadb-lb
    
    Start-Sleep -Seconds 10
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Load balancer is running on port 8000"
        }
    }
    catch {
        Write-Error "Load balancer is not responding on port 8000"
    }
}

# Start ParalegalAI
function Start-ParalegalAI {
    Write-Status "Starting ParalegalAI with multi-instance ChromaDB..."
    
    docker-compose -f docker-compose.multi-instance.yml up -d paralegal-ai
    
    Write-Status "Waiting for ParalegalAI to be ready..."
    Start-Sleep -Seconds 30
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/ping" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "ParalegalAI is running on port 3001"
        }
    }
    catch {
        Write-Error "ParalegalAI is not responding on port 3001"
    }
}

# Test the setup
function Test-Setup {
    Write-Status "Testing multi-instance ChromaDB setup..."
    
    # Test individual nodes
    for ($i = 1; $i -le 3; $i++) {
        $port = 8000 + $i
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "ChromaDB Node $i`: ✅"
            }
        }
        catch {
            Write-Error "ChromaDB Node $i`: ❌"
        }
    }
    
    # Test load balancer
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Load Balancer: ✅"
        }
    }
    catch {
        Write-Error "Load Balancer: ❌"
    }
    
    # Test ParalegalAI
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/ping" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "ParalegalAI: ✅"
        }
    }
    catch {
        Write-Error "ParalegalAI: ❌"
    }
}

# Show status
function Show-Status {
    Write-Status "Multi-Instance ChromaDB Status:"
    Write-Host ""
    Write-Host "ChromaDB Nodes:" -ForegroundColor $Colors.White
    Write-Host "  - Node 1 (Legal Cases): http://localhost:8001" -ForegroundColor $Colors.White
    Write-Host "  - Node 2 (Contracts):   http://localhost:8002" -ForegroundColor $Colors.White
    Write-Host "  - Node 3 (Statutes):    http://localhost:8003" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Load Balancer:" -ForegroundColor $Colors.White
    Write-Host "  - Nginx LB:             http://localhost:8000" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "ParalegalAI:" -ForegroundColor $Colors.White
    Write-Host "  - Web Interface:        http://localhost:3001" -ForegroundColor $Colors.White
    Write-Host "  - API Health:           http://localhost:3001/api/ping" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Docker Containers:" -ForegroundColor $Colors.White
    docker-compose -f docker-compose.multi-instance.yml ps
}

# Main setup function
function Start-Setup {
    Write-Host "==========================================" -ForegroundColor $Colors.Blue
    Write-Host "  Multi-Instance ChromaDB Setup Script" -ForegroundColor $Colors.Blue
    Write-Host "==========================================" -ForegroundColor $Colors.Blue
    Write-Host ""
    
    if (!(Test-Docker)) {
        exit 1
    }
    
    New-ChromaDBDirectories
    Set-EnvironmentFile
    Start-ChromaDBInstances
    Start-LoadBalancer
    Start-ParalegalAI
    Test-Setup
    
    Write-Host ""
    Write-Success "Multi-Instance ChromaDB setup completed!"
    Write-Host ""
    Show-Status
    
    Write-Host ""
    Write-Status "Next steps:"
    Write-Host "1. Open http://localhost:3001 in your browser" -ForegroundColor $Colors.White
    Write-Host "2. Complete the ParalegalAI setup wizard" -ForegroundColor $Colors.White
    Write-Host "3. Configure your LLM provider (Gemini is pre-configured)" -ForegroundColor $Colors.White
    Write-Host "4. Start uploading legal documents!" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Status "To stop the services, run:"
    Write-Host "  .\setup-multi-chromadb.ps1 -Action stop" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Status "To view logs, run:"
    Write-Host "  .\setup-multi-chromadb.ps1 -Action logs" -ForegroundColor $Colors.White
}

# Handle different actions
switch ($Action.ToLower()) {
    "start" {
        Start-ChromaDBInstances
        Start-LoadBalancer
        Start-ParalegalAI
    }
    "stop" {
        Write-Status "Stopping all services..."
        docker-compose -f docker-compose.multi-instance.yml down
        Write-Success "All services stopped"
    }
    "restart" {
        Write-Status "Restarting all services..."
        docker-compose -f docker-compose.multi-instance.yml down
        docker-compose -f docker-compose.multi-instance.yml up -d
        Write-Success "All services restarted"
    }
    "status" {
        Show-Status
    }
    "test" {
        Test-Setup
    }
    "logs" {
        docker-compose -f docker-compose.multi-instance.yml logs -f
    }
    "setup" {
        Start-Setup
    }
    default {
        Write-Host "Usage: .\setup-multi-chromadb.ps1 [-Action <action>]" -ForegroundColor $Colors.Yellow
        Write-Host ""
        Write-Host "Available actions:" -ForegroundColor $Colors.White
        Write-Host "  setup   - Full setup (default)" -ForegroundColor $Colors.White
        Write-Host "  start   - Start all services" -ForegroundColor $Colors.White
        Write-Host "  stop    - Stop all services" -ForegroundColor $Colors.White
        Write-Host "  restart - Restart all services" -ForegroundColor $Colors.White
        Write-Host "  status  - Show status" -ForegroundColor $Colors.White
        Write-Host "  test    - Test setup" -ForegroundColor $Colors.White
        Write-Host "  logs    - View logs" -ForegroundColor $Colors.White
    }
}

