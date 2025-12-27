#!/bin/bash

###############################################################################
# TTS-App Manager
# Manages CosyVoice TTS Server and Next.js App
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COSYVOICE_DIR="$HOME/CosyVoice"
NEXTJS_DIR="$SCRIPT_DIR"

# PID files
TTS_PIDFILE="/tmp/tts-server.pid"
NEXTJS_PIDFILE="/tmp/nextjs-app.pid"

# Log files
TTS_LOGFILE="/tmp/tts-server.log"
NEXTJS_LOGFILE="/tmp/nextjs-app.log"

# Verbose mode (0 = off, 1 = on)
VERBOSE=0

###############################################################################
# Helper Functions
###############################################################################

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           TTS-App Manager v1.0                            ║"
    echo "║   CosyVoice 3 TTS Server + Next.js App Controller        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ $VERBOSE -eq 1 ]; then
        echo -e "${PURPLE}[VERBOSE]${NC} $1"
    fi
}

###############################################################################
# TTS Server Functions
###############################################################################

start_tts_server() {
    log_info "Starting CosyVoice TTS Server..."

    if [ -f "$TTS_PIDFILE" ]; then
        local pid=$(cat "$TTS_PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_warning "TTS Server already running (PID: $pid)"
            return 0
        else
            log_verbose "Removing stale PID file"
            rm -f "$TTS_PIDFILE"
        fi
    fi

    if [ ! -d "$COSYVOICE_DIR" ]; then
        log_error "CosyVoice directory not found: $COSYVOICE_DIR"
        return 1
    fi

    cd "$COSYVOICE_DIR"

    # Check if virtual environment exists
    if [ ! -d ".venv" ]; then
        log_error "Virtual environment not found in $COSYVOICE_DIR/.venv"
        return 1
    fi

    log_verbose "Activating virtual environment"
    source .venv/bin/activate

    log_verbose "Starting TTS server in background"

    if [ $VERBOSE -eq 1 ]; then
        # Verbose mode: show output
        python tts_server.py &
        local pid=$!
    else
        # Silent mode: redirect to log file
        nohup python tts_server.py > "$TTS_LOGFILE" 2>&1 &
        local pid=$!
    fi

    echo $pid > "$TTS_PIDFILE"

    # Wait a bit and check if server started successfully
    sleep 3

    if kill -0 "$pid" 2>/dev/null; then
        log_success "TTS Server started (PID: $pid)"
        log_info "Server running at: http://127.0.0.1:50000"
        [ $VERBOSE -eq 0 ] && log_info "Logs: $TTS_LOGFILE"
        return 0
    else
        log_error "TTS Server failed to start"
        rm -f "$TTS_PIDFILE"
        return 1
    fi
}

stop_tts_server() {
    log_info "Stopping CosyVoice TTS Server..."

    if [ ! -f "$TTS_PIDFILE" ]; then
        log_warning "TTS Server not running (no PID file)"
        return 0
    fi

    local pid=$(cat "$TTS_PIDFILE")

    if ! kill -0 "$pid" 2>/dev/null; then
        log_warning "TTS Server not running (stale PID: $pid)"
        rm -f "$TTS_PIDFILE"
        return 0
    fi

    log_verbose "Sending SIGTERM to PID $pid"
    kill "$pid" 2>/dev/null || true

    # Wait for graceful shutdown (max 10 seconds)
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
        log_verbose "Waiting for shutdown... ($count/10)"
    done

    if kill -0 "$pid" 2>/dev/null; then
        log_warning "Graceful shutdown failed, forcing kill"
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$TTS_PIDFILE"
    log_success "TTS Server stopped"
}

status_tts_server() {
    if [ ! -f "$TTS_PIDFILE" ]; then
        echo -e "${RED}TTS Server: NOT RUNNING${NC}"
        return 1
    fi

    local pid=$(cat "$TTS_PIDFILE")

    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}TTS Server: RUNNING${NC} (PID: $pid)"

        # Try to check health endpoint
        if command -v curl >/dev/null 2>&1; then
            local health=$(curl -s http://127.0.0.1:50000/health 2>/dev/null)
            if [ -n "$health" ]; then
                echo -e "  Health: ${GREEN}✓ Healthy${NC}"
                [ $VERBOSE -eq 1 ] && echo "  Response: $health"
            else
                echo -e "  Health: ${YELLOW}⚠ No response${NC}"
            fi
        fi
        return 0
    else
        echo -e "${YELLOW}TTS Server: STALE PID${NC} ($pid)"
        return 1
    fi
}

###############################################################################
# Next.js App Functions
###############################################################################

start_nextjs_app() {
    log_info "Starting Next.js App..."

    if [ -f "$NEXTJS_PIDFILE" ]; then
        local pid=$(cat "$NEXTJS_PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_warning "Next.js App already running (PID: $pid)"
            return 0
        else
            log_verbose "Removing stale PID file"
            rm -f "$NEXTJS_PIDFILE"
        fi
    fi

    cd "$NEXTJS_DIR"

    log_verbose "Starting Next.js development server"

    if [ $VERBOSE -eq 1 ]; then
        # Verbose mode: show output
        npm run dev &
        local pid=$!
    else
        # Silent mode: redirect to log file
        nohup npm run dev > "$NEXTJS_LOGFILE" 2>&1 &
        local pid=$!
    fi

    echo $pid > "$NEXTJS_PIDFILE"

    # Wait a bit for server to start
    sleep 3

    if kill -0 "$pid" 2>/dev/null; then
        log_success "Next.js App started (PID: $pid)"
        log_info "App running at: http://localhost:3030"
        [ $VERBOSE -eq 0 ] && log_info "Logs: $NEXTJS_LOGFILE"
        return 0
    else
        log_error "Next.js App failed to start"
        rm -f "$NEXTJS_PIDFILE"
        return 1
    fi
}

stop_nextjs_app() {
    log_info "Stopping Next.js App..."

    if [ ! -f "$NEXTJS_PIDFILE" ]; then
        log_warning "Next.js App not running (no PID file)"
        return 0
    fi

    local pid=$(cat "$NEXTJS_PIDFILE")

    if ! kill -0 "$pid" 2>/dev/null; then
        log_warning "Next.js App not running (stale PID: $pid)"
        rm -f "$NEXTJS_PIDFILE"
        return 0
    fi

    log_verbose "Sending SIGTERM to PID $pid"
    kill "$pid" 2>/dev/null || true

    # Wait for graceful shutdown (max 10 seconds)
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
        log_verbose "Waiting for shutdown... ($count/10)"
    done

    if kill -0 "$pid" 2>/dev/null; then
        log_warning "Graceful shutdown failed, forcing kill"
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$NEXTJS_PIDFILE"
    log_success "Next.js App stopped"
}

status_nextjs_app() {
    if [ ! -f "$NEXTJS_PIDFILE" ]; then
        echo -e "${RED}Next.js App: NOT RUNNING${NC}"
        return 1
    fi

    local pid=$(cat "$NEXTJS_PIDFILE")

    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}Next.js App: RUNNING${NC} (PID: $pid)"

        # Try to check if the dev port (3030) is listening (matches package.json dev script)
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i :3030 >/dev/null 2>&1; then
                echo -e "  Port 3030: ${GREEN}✓ Listening${NC}"
            else
                echo -e "  Port 3030: ${YELLOW}⚠ Not listening${NC}"
            fi
        fi
        return 0
    else
        echo -e "${YELLOW}Next.js App: STALE PID${NC} ($pid)"
        return 1
    fi
}

###############################################################################
# Combined Operations
###############################################################################

start_all() {
    print_banner
    log_info "Starting all services..."
    echo ""

    start_tts_server
    echo ""
    start_nextjs_app
    echo ""

    log_success "All services started!"
    echo ""
    echo -e "${BLUE}Quick Links:${NC}"
    echo -e "  Next.js App:  ${GREEN}http://localhost:3030${NC}"
    echo -e "  TTS Server:   ${GREEN}http://127.0.0.1:50000${NC}"
    echo -e "  TTS Health:   ${GREEN}http://127.0.0.1:50000/health${NC}"
    echo ""

    if [ $VERBOSE -eq 0 ]; then
        echo -e "${YELLOW}Tip:${NC} Run with -v flag for verbose output"
        echo -e "${YELLOW}Tip:${NC} Use './tts-app.sh logs' to view logs"
    fi
}

stop_all() {
    print_banner
    log_info "Stopping all services..."
    echo ""

    stop_nextjs_app
    echo ""
    stop_tts_server
    echo ""

    log_success "All services stopped!"
}

restart_all() {
    print_banner
    log_info "Restarting all services..."
    echo ""

    stop_all
    sleep 2
    start_all
}

status_all() {
    print_banner
    echo -e "${BLUE}Service Status:${NC}"
    echo ""

    status_tts_server
    echo ""
    status_nextjs_app
    echo ""
}

show_logs() {
    local service="$1"

    case "$service" in
        tts)
            if [ -f "$TTS_LOGFILE" ]; then
                log_info "Showing TTS Server logs (Press Ctrl+C to exit):"
                tail -f "$TTS_LOGFILE"
            else
                log_error "TTS log file not found: $TTS_LOGFILE"
            fi
            ;;
        nextjs|app)
            if [ -f "$NEXTJS_LOGFILE" ]; then
                log_info "Showing Next.js App logs (Press Ctrl+C to exit):"
                tail -f "$NEXTJS_LOGFILE"
            else
                log_error "Next.js log file not found: $NEXTJS_LOGFILE"
            fi
            ;;
        *)
            log_error "Unknown service: $service"
            echo "Available services: tts, nextjs"
            exit 1
            ;;
    esac
}

