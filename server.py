import os
import subprocess
import time
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
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

node_process = None

@app.on_event("startup")
def startup_event():
    global node_process
    # Ensure the node process runs on port 3000
    env = os.environ.copy()
    env["PORT"] = "3000"
    
    print("Starting Node.js server from python subprocess...", flush=True)
    
    # Check if compiled file exists, otherwise use npx tsx
    if os.path.exists("dist/server.cjs"):
        cmd = ["node", "dist/server.cjs"]
    else:
        cmd = ["npx", "tsx", "server.ts"]
        
    try:
        node_process = subprocess.Popen(cmd, env=env)
        print(f"Node.js process successfully spawned with PID {node_process.pid}", flush=True)
    except Exception as e:
        print(f"Failed to spawn Node.js process: {e}", flush=True)
        
    # Give the Node.js app server 3 seconds to spin up and bind to port 3000
    time.sleep(3)

@app.on_event("shutdown")
def shutdown_event():
    global node_process
    if node_process:
        print("Stopping Node.js subprocess...", flush=True)
        node_process.terminate()
        node_process.wait()
        print("Node.js subprocess stopped.", flush=True)

# Create an async httpx client configured to point to the local Express server
client = httpx.AsyncClient(base_url="http://127.0.0.1:3000")

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_to_node(request: Request, path: str):
    # Construct target request URL preserving path and query string
    url = httpx.URL(path=request.url.path, query=request.url.query.encode("utf-8"))
    
    # Clone and prepare headers, pointing host to target Express port
    headers = dict(request.headers)
    headers["host"] = "127.0.0.1:3000"
    
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
        return {
            "status": "error",
            "message": f"Proxy connection to Node.js backend failed: {str(e)}"
        }
        
    # Return response as a stream to optimize performance and file downloads
    return StreamingResponse(
        response.aiter_bytes(),
        status_code=response.status_code,
        headers=dict(response.headers)
    )

if __name__ == "__main__":
    import uvicorn
    # Render binds to the PORT environment variable (default to 10000 on Render)
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
