import re
with open('server.py', 'r') as f:
    code = f.read()

# 1. CORS update
cors_patch = """
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set to specific domains
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
"""
code = re.sub(r'app\.add_middleware\(\s*CORSMiddleware,\s*allow_origins=\["\*"\](?:,\s*allow_methods=\["\*"\])?(?:,\s*allow_headers=\["\*"\])?,\s*\)', cors_patch, code)

# 2. Rate limit update
rl_patch = """
def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Clean up old records
    ip_records[client_ip] = [t for t in ip_records[client_ip] if now - t < RATE_WINDOW]
    
    if len(ip_records[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
        
    ip_records[client_ip].append(now)
    return True
"""
code = re.sub(r'def check_rate_limit\(request: Request\):\s*return True', rl_patch, code)

# 3. IDOR in claim_manual_cashfree
idor_patch = """
        if claim and claim.get("status") == "success":
            return {"error": "This reference has already been successfully claimed and posted."}

        # IDOR Protection: Verify ownership
        if claim and claim.get("user_id") and claim.get("user_id") != user.id:
            return {"error": "Unauthorized. This order does not belong to your account."}
"""
code = re.sub(r'if claim and claim\.get\("status"\) == "success":\s*return \{"error": "This reference has already been successfully claimed and posted\."\}', idor_patch, code)

with open('server.py', 'w') as f:
    f.write(code)

print("Patched server.py successfully")
