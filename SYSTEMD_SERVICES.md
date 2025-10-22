# 🔧 ParalegalAI Systemd Services - Production Setup

## ✅ What's Configured

Your ParalegalAI application is now running as **production-grade systemd services** with:

- ✅ **Auto-start on boot** - Services start automatically after system reboot
- ✅ **Auto-restart on failure** - Services restart automatically if they crash
- ✅ **Dependency management** - Services start in correct order
- ✅ **Resource monitoring** - Memory and CPU usage tracked
- ✅ **Centralized logging** - All logs available via journalctl

---

## 📋 Installed Services

| Service | Port | Description | Dependencies |
|---------|------|-------------|--------------|
| `paralegalai-qdrant` | 6333 | Vector database | None |
| `paralegalai-collector` | 8888 | Document collector | PostgreSQL |
| `paralegalai-server` | 3001 | Backend API | PostgreSQL, Qdrant, Collector |
| `paralegalai-frontend` | 3000 | Web interface | Server |

---

## 🚀 Quick Commands

### Using the Management Script (Recommended)

```bash
# Show status of all services
./manage-services.sh status

# Start all services
./manage-services.sh start

# Stop all services
./manage-services.sh stop

# Restart all services
./manage-services.sh restart

# View logs (live)
./manage-services.sh logs paralegalai-server
```

### Using systemctl Directly

```bash
# Check status
sudo systemctl status paralegalai-server

# Start a service
sudo systemctl start paralegalai-server

# Stop a service
sudo systemctl stop paralegalai-server

# Restart a service
sudo systemctl restart paralegalai-server

# View logs
sudo journalctl -u paralegalai-server -f

# View last 100 lines
sudo journalctl -u paralegalai-server -n 100
```

---

## 🔍 Service Status Check

```bash
# Check if services are enabled (auto-start)
systemctl is-enabled paralegalai-*

# Check if services are active (running)
systemctl is-active paralegalai-*

# List all ParalegalAI services
systemctl list-units "paralegalai-*"
```

---

## 🔄 Auto-Restart Configuration

All services are configured with:
- **Restart=always** - Restart on any exit (crash, kill, etc.)
- **RestartSec=10** - Wait 10 seconds before restarting
- **TimeoutStopSec=30** - Allow 30 seconds for graceful shutdown

### Test Auto-Restart

```bash
# Kill a service process (it will auto-restart)
sudo pkill -9 -f "node index.js"

# Check it restarted
sudo systemctl status paralegalai-server
```

---

## 📊 Monitoring

### Real-time Resource Usage

```bash
# Watch all services
watch -n 2 'systemctl status paralegalai-* --no-pager | grep -E "(●|Active:|Memory:|CPU:)"'

# Detailed status
sudo systemctl status paralegalai-server --no-pager -l
```

### View Logs

```bash
# Live logs for all services
sudo journalctl -u "paralegalai-*" -f

# Logs since last boot
sudo journalctl -u paralegalai-server -b

# Logs from last hour
sudo journalctl -u paralegalai-server --since "1 hour ago"

# Export logs to file
sudo journalctl -u paralegalai-server --since today > server-logs.txt
```

---

## 🛠️ Troubleshooting

### Service Won't Start

```bash
# Check detailed error
sudo systemctl status paralegalai-server -l

# Check logs
sudo journalctl -u paralegalai-server -n 50

# Check if port is in use
sudo lsof -i :3001

# Restart with fresh state
sudo systemctl restart paralegalai-server
```

### Service Keeps Restarting

```bash
# Check restart count
systemctl show paralegalai-server -p NRestarts

# View failure logs
sudo journalctl -u paralegalai-server -p err

# Check environment variables
sudo systemctl show paralegalai-server -p Environment
```

### Disable Auto-Restart (for debugging)

```bash
# Stop and disable service
sudo systemctl stop paralegalai-server
sudo systemctl disable paralegalai-server

# Run manually for debugging
cd /home/azureuser/paralegalaiNew/server
node index.js
```

---

## 🔐 Service Files Location

Service files are located at:
```
/etc/systemd/system/paralegalai-qdrant.service
/etc/systemd/system/paralegalai-collector.service
/etc/systemd/system/paralegalai-server.service
/etc/systemd/system/paralegalai-frontend.service
```

### Modify Service Configuration

```bash
# Edit service file
sudo nano /etc/systemd/system/paralegalai-server.service

# Reload systemd after changes
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart paralegalai-server
```

---

## 📝 Log Files

Services write to both:
1. **systemd journal** (recommended): `sudo journalctl -u <service>`
2. **File logs** (backup):
   - `/home/azureuser/qdrant.log`
   - `/home/azureuser/collector.log`
   - `/home/azureuser/server.log`
   - `/home/azureuser/frontend.log`

---

## 🚨 Emergency Commands

### Stop Everything

```bash
./manage-services.sh stop
# OR
sudo systemctl stop paralegalai-*
```

### Disable Auto-Start (prevent boot startup)

```bash
./manage-services.sh disable
# OR
sudo systemctl disable paralegalai-*
```

### Re-enable Auto-Start

```bash
./manage-services.sh enable
# OR
sudo systemctl enable paralegalai-*
```

### Complete Reset

```bash
# Stop all services
sudo systemctl stop paralegalai-*

# Disable auto-start
sudo systemctl disable paralegalai-*

# Remove service files
sudo rm /etc/systemd/system/paralegalai-*.service

# Reload systemd
sudo systemctl daemon-reload
```

---

## ✅ Verification Checklist

After system reboot, verify:

```bash
# 1. Check all services are running
./manage-services.sh status

# 2. Test endpoints
curl http://localhost:6333/collections
curl http://localhost:8888/accepts
curl http://localhost:3001/api/ping
curl http://localhost:3000

# 3. Check logs for errors
sudo journalctl -u "paralegalai-*" --since "5 minutes ago" -p err
```

---

## 🎯 Production Best Practices

✅ **Enabled**: All services auto-start on boot  
✅ **Auto-restart**: Services restart on failure (10s delay)  
✅ **Logging**: Centralized via systemd journal  
✅ **Dependencies**: Correct startup order enforced  
✅ **Resource limits**: File descriptor limits set  
✅ **Graceful shutdown**: 30s timeout for clean exit  

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Check status | `./manage-services.sh status` |
| Start all | `./manage-services.sh start` |
| Stop all | `./manage-services.sh stop` |
| Restart all | `./manage-services.sh restart` |
| View logs | `./manage-services.sh logs <service>` |
| Enable auto-start | `./manage-services.sh enable` |
| Disable auto-start | `./manage-services.sh disable` |

---

**Last Updated:** 2025-10-09  
**Status:** Production Ready ✅
