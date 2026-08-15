import re

with open("server.py", "r") as f:
    content = f.read()

old_block = """    auth_header = request.headers.get("authorization")
    if not auth_header:
        return JSONResponse(status_code=401, content={"error": "Authentication is required"})

    token = auth_header.replace("Bearer ", "")
    if not token:
        return JSONResponse(status_code=401, content={"error": "Authentication token is empty"})

    try:
        db = get_supabase()
        if not db:
            return JSONResponse(status_code=500, content={"error": "Engine Offline: Database connection failure"})

        # Authenticate user using supabase auth token
        user_resp = db.auth.get_user(token)
        if not user_resp or not user_resp.user:
            return JSONResponse(status_code=401, content={"error": "Access Denied: Invalid or expired user session"})
        user = user_resp.user"""

new_block = """    try:
        db = get_supabase()
        if not db:
            return JSONResponse(status_code=500, content={"error": "Engine Offline: Database connection failure"})

        # Authenticate user
        user = get_user_from_token(request)
        if not user:
            return JSONResponse(status_code=401, content={"error": "Access Denied: Invalid or expired user session"})"""

content = content.replace(old_block, new_block)

with open("server.py", "w") as f:
    f.write(content)
