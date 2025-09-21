# Docker Deployment for ParalegalAI

This guide explains how to deploy ParalegalAI using Docker and Docker Compose.

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone <your-repo-url>
   cd ParalegalAI
   ```

2. **Create environment file:**
   ```bash
   cp .env.docker .env
   ```

3. **Edit the environment file:**
   ```bash
   nano .env
   ```
   Update the following variables:
   - `OPEN_AI_KEY`: Your OpenAI API key
   - `OPEN_MODEL_PREF`: Your preferred OpenAI model (e.g., gpt-4)
   - `MULTI_USER_MODE`: Set to `true` if you want multi-user support

4. **Build and start the application:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   - Open your browser and go to `http://localhost:3001`
   - The collector service runs on port 8888

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t paralegal-ai .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name paralegal-ai \
     -p 3001:3001 \
     -p 8888:8888 \
     -e OPEN_AI_KEY=your_api_key_here \
     -e OPEN_MODEL_PREF=gpt-4 \
     -v paralegal_data:/app/server/storage \
     paralegal-ai
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `STORAGE_DIR` | Storage directory | `/app/server/storage` |
| `LLM_PROVIDER` | LLM provider | `openai` |
| `OPEN_AI_KEY` | OpenAI API key | Required |
| `OPEN_MODEL_PREF` | OpenAI model | `gpt-4` |
| `EMBEDDING_MODEL_PREF` | Embedding model | `text-embedding-3-small` |
| `VECTOR_DB` | Vector database | `lancedb` |
| `MULTI_USER_MODE` | Enable multi-user | `false` |
| `DISABLE_TELEMETRY` | Disable telemetry | `false` |

## Services

The Docker setup includes:

- **Main Application** (Port 3001): The main ParalegalAI web interface
- **Collector Service** (Port 8888): Document processing service
- **Database**: SQLite database (stored in Docker volume)

## Data Persistence

Data is persisted using Docker volumes:
- `paralegal_data`: Contains the SQLite database and all application data

## Health Checks

The container includes health checks that verify:
- The main application is responding on port 3001
- The API endpoint `/api/ping` is accessible

## Logs

To view logs:
```bash
# View all logs
docker-compose logs

# View logs for specific service
docker-compose logs paralegal-ai

# Follow logs in real-time
docker-compose logs -f
```

## Updating

To update the application:

1. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs`
- Verify environment variables are set correctly
- Ensure ports 3001 and 8888 are available

### Database issues
- The database is automatically created and migrated on first run
- Data is persisted in the `paralegal_data` volume

### Memory issues
- The application requires at least 2GB RAM
- Consider increasing Docker memory limits if needed

## Production Considerations

For production deployment:

1. **Use a reverse proxy** (nginx) for SSL termination
2. **Set up proper backup** for the `paralegal_data` volume
3. **Configure monitoring** and logging
4. **Use environment-specific configuration**
5. **Consider using a managed database** instead of SQLite for better performance

## Security

- Change default passwords and API keys
- Use HTTPS in production
- Regularly update the base image
- Monitor container logs for security issues

