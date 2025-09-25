# Multi-Instance ChromaDB Setup for ParalegalAI

This guide explains how to set up and use a multi-instance ChromaDB configuration for ParalegalAI, providing better performance, scalability, and fault tolerance for legal document processing.

## 🏗️ Architecture Overview

The multi-instance setup consists of:

- **3 ChromaDB Nodes**: Each handling different types of legal documents
  - Node 1: Legal Cases and Precedents
  - Node 2: Contracts and Agreements  
  - Node 3: Statutes and Regulations
- **Nginx Load Balancer**: Distributes requests across nodes
- **ParalegalAI Server**: Updated to work with multiple ChromaDB instances
- **Collector Service**: Processes documents and distributes them across nodes

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available
- 20GB free disk space

### Automated Setup

#### Linux/macOS
```bash
chmod +x setup-multi-chromadb.sh
./setup-multi-chromadb.sh
```

#### Windows
```powershell
.\setup-multi-chromadb.ps1
```

### Manual Setup

1. **Create data directories**:
   ```bash
   mkdir -p chromadb-data-1 chromadb-data-2 chromadb-data-3
   ```

2. **Copy environment file**:
   ```bash
   cp env.multi-instance.example .env
   ```

3. **Start services**:
   ```bash
   docker-compose -f docker-compose.multi-instance.yml up -d
   ```

4. **Verify setup**:
   ```bash
   curl http://localhost:3001/api/ping
   ```

## 📁 File Structure

```
ParalegalAI/
├── docker-compose.multi-instance.yml    # Multi-instance Docker setup
├── nginx-chromadb.conf                  # Nginx load balancer config
├── env.multi-instance.example           # Environment configuration
├── setup-multi-chromadb.sh             # Linux/macOS setup script
├── setup-multi-chromadb.ps1            # Windows setup script
├── server/utils/vectorDbProviders/
│   └── chroma-multi/
│       └── index.js                     # MultiChroma provider
└── chromadb-data-*/                     # ChromaDB data directories
```

## ⚙️ Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Vector Database
VECTOR_DB=chroma-multi
CHROMA_ENDPOINTS=http://chromadb-1:8000,http://chromadb-2:8000,http://chromadb-3:8000
CHROMA_STRATEGY=round-robin

# Load Balancing Strategies
# - round-robin: Distribute requests evenly
# - random: Random node selection
# - least-connections: Use node with fewest connections

# Performance Tuning
CHROMA_MAX_CONNECTIONS=10
CHROMA_CONNECTION_TIMEOUT=30000
CHROMA_REQUEST_TIMEOUT=60000
```

### Load Balancing Strategies

1. **Round-Robin** (Default): Distributes requests evenly across all nodes
2. **Random**: Randomly selects a node for each request
3. **Least-Connections**: Routes to the node with the fewest active connections

## 🔧 MultiChroma Provider Features

### Distributed Search
- Searches across all ChromaDB nodes in parallel
- Combines and ranks results from all nodes
- Returns top N most relevant results

### Document Distribution
- Uses round-robin strategy to distribute documents
- Each document is stored on a single node for efficiency
- Automatic failover to healthy nodes

### Health Monitoring
- Continuous health checks for all nodes
- Automatic removal of unhealthy nodes
- Graceful degradation when nodes fail

## 📊 Performance Benefits

### Scalability
- **3x Storage Capacity**: Distribute documents across multiple nodes
- **Parallel Processing**: Search multiple nodes simultaneously
- **Load Distribution**: Balance workload across instances

### Reliability
- **Fault Tolerance**: Continue operating if one node fails
- **Data Redundancy**: Optional replication across nodes
- **Health Monitoring**: Automatic detection of node issues

### Performance
- **Faster Searches**: Parallel query execution
- **Better Throughput**: Distributed document processing
- **Reduced Latency**: Load balancing and connection pooling

## 🛠️ Management Commands

### Start Services
```bash
# All services
docker-compose -f docker-compose.multi-instance.yml up -d

# Individual services
docker-compose -f docker-compose.multi-instance.yml up -d chromadb-1
docker-compose -f docker-compose.multi-instance.yml up -d chromadb-2
docker-compose -f docker-compose.multi-instance.yml up -d chromadb-3
```

### Stop Services
```bash
docker-compose -f docker-compose.multi-instance.yml down
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.multi-instance.yml logs -f

