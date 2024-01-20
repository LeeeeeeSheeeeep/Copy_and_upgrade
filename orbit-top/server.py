import asyncio
import json
import psutil
import websockets
import http.server
import socketserver
import threading
import os
import sys

# Web server port
HTTP_PORT = 8080
# WebSocket port
WS_PORT = 8765

def get_system_metrics():
    # CPU usage per core
    cpu_usage = psutil.cpu_percent(interval=None, percpu=True)
    total_cpu = psutil.cpu_percent(interval=None)
    
    # RAM usage
    ram = psutil.virtual_memory()
    
    # Top processes
    procs = []
    for p in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'num_threads']), 
                    key=lambda x: x.info['cpu_percent'] if x.info['cpu_percent'] else 0, 
                    reverse=True)[:40]: # Get top 40 processes
        try:
            procs.append({
                'pid': p.info['pid'],
                'name': p.info['name'],
                'cpu': p.info['cpu_percent'],
                'ram': p.info['memory_info'].rss / (1024 * 1024), # MB
                'threads': p.info['num_threads']
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
            
    return {
        'cpu_total': total_cpu,
        'cpu_cores': cpu_usage,
        'ram_percent': ram.percent,
        'ram_used': ram.used / (1024**3),
        'ram_total': ram.total / (1024**3),
        'processes': procs
    }

async def send_metrics(websocket, path):
    try:
        while True:
            metrics = get_system_metrics()
            await websocket.send(json.dumps(metrics))
            await asyncio.sleep(1) # Send update every 1 second
    except websockets.exceptions.ConnectionClosed:
        pass

def start_ws_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    start_server = websockets.serve(send_metrics, "localhost", WS_PORT)
    loop.run_until_complete(start_server)
    loop.run_forever()

def start_http_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", HTTP_PORT), Handler) as httpd:
        print(f"Serving HTTP on port {HTTP_PORT}...")
        httpd.serve_forever()

if __name__ == "__main__":
    print(f"Starting Orbit-Top Server...")
    print(f"Frontend available at: http://localhost:{HTTP_PORT}/index.html")
    
    # Start WebSocket server in a background thread
    ws_thread = threading.Thread(target=start_ws_server, daemon=True)
    ws_thread.start()
    
    # Start HTTP server on main thread
    start_http_server()
