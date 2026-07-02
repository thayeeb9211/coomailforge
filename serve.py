"""
COO Mail Forge — Production Server
Run this file (not app.py) for multi-user intranet deployment.
"""
import os
import socket
import threading
import webbrowser

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

HOST   = "0.0.0.0"
PORT   = 5001
LAN_IP = get_lan_ip()

if __name__ == "__main__":
    try:
        from waitress import serve
    except ImportError:
        print("Installing waitress...")
        os.system("pip install waitress")
        from waitress import serve

    from app import app

    print("=" * 58)
    print("  COO Mail Forge  —  Production Server")
    print("=" * 58)
    print(f"  Local:    http://localhost:{PORT}")
    print(f"  Network:  http://{LAN_IP}:{PORT}   ← share with team")
    print("=" * 58)
    print("  Send the Network URL to your COO agents and manager.")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 58)

    threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    serve(app, host=HOST, port=PORT, threads=16)
