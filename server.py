import os
import subprocess
import time
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ports separation to prevent "Address already in use" crashes
external_port = int(os.environ.get("PORT", 3000))
node_port = 3005 if external_port != 3005 else 3006

node_process = None

def spawn_node_process():
    global node_process
    # Clean up existing process if alive
    if node_process:
        try:
            print("Terminating existing Node.js process...", flush=True)
            node_process.terminate()
            node_process.wait(timeout=2)
        except Exception:
            pass
            
    env = os.environ.copy()
    env["PORT"] = str(node_port)
    
    print(f"Starting Node.js server on port {node_port} from python subprocess...", flush=True)
    
    # Check if compiled file exists, otherwise use npx tsx
    if os.path.exists("dist/server.cjs"):
        cmd = ["node", "dist/server.cjs"]
    else:
        cmd = ["npx", "tsx", "server.ts"]
        
    try:
        node_process = subprocess.Popen(cmd, env=env)
        print(f"Node.js process successfully spawned with PID {node_process.pid} on port {node_port}", flush=True)
    except Exception as e:
        print(f"Failed to spawn Node.js process: {e}", flush=True)

@app.on_event("startup")
def startup_event():
    spawn_node_process()
    # Give the Node.js app server 3 seconds to spin up and bind to its port
    time.sleep(3)

@app.on_event("shutdown")
def shutdown_event():
    global node_process
    if node_process:
        print("Stopping Node.js subprocess...", flush=True)
        try:
            node_process.terminate()
            node_process.wait(timeout=5)
        except Exception as e:
            print(f"Error during shutdown: {e}", flush=True)
        print("Node.js subprocess stopped.", flush=True)

# Create an async httpx client configured to point to the local Express server
client = httpx.AsyncClient(base_url=f"http://127.0.0.1:{node_port}")

def ensure_node_alive():
    global node_process
    if node_process is None or node_process.poll() is not None:
        print("[MONITOR] Node.js process is down. Respawning immediately...", flush=True)
        spawn_node_process()
        time.sleep(2)  # Short pause to let it bind

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_to_node(request: Request, path: str):
    # Ensure Node is running to preserve 100% uptime
    ensure_node_alive()
    
    # Construct target request URL pointing to the internal Node.js port
    url = httpx.URL(
        scheme="http",
        host="127.0.0.1",
        port=node_port,
        path=request.url.path,
        query=request.url.query.encode("utf-8")
    )
    
    # Clone and prepare headers, pointing host to target Express port
    headers = dict(request.headers)
    headers["host"] = f"127.0.0.1:{node_port}"
    
    # Read the request body
    body = await request.body()
    
    try:
        # Proxy request to the Express backend
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            timeout=120.0
        )
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={
                "status": "error",
                "message": f"Proxy connection to Node.js backend failed: {str(e)}"
            }
        )
        
    # Sanitize headers to prevent duplicate/conflicting chunked or connection flags
    resp_headers = dict(response.headers)
    excluded_headers = [
        "content-encoding",
        "transfer-encoding",
        "content-length",
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "upgrade"
    ]
    for h in excluded_headers:
        resp_headers.pop(h, None)
        
    # Return response as a stream to optimize performance and file downloads
    return StreamingResponse(
        response.aiter_bytes(),
        status_code=response.status_code,
        headers=resp_headers
    )

if __name__ == "__main__":
    import uvicorn
    # Render binds to the PORT environment variable (default to 3000 here)
    port = int(os.environ.get("PORT", 3000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