###############################################################################
# Help Function
###############################################################################

show_help() {
    print_banner
    cat << EOF
${BLUE}USAGE:${NC}
    $(basename "$0") [OPTIONS] COMMAND

${BLUE}COMMANDS:${NC}
    start           Start TTS Server and Next.js App
    stop            Stop all services
    restart         Restart all services
    status          Show status of all services
    logs SERVICE    Show logs for SERVICE (tts or nextjs)

    start-tts       Start only TTS Server
    stop-tts        Stop only TTS Server
    status-tts      Show TTS Server status

    start-app       Start only Next.js App
    stop-app        Stop only Next.js App
    status-app      Show Next.js App status

${BLUE}OPTIONS:${NC}
    -v, --verbose   Enable verbose output
    -h, --help      Show this help message

${BLUE}EXAMPLES:${NC}
    # Start everything
    $(basename "$0") start

    # Start with verbose output
    $(basename "$0") -v start

    # Restart everything
    $(basename "$0") restart

    # Check status
    $(basename "$0") status

    # View TTS server logs
    $(basename "$0") logs tts

    # Stop everything
    $(basename "$0") stop

${BLUE}FILES:${NC}
    PID Files:  $TTS_PIDFILE
                $NEXTJS_PIDFILE

    Log Files:  $TTS_LOGFILE
                $NEXTJS_LOGFILE

EOF
}

###############################################################################
# Main Script Logic
###############################################################################

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        start)
            start_all
            exit 0
            ;;
        stop)
            stop_all
            exit 0
            ;;
        restart)
            restart_all
            exit 0
            ;;
        status)
            status_all
            exit 0
            ;;
        logs)
            shift
            show_logs "$1"
            exit 0
            ;;
        start-tts)
            start_tts_server
            exit 0
            ;;
        stop-tts)
            stop_tts_server
            exit 0
            ;;
        status-tts)
            status_tts_server
            exit 0
            ;;
        start-app)
            start_nextjs_app
            exit 0
            ;;
        stop-app)
            stop_nextjs_app
            exit 0
            ;;
        status-app)
            status_nextjs_app
            exit 0
            ;;
        *)
            log_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# No command provided
show_help
exit 1
