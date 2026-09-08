import os
import sys
import shutil
import subprocess
import threading
import time
import asyncio
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Port configuration
external_port = int(os.environ.get("PORT", 3000))
node_port = 3005 if external_port != 3005 else 3006

node_process = None
last_spawn_attempt = 0.0
is_installing_deps = False
node_is_ready = False
http_client: httpx.AsyncClient = None


def log(msg: str):
    print(f"[GATEWAY] {msg}", flush=True)


def ensure_node_dependencies():
    """Ensures npm dependencies (like express) are installed before starting Node.js."""
    global is_installing_deps

    express_path = os.path.join("node_modules", "express")
    if os.path.exists(express_path):
        return True

    log("Express / node_modules not detected. Installing npm packages...")
    is_installing_deps = True
    try:
        npm_bin = shutil.which("npm")
        if not npm_bin:
            log("CRITICAL: 'npm' command not found in system PATH.")
            return False

        res = subprocess.run(
            [npm_bin, "install", "--no-audit", "--no-fund", "--production=false"],
            stdout=sys.stdout,
            stderr=sys.stderr,
            timeout=300
        )
        if res.returncode == 0:
            log("npm install completed successfully.")
            if not os.path.exists("dist/server.cjs"):
                log("Building server bundle (dist/server.cjs)...")
                subprocess.run([npm_bin, "run", "build"], stdout=sys.stdout, stderr=sys.stderr, timeout=120)
            return True
        else:
            log(f"npm install failed with exit code {res.returncode}")
            return False
    except Exception as e:
        log(f"Error while running npm install: {e}")
        return False
    finally:
        is_installing_deps = False


def stream_process_logs(proc: subprocess.Popen, name: str):
    """Pipes Node process output to Python stdout for clear logging."""
    try:
        for line in iter(proc.stdout.readline, b''):
            if line:
                sys.stdout.write(f"[{name}] {line.decode('utf-8', errors='replace')}")
                sys.stdout.flush()
    except Exception:
        pass


def spawn_node_process():
    """Launches the Node.js / Express backend server."""
    global node_process, last_spawn_attempt, node_is_ready

    now = time.time()
    if now - last_spawn_attempt < 3.0:
        return

    last_spawn_attempt = now
    node_is_ready = False

    deps_ok = ensure_node_dependencies()
    if not deps_ok and not os.path.exists("node_modules"):
        log("Cannot start Node.js: dependencies are missing.")
        return

    if node_process is not None:
        try:
            log("Cleaning up prior Node.js process...")
            node_process.terminate()
            node_process.wait(timeout=2)
        except Exception:
            pass
        node_process = None

    env = os.environ.copy()
    env["PORT"] = str(node_port)
    env["NODE_ENV"] = "production"

    if os.path.exists("dist/server.cjs"):
        cmd = ["node", "dist/server.cjs"]
        log(f"Starting compiled Node backend on internal port {node_port}...")
    elif shutil.which("npx"):
        cmd = ["npx", "tsx", "server.ts"]
        log(f"Starting TypeScript Node backend via tsx on internal port {node_port}...")
    else:
        cmd = ["node", "server.ts"]
        log(f"Starting Node backend on internal port {node_port}...")

    try:
        node_process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1
        )
        log(f"Node.js server spawned with PID {node_process.pid} on port {node_port}")

        t = threading.Thread(target=stream_process_logs, args=(node_process, "Express"), daemon=True)
        t.start()
    except Exception as e:
        log(f"CRITICAL: Failed to spawn Node.js server: {e}")


def is_node_healthy() -> bool:
    """Checks if Node.js server process is active."""
    global node_process
    if node_process is None or node_process.poll() is not None:
        return False
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    log(f"FastAPI Gateway starting on external port {external_port} (Internal Node target: {node_port})...")
    spawn_node_process()
    
    # Initialize AsyncClient within the running asyncio event loop
    http_client = httpx.AsyncClient(
        base_url=f"http://127.0.0.1:{node_port}",
        timeout=httpx.Timeout(120.0, connect=10.0),
        limits=httpx.Limits(max_keepalive_connections=50, max_connections=200)
    )
    yield
    
    # Cleanup on shutdown
    log("FastAPI Gateway shutting down...")
    if http_client:
        await http_client.aclose()
    if node_process and node_process.poll() is None:
        try:
            node_process.terminate()
            node_process.wait(timeout=3)
        except Exception:
            pass


app = FastAPI(title="TraceXData API Gateway", version="2.0.0", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
@app.get("/gateway/health")
def gateway_health():
    """Gateway health check endpoint."""
    node_alive = is_node_healthy()
    return {
        "gateway": "online",
        "node_backend": "online" if node_alive else "restarting/offline",
        "port": external_port,
        "internal_node_port": node_port
    }


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_all(request: Request, path: str):
    """Transparently proxies all incoming requests to the Node.js Express backend."""
    global node_process, http_client

    if not is_node_healthy():
        log(f"Node.js appears down upon request to /{path}. Triggering self-healing spawn...")
        spawn_node_process()

    if http_client is None or http_client.is_closed:
        http_client = httpx.AsyncClient(
            base_url=f"http://127.0.0.1:{node_port}",
            timeout=httpx.Timeout(120.0, connect=10.0)
        )

    # Build destination path
    req_path = request.url.path
    if request.url.query:
        req_path = f"{req_path}?{request.url.query}"

    headers = dict(request.headers)
    orig_host = headers.get("host", f"127.0.0.1:{external_port}")
    headers["x-forwarded-host"] = orig_host
    headers["x-forwarded-proto"] = request.url.scheme or "http"
    if request.client and request.client.host:
        headers["x-forwarded-for"] = request.client.host
    headers["host"] = f"127.0.0.1:{node_port}"
    headers.pop("content-length", None)

    body = await request.body()

    max_retries = 4
    for attempt in range(max_retries):
        try:
            response = await http_client.request(
                method=request.method,
                url=req_path,
                headers=headers,
                content=body
            )

            resp_headers = dict(response.headers)
            for h in [
                "content-encoding", "transfer-encoding", "content-length",
                "connection", "keep-alive", "proxy-authenticate",
                "proxy-authorization", "te", "trailer", "upgrade"
            ]:
                resp_headers.pop(h, None)

            return StreamingResponse(
                response.aiter_bytes(),
                status_code=response.status_code,
                headers=resp_headers
            )
        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(1.0)
                continue
            else:
                return JSONResponse(
                    status_code=502,
                    content={
                        "status": "error",
                        "error_type": "backend_gateway_error",
                        "message": "Backend engine is initializing. Please retry in a moment.",
                        "details": str(e)
                    }
                )
        except Exception as e:
            log(f"Proxy error on {request.method} {req_path}: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "error_type": "proxy_error",
                    "message": f"Proxy request failed: {str(e)}"
                }
            )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=external_port, log_level="info")
