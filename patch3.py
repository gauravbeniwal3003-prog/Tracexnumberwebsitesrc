import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the part that starts with:
#         # Try to parse JSON first
#         try:
# ... up to where it returns make_api_response

start_marker = "        # Try to parse JSON first"
end_marker = 'return make_api_response({"status": "success", "results": results, "cached": False})'

# Let's check if the end_marker exists
if end_marker not in content:
    print("Could not find end_marker")

# Let's write a targeted regex
pattern = re.compile(
    r'        # Try to parse JSON first.*?return make_api_response\(\{"status": "success", "results": results, "cached": False\}\)',
    re.DOTALL
)

replacement = """        # Try to parse JSON first
        results = None
        is_parsed_as_json = False
        
        try:
            parsed = resp.json()
            if parsed and (parsed.get("success") is False or str(parsed.get("success")).lower() == "false" or parsed.get("status") is False or str(parsed.get("status")).lower() == "false"):
                return make_api_response({"status": "success", "service": "telegram", "query": targetTelegramId, "results": {}, "message": "no data found"})
                
            cleaned_json = scrub_all_branding(parsed)
            if cleaned_json and isinstance(cleaned_json, dict):
                results = cleaned_json.get("results") or cleaned_json.get("data") or cleaned_json
                is_parsed_as_json = True
        except Exception as e:
            pass

        if not is_parsed_as_json:
            username_match = re.search(r'(?:Username|User):\s*([^\s\n\r]+)', cleanedText, re.IGNORECASE)
            if not username_match: username_match = re.search(r'"(?:username|name)"\s*:\s*"([^"]+)"', cleanedText, re.IGNORECASE)
            
            id_match = re.search(r'(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?', cleanedText, re.IGNORECASE)
            if not id_match: id_match = re.search(r'"(?:tg_id|telegram_id)"\s*:\s*"?(\d+)"?', cleanedText, re.IGNORECASE)
            
            phone_match = re.search(r'(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?', cleanedText, re.IGNORECASE)
            if not phone_match: phone_match = re.search(r'"(?:number|mobile|phone)"\s*:\s*"?(\d+)"?', cleanedText, re.IGNORECASE)
            
            username = username_match.group(1).strip() if username_match else target_username
            telegram_id = id_match.group(1).strip() if id_match else "N/A"
            phone = phone_match.group(1).strip() if phone_match else "N/A"
            
            if telegram_id == "N/A" and phone == "N/A":
                return make_api_response({"status": "success", "service": "telegram", "query": targetTelegramId, "results": {}, "message": "no data found"})

            results = {
                "telegram_id": telegram_id,
                "username": username,
                "mobile": phone,
                "platform": "Telegram Lookup"
            }

        # Save successful result to database cache
        try:
            db.table("search_results").upsert({
                "mobile_number": cache_key,
                "raw_data": results
            }, on_conflict="mobile_number").execute()
            print(f"[Telegram Cache Save] Successfully cached lookup for: {target_username}")
        except Exception as cache_save_err:
            print(f"[Telegram Cache Save Error] {cache_save_err}")

        # Record telemetry for successful search
        if not is_master and keyRecord and keyRecord.get("id"):
            try:
                db.table("api_keys").update({
                    "requests_used": (keyRecord.get("requests_used") or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", keyRecord["id"]).execute()
            except Exception as e_tel:
                print(f"[API_UPDATE_TELEMETRY_ERR] {e_tel}")

        return make_api_response({
            "status": "success",
            "service": "telegram",
            "query": targetTelegramId,
            "results": scrub_all_branding(results)
        })"""

new_content = pattern.sub(replacement, content, count=1)
if new_content == content:
    print("Failed to apply patch!")
else:
    print("Patch applied successfully.")

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

