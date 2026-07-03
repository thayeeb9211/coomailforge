"""
COO Mail Forge — Production Server
Run this file (not app.py) for multi-user intranet deployment.
"""
import os
import socket
import threading
import webbrowser

PREFERRED_PORTS = [5001, 5002, 5003, 5004, 5005]

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

def find_free_port(ports):
    """Try each port in order; return the first one not already in use."""
    for p in ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(("0.0.0.0", p))
                return p
        except OSError:
            print(f"  Port {p} is busy — trying next…")
    raise RuntimeError(f"None of the ports {ports} are available. Free one and retry.")

HOST   = "0.0.0.0"
LAN_IP = get_lan_ip()

if __name__ == "__main__":
    try:
        from waitress import serve
    except ImportError:
        print("Installing waitress...")
        os.system("pip install waitress")
        from waitress import serve

    from app import app, start_auto_update
    start_auto_update()

    PORT = find_free_port(PREFERRED_PORTS)
    print()
    print("=" * 62)
    print("  COO Mail Forge  —  Local / Intranet Mode")
    print("=" * 62)
    print(f"  Your PC:   http://localhost:{PORT}")
    print(f"  Agents:    http://{LAN_IP}:{PORT}")
    print("=" * 62)
    print("  Share the AGENTS link with all COO / DOO staff.")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 62)
    print()
    threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()

    try:
        serve(app, host=HOST, port=PORT, threads=16)
    except OSError as e:
        print()
        print(f"  ERROR: Could not bind to port {PORT}: {e}")
        print("  Another process may still own that port.")
        print("  Run STOP SERVER.bat, then try again.")
        print()
        input("  Press Enter to exit...")
    except KeyboardInterrupt:
        print()
        print("  Server stopped by user (Ctrl+C).")
    except Exception as e:
        print()
        print(f"  UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        print()
        input("  Press Enter to exit...")
