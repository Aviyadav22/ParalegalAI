# Docker build script for ParalegalAI (PowerShell version)
# This script builds and optionally runs the Docker container

param(
    [switch]$Run,
    [switch]$Clean,
    [string]$Name = "paralegal-ai",
    [string]$Image = "paralegal-ai",
    [switch]$Help
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\docker-build.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Run          Run container after building"
    Write-Host "  -Clean        Clean build (no cache)"
    Write-Host "  -Name NAME    Set container name (default: paralegal-ai)"
    Write-Host "  -Image NAME   Set image name (default: paralegal-ai)"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-build.ps1                 # Build image only"
    Write-Host "  .\docker-build.ps1 -Run            # Build and run container"
    Write-Host "  .\docker-build.ps1 -Clean -Run     # Clean build and run"
}

# Show help if requested
if ($Help) {
    Show-Usage
    exit 0
}

Write-Status "Starting Docker build for ParalegalAI..."

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

# Stop and remove existing container if it exists
$existingContainer = docker ps -a --format "table {{.Names}}" | Select-String "^$Name$"
if ($existingContainer) {
    Write-Warning "Stopping and removing existing container: $Name"
    docker stop $Name 2>$null
    docker rm $Name 2>$null
}

# Remove existing image if clean build
if ($Clean) {
    Write-Warning "Removing existing image: $Image"
    docker rmi $Image 2>$null
}

# Build the Docker image
Write-Status "Building Docker image: $Image"
if ($Clean) {
    docker build --no-cache -t $Image .
} else {
    docker build -t $Image .
}

if ($LASTEXITCODE -eq 0) {
    Write-Status "Docker image built successfully: $Image"
} else {
    Write-Error "Docker build failed"
    exit 1
}

# Run container if requested
if ($Run) {
    Write-Status "Starting container: $Name"
    
    # Check if .env file exists
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from template..."
        if (Test-Path ".env.docker") {
            Copy-Item ".env.docker" ".env"
            Write-Warning "Please edit .env file with your configuration before running the container."
        } else {
            Write-Error ".env.docker template not found. Please create .env file manually."
            exit 1
        }
    }
    
    # Create volume if it doesn't exist
    $existingVolume = docker volume ls --format "table {{.Name}}" | Select-String "^paralegal_data$"
    if (-not $existingVolume) {
        Write-Status "Creating Docker volume: paralegal_data"
        docker volume create paralegal_data
    }
    
    # Run the container
    docker run -d `
        --name $Name `
        -p 3001:3001 `
        -p 8888:8888 `
        --env-file .env `
        -v paralegal_data:/app/server/storage `
        --restart unless-stopped `
        $Image
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Container started successfully!"
        Write-Status "Application is available at: http://localhost:3001"
        Write-Status "Collector service is available at: http://localhost:8888"
        Write-Status ""
        Write-Status "To view logs: docker logs $Name"
        Write-Status "To stop: docker stop $Name"
    } else {
        Write-Error "Failed to start container"
        exit 1
    }
} else {
    Write-Status "Build completed. To run the container:"
    Write-Status "  docker run -d --name $Name -p 3001:3001 -p 8888:8888 --env-file .env -v paralegal_data:/app/server/storage $Image"
}

