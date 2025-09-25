# Production Deployment Script for ParalegalAI
# Multi-Instance ChromaDB Setup

param(
    [string]$Action = "deploy",
    [string]$Environment = "production"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
    Magenta = "Magenta"
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

function Write-Critical {
    param([string]$Message)
    Write-Host "[CRITICAL] $Message" -ForegroundColor $Colors.Magenta
}

# Check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        $dockerComposeVersion = docker-compose --version
        Write-Success "Docker and Docker Compose are installed"
    }
    catch {
        Write-Error "Docker or Docker Compose is not installed. Please install Docker Desktop first."
        return $false
    }
    
    # Check if .env.production exists
    if (!(Test-Path ".env.production")) {
        Write-Warning ".env.production file not found. Creating from template..."
        if (Test-Path "env.production.example") {
            Copy-Item "env.production.example" ".env.production"
            Write-Critical "IMPORTANT: Please update .env.production with your actual values before deploying!"
            Write-Critical "Required values: GEMINI_API_KEY, JWT_SECRET, SIG_KEY, SIG_SALT, CORS_ORIGINS"
            return $false
        } else {
            Write-Error "env.production.example template not found!"
            return $false
        }
    }
    
    # Check SSL certificates
    if (!(Test-Path "ssl/cert.pem") -or !(Test-Path "ssl/key.pem")) {
        Write-Warning "SSL certificates not found in ssl/ directory"
        Write-Status "Creating self-signed certificates for development..."
        New-Item -ItemType Directory -Path "ssl" -Force | Out-Null
        
        # Generate self-signed certificate (for development only)
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Self-signed SSL certificates created"
            Write-Warning "For production, replace with real SSL certificates!"
        } else {
            Write-Error "Failed to create SSL certificates"
            return $false
        }
    }
    
    return $true
}

# Generate secure secrets
function New-SecureSecrets {
    Write-Status "Generating secure secrets..."
    
    # Generate JWT secret
    $jwtSecret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Generate signature key
    $sigKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Generate salt
    $salt = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Generate database password
    $dbPassword = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
    
    # Generate Redis password
    $redisPassword = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
    
    Write-Success "Secure secrets generated"
    Write-Warning "Please update .env.production with these values:"
    Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor $Colors.White
    Write-Host "SIG_KEY=$sigKey" -ForegroundColor $Colors.White
    Write-Host "SIG_SALT=$salt" -ForegroundColor $Colors.White
    Write-Host "POSTGRES_PASSWORD=$dbPassword" -ForegroundColor $Colors.White
    Write-Host "REDIS_PASSWORD=$redisPassword" -ForegroundColor $Colors.White
}

# Deploy to production
function Start-ProductionDeployment {
    Write-Status "Starting production deployment..."
    
    # Stop existing containers
    Write-Status "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down
    
    # Build and start services
    Write-Status "Building and starting production services..."
    docker-compose -f docker-compose.production.yml up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production deployment started successfully"
    } else {
        Write-Error "Production deployment failed"
        return $false
    }
    
    # Wait for services to be ready
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 60
    
    # Test services
    Test-ProductionServices
    
    return $true
}

# Test production services
function Test-ProductionServices {
    Write-Status "Testing production services..."
    
    $services = @(
        @{Name="ChromaDB Node 1"; Url="http://localhost:8001/"},
        @{Name="ChromaDB Node 2"; Url="http://localhost:8002/"},
        @{Name="ChromaDB Node 3"; Url="http://localhost:8003/"},
        @{Name="Load Balancer"; Url="http://localhost:8000/"},
        @{Name="ParalegalAI"; Url="http://localhost:3001/api/ping"}
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "$($service.Name): ✅"
            } else {
                Write-Warning "$($service.Name): ⚠️ (Status: $($response.StatusCode))"
            }
        }
        catch {
            Write-Error "$($service.Name): ❌"
        }
    }
}

# Show production status
function Show-ProductionStatus {
    Write-Status "Production Environment Status:"
    Write-Host ""
    Write-Host "ChromaDB Cluster:" -ForegroundColor $Colors.White
    Write-Host "  - Node 1 (Legal Cases): http://localhost:8001" -ForegroundColor $Colors.White
    Write-Host "  - Node 2 (Contracts):   http://localhost:8002" -ForegroundColor $Colors.White
    Write-Host "  - Node 3 (Statutes):    http://localhost:8003" -ForegroundColor $Colors.White
    Write-Host "  - Load Balancer:        http://localhost:8000" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "ParalegalAI:" -ForegroundColor $Colors.White
    Write-Host "  - Web Interface:        http://localhost:3001" -ForegroundColor $Colors.White
    Write-Host "  - API Health:           http://localhost:3001/api/ping" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Database & Cache:" -ForegroundColor $Colors.White
    Write-Host "  - PostgreSQL:           localhost:5432" -ForegroundColor $Colors.White
    Write-Host "  - Redis:                localhost:6379" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Docker Containers:" -ForegroundColor $Colors.White
    docker-compose -f docker-compose.production.yml ps
}