# Specific service
docker-compose -f docker-compose.multi-instance.yml logs -f chromadb-1
```

### Check Status
```bash
# Using setup script
./setup-multi-chromadb.sh status

# Manual check
curl http://localhost:8001/  # Node 1
curl http://localhost:8002/  # Node 2
curl http://localhost:8003/  # Node 3
curl http://localhost:8000/  # Load Balancer
curl http://localhost:3001/api/ping  # ParalegalAI
```

## 🔍 Monitoring and Debugging

### Health Checks
Each ChromaDB node includes health checks:
- **Endpoint**: `http://localhost:800X/`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts

### Logging
Enable detailed logging by setting:
```bash
CHROMA_DEBUG_LOGGING=true
CHROMA_LOG_LEVEL=debug
```

### Metrics
Monitor performance with:
```bash
CHROMA_ENABLE_METRICS=true
CHROMA_METRICS_INTERVAL=60
```

## 🚨 Troubleshooting

### Common Issues

#### ChromaDB Node Not Responding
```bash
# Check if container is running
docker ps | grep chromadb

# Check logs
docker-compose -f docker-compose.multi-instance.yml logs chromadb-1

# Restart specific node
docker-compose -f docker-compose.multi-instance.yml restart chromadb-1
```

#### Load Balancer Issues
```bash
# Check Nginx configuration
docker-compose -f docker-compose.multi-instance.yml exec chromadb-lb nginx -t

# Reload Nginx
docker-compose -f docker-compose.multi-instance.yml exec chromadb-lb nginx -s reload
```

#### ParalegalAI Connection Issues
```bash
# Check environment variables
docker-compose -f docker-compose.multi-instance.yml exec paralegal-ai env | grep CHROMA

# Test ChromaDB connectivity
docker-compose -f docker-compose.multi-instance.yml exec paralegal-ai curl http://chromadb-1:8000/
```

### Performance Issues

#### High Memory Usage
- Reduce `CHROMA_MAX_CONNECTIONS`
- Increase `CHROMA_CONNECTION_TIMEOUT`
- Monitor node resource usage

#### Slow Searches
- Check if all nodes are healthy
- Verify load balancer configuration
- Consider adding more nodes

#### Document Processing Delays
- Check collector service logs
- Verify document distribution strategy
- Monitor node storage capacity

## 🔄 Backup and Recovery

### Backup Data
```bash
# Backup all ChromaDB data
tar -czf chromadb-backup-$(date +%Y%m%d).tar.gz chromadb-data-*/

# Backup specific node
tar -czf chromadb-node1-backup.tar.gz chromadb-data-1/
```

### Restore Data
```bash
# Stop services
docker-compose -f docker-compose.multi-instance.yml down

# Restore data
tar -xzf chromadb-backup-20240101.tar.gz

# Start services
docker-compose -f docker-compose.multi-instance.yml up -d
```

## 📈 Scaling

### Adding More Nodes

1. **Update docker-compose.multi-instance.yml**:
   ```yaml
   chromadb-4:
     image: chromadb/chroma:latest
     container_name: chromadb-4
     ports:
       - "8004:8000"
     # ... rest of configuration
   ```

2. **Update nginx-chromadb.conf**:
   ```nginx
   upstream chromadb_backend {
       server chromadb-1:8000;
       server chromadb-2:8000;
       server chromadb-3:8000;
       server chromadb-4:8000;  # Add new node
   }
   ```

3. **Update environment variables**:
   ```bash
   CHROMA_ENDPOINTS=http://chromadb-1:8000,http://chromadb-2:8000,http://chromadb-3:8000,http://chromadb-4:8000
   ```

### Horizontal Scaling
- Add more ChromaDB nodes as needed
- Update load balancer configuration
- Adjust connection pooling settings

## 🔒 Security Considerations

### Network Security
- Use internal Docker networks
- Restrict external access to ChromaDB nodes
- Enable authentication if required

### Data Security
- Encrypt data at rest
- Use secure communication between nodes
- Regular security updates

## 📚 Additional Resources

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [ParalegalAI Documentation](./README.md)

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Docker and ChromaDB logs
3. Open an issue in the ParalegalAI repository
4. Check the community forums

---

**Note**: This multi-instance setup is designed for production use and provides significant performance improvements over single-instance ChromaDB. For development or testing, you can still use the standard single-instance setup.

