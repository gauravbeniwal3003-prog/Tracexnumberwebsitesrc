import re

with open("server.py", "r") as f:
    content = f.read()

# Replace db.auth.get_user(token) block with get_user_from_token(request)
content = re.sub(
    r"# Authenticate user using supabase auth token\s*user_resp = db\.auth\.get_user\(token\)\s*if not user_resp or not user_resp\.user:\s*return JSONResponse\(status_code=401, content=\{\"error\": \"Access Denied: Invalid or expired user session\"\}\)\s*user = user_resp\.user",
    r"# Authenticate user using supabase auth token\n        user = get_user_from_token(request)\n        if not user:\n            return JSONResponse(status_code=401, content={\"error\": \"Access Denied: Invalid or expired user session\"})",
    content
)

with open("server.py", "w") as f:
    f.write(content)