# Backup production data
function Backup-ProductionData {
    Write-Status "Creating production backup..."
    
    $backupDir = "backups/$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Backup ChromaDB data
    Write-Status "Backing up ChromaDB data..."
    docker run --rm -v "${PWD}/chromadb-data-1:/source" -v "${PWD}/$backupDir:/backup" alpine tar czf /backup/chromadb-data-1.tar.gz -C /source .
    docker run --rm -v "${PWD}/chromadb-data-2:/source" -v "${PWD}/$backupDir:/backup" alpine tar czf /backup/chromadb-data-2.tar.gz -C /source .
    docker run --rm -v "${PWD}/chromadb-data-3:/source" -v "${PWD}/$backupDir:/backup" alpine tar czf /backup/chromadb-data-3.tar.gz -C /source .
    
    # Backup PostgreSQL data
    Write-Status "Backing up PostgreSQL data..."
    docker exec postgres-prod pg_dump -U paralegal_user paralegal_ai > "$backupDir/postgres_backup.sql"
    
    Write-Success "Backup created in $backupDir"
}

# Main deployment function
function Start-Deployment {
    Write-Host "==========================================" -ForegroundColor $Colors.Blue
    Write-Host "  ParalegalAI Production Deployment" -ForegroundColor $Colors.Blue
    Write-Host "==========================================" -ForegroundColor $Colors.Blue
    Write-Host ""
    
    if (!(Test-Prerequisites)) {
        Write-Error "Prerequisites check failed. Please fix the issues above."
        exit 1
    }
    
    # Generate secrets if needed
    $envContent = Get-Content ".env.production" -Raw
    if ($envContent -match "your-.*-here") {
        Write-Warning "Default values detected in .env.production"
        New-SecureSecrets
        Write-Critical "Please update .env.production with the generated secrets and run the deployment again."
        exit 1
    }
    
    # Create backup before deployment
    Backup-ProductionData
    
    # Deploy
    if (Start-ProductionDeployment) {
        Write-Host ""
        Write-Success "Production deployment completed successfully!"
        Write-Host ""
        Show-ProductionStatus
        
        Write-Host ""
        Write-Status "Next steps:"
        Write-Host "1. Update your DNS to point to this server" -ForegroundColor $Colors.White
        Write-Host "2. Replace self-signed SSL certificates with real ones" -ForegroundColor $Colors.White
        Write-Host "3. Configure your firewall and security groups" -ForegroundColor $Colors.White
        Write-Host "4. Set up monitoring and alerting" -ForegroundColor $Colors.White
        Write-Host "5. Test the application thoroughly" -ForegroundColor $Colors.White
    } else {
        Write-Error "Production deployment failed!"
        exit 1
    }
}

# Handle different actions
switch ($Action.ToLower()) {
    "deploy" {
        Start-Deployment
    }
    "start" {
        Write-Status "Starting production services..."
        docker-compose -f docker-compose.production.yml up -d
        Write-Success "Production services started"
    }
    "stop" {
        Write-Status "Stopping production services..."
        docker-compose -f docker-compose.production.yml down
        Write-Success "Production services stopped"
    }
    "restart" {
        Write-Status "Restarting production services..."
        docker-compose -f docker-compose.production.yml down
        docker-compose -f docker-compose.production.yml up -d
        Write-Success "Production services restarted"
    }
    "status" {
        Show-ProductionStatus
    }
    "test" {
        Test-ProductionServices
    }
    "backup" {
        Backup-ProductionData
    }
    "logs" {
        docker-compose -f docker-compose.production.yml logs -f
    }
    "secrets" {
        New-SecureSecrets
    }
    default {
        Write-Host "Usage: .\deploy-production.ps1 [-Action <action>]" -ForegroundColor $Colors.Yellow
        Write-Host ""
        Write-Host "Available actions:" -ForegroundColor $Colors.White
        Write-Host "  deploy   - Full production deployment (default)" -ForegroundColor $Colors.White
        Write-Host "  start    - Start production services" -ForegroundColor $Colors.White
        Write-Host "  stop     - Stop production services" -ForegroundColor $Colors.White
        Write-Host "  restart  - Restart production services" -ForegroundColor $Colors.White
        Write-Host "  status   - Show production status" -ForegroundColor $Colors.White
        Write-Host "  test     - Test production services" -ForegroundColor $Colors.White
        Write-Host "  backup   - Create production backup" -ForegroundColor $Colors.White
        Write-Host "  logs     - View production logs" -ForegroundColor $Colors.White
        Write-Host "  secrets  - Generate secure secrets" -ForegroundColor $Colors.White
    }
}
