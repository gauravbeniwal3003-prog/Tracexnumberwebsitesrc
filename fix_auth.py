import re

with open("server.py", "r") as f:
    content = f.read()

old_block = """    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return make_api_response({
            "status": "error",
            "message": "Authentication required. Please log in first."
        })
        
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    if not token:
        return make_api_response({
            "status": "error",
            "message": "Authentication required. Please log in first."
        })
        
    try:
        user_response = db.auth.get_user(token)
        user = user_response.user if user_response else None
    except Exception as auth_err:
        print(f"[Auth error]: {auth_err}")
        return make_api_response({
            "status": "error",
            "message": "Invalid or expired session. Please log in again."
        })
        
    if not user:
        return make_api_response({
            "status": "error",
            "message": "Invalid or expired session. Please log in again."
        })
        
    try:
        profile_query = db.table("profiles").select("*").eq("id", user.id).execute()"""

new_block = """    user = get_user_from_token(request)
    if not user:
        return make_api_response({
            "status": "error",
            "message": "Authentication required. Please log in first."
        })
        
    user_id_val = get_user_id(user)
    
    try:
        profile_query = db.table("profiles").select("*").eq("id", user_id_val).execute()"""

content = content.replace(old_block, new_block)

# Also need to replace user.id with user_id_val below that point in the profile creation
content = content.replace('"id": user.id,', '"id": user_id_val,')

with open("server.py", "w") as f:
    f.write(content)
