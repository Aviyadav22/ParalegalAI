#!/bin/bash
# ParalegalAI Service Management Script
# Production-grade systemd service controller

set -e

SERVICES=(
    "paralegalai-qdrant"
    "paralegalai-collector"
    "paralegalai-server"
    "paralegalai-frontend"
)

show_status() {
    echo "=========================================="
    echo "ParalegalAI Services Status"
    echo "=========================================="
    sudo systemctl status "${SERVICES[@]}" --no-pager | grep -E "(●|Active:|Main PID:|Memory:|CPU:)" || true
    echo ""
    echo "=========================================="
    echo "Service Health Check"
    echo "=========================================="
    curl -s http://localhost:6333/collections > /dev/null && echo "✓ Qdrant (6333): Running" || echo "✗ Qdrant (6333): Down"
    curl -s http://localhost:8888/accepts > /dev/null && echo "✓ Collector (8888): Running" || echo "✗ Collector (8888): Down"
    curl -s http://localhost:3001/api/ping > /dev/null && echo "✓ Server (3001): Running" || echo "✗ Server (3001): Down"
    curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend (3000): Running" || echo "✗ Frontend (3000): Down"
}

start_all() {
    echo "Starting all ParalegalAI services..."
    for service in "${SERVICES[@]}"; do
        echo "Starting $service..."
        sudo systemctl start "$service"
        sleep 2
    done
    echo "All services started!"
    show_status
}

stop_all() {
    echo "Stopping all ParalegalAI services..."
    for service in "${SERVICES[@]}"; do
        echo "Stopping $service..."
        sudo systemctl stop "$service"
    done
    echo "All services stopped!"
}

restart_all() {
    echo "Restarting all ParalegalAI services..."
    for service in "${SERVICES[@]}"; do
        echo "Restarting $service..."
        sudo systemctl restart "$service"
        sleep 2
    done
    echo "All services restarted!"
    show_status
}

enable_all() {
    echo "Enabling all ParalegalAI services (auto-start on boot)..."
    sudo systemctl enable "${SERVICES[@]}"
    echo "All services enabled!"
}

disable_all() {
    echo "Disabling all ParalegalAI services (no auto-start on boot)..."
    sudo systemctl disable "${SERVICES[@]}"
    echo "All services disabled!"
}

view_logs() {
    service=${1:-paralegalai-server}
    echo "Viewing logs for $service (Ctrl+C to exit)..."
    sudo journalctl -u "$service" -f
}

case "${1:-status}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    enable)
        enable_all
        ;;
    disable)
        disable_all
        ;;
    logs)
        view_logs "$2"
        ;;
    *)
        echo "ParalegalAI Service Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|enable|disable|logs [service]}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status (default)"
        echo "  enable   - Enable auto-start on boot"
        echo "  disable  - Disable auto-start on boot"
        echo "  logs     - View logs (optional: specify service name)"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 restart"
        echo "  $0 logs paralegalai-server"
        exit 1
        ;;
esac
