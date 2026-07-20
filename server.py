import os
import requests
import time
import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Query, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import Optional, Dict, Any
from collections import defaultdict

# --- RATE LIMITING ---
ip_records = defaultdict(list)
RATE_LIMIT = 5 # requests
RATE_WINDOW = 10 # seconds


def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Clean up old records
    ip_records[client_ip] = [t for t in ip_records[client_ip] if now - t < RATE_WINDOW]
    
    if len(ip_records[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
        
    ip_records[client_ip].append(now)
    return True


def is_valid_uuid(val):
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

# --- PRODUCTION CONFIGURATION ---
app = FastAPI(title="TraceXData Intelligence PRO")

# Global CORS Configuration for Public SaaS API
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
origins = [
    "https://tracexnumber.vercel.app",
    "https://tracexnumber.web.app",
    "https://tracexdata.online",
    "https://www.tracexdata.online",
    "http://localhost:3000",
    "http://localhost:5173",
]
if allowed_origins_env:
    for o in allowed_origins_env.split(","):
        o_clean = o.strip()
        if o_clean and o_clean not in origins:
            origins.append(o_clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# Cashfree Configuration
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY")
CASHFREE_BASE_URL = os.getenv("CASHFREE_BASE_URL", "https://api.cashfree.com/pg")

INTERNAL_MASTER_KEY = os.getenv("INTERNAL_MASTER_KEY") or str(uuid.uuid4())

# --- ENGINE STATE (Lazy-loading for Render Stability) ---
_db: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    """Ensures server doesn't crash if env vars are missing during cold start."""
    global _db
    if _db is None:
        url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
        if url and key:
            try:
                _db = create_client(url, key)
            except Exception as e:
                print(f"[Supabase] Creation failed: {e}")
                return None
    return _db

async def fulfill_order(order_id: str, user_id: str):
    db = get_supabase()
    if not db:
        return

    try:
        # Check if already fulfilled
        claim_query = db.table("payment_claims").select("*").eq("payment_id", order_id).execute()
        if not claim_query.data or claim_query.data[0]['status'] == 'success':
            return

        claim = claim_query.data[0]
        plan_id = claim['plan_id']
        user_email = claim.get('user_email', 'N/A')

        # Handle manual pgpay guest payments
        if plan_id in ["pgpay_manual", "panfind"]:
            db.table("payment_claims").update({"status": "success"}).eq("payment_id", order_id).execute()
            print(f"[SaaS] Manual Guest Payment fulfilled successfully for {order_id}")
            return

        # Check if user_id is a valid UUID
        if not is_valid_uuid(user_id):
            if claim.get('user_id') and is_valid_uuid(claim['user_id']):
                user_id = claim['user_id']
                print(f"[FULFILL] Resolved non-UUID to valid user_id from claim: {user_id}")
            else:
                print(f"[FULFILL] Non-UUID user_id '{user_id}' skipped database state updates, marking order {order_id} fulfilled.")
                db.table("payment_claims").update({"status": "success"}).eq("payment_id", order_id).execute()
                return

        # Check if it's a Protection Plan
        if plan_id.startswith('protect_'):
            parts = plan_id.split('_', 2)
            if len(parts) >= 3:
                protect_type = parts[1]
                protect_target = parts[2]
                try:
                    if protect_type == 'mobile':
                        exist = db.table("protected_numbers").select("*").eq("phone_number", protect_target).execute()
                        if not exist.data:
                            db.table("protected_numbers").insert({
                                "phone_number": protect_target,
                                "owner_id": user_id
                            }).execute()
                        print(f"[FULFILL] Protected mobile number '{protect_target}' for user {user_id}")
                    elif protect_type == 'telegram':
                        clean_un = protect_target.replace('@', '')
                        exist1 = db.table("protected_telegrams").select("*").eq("telegram_id", clean_un).execute()
                        if not exist1.data:
                            db.table("protected_telegrams").insert({
                                "telegram_id": clean_un,
                                "owner_id": user_id
                            }).execute()
                        
                        at_un = f"@{clean_un}"
                        exist2 = db.table("protected_telegrams").select("*").eq("telegram_id", at_un).execute()
                        if not exist2.data:
                            db.table("protected_telegrams").insert({
                                "telegram_id": at_un,
                                "owner_id": user_id
                            }).execute()
                        print(f"[FULFILL] Protected telegram handles '{clean_un}' & '{at_un}' for user {user_id}")
                    elif protect_type == 'vehicle':
                        clean_veh = protect_target.upper().strip()
                        exist = db.table("protected_vehicles").select("*").eq("vehicle_number", clean_veh).execute()
                        if not exist.data:
                            db.table("protected_vehicles").insert({
                                "vehicle_number": clean_veh,
                                "owner_id": user_id
                            }).execute()
                        print(f"[FULFILL] Protected vehicle number '{clean_veh}' for user {user_id}")
                except Exception as db_err:
                    print(f"[FULFILL] Error inserting protected item: {db_err}")
            
            db.table("payment_claims").update({"status": "success"}).eq("payment_id", order_id).execute()
            return

        # Check if it's an API Plan
        is_api_plan = 'a15' in plan_id or 'a30' in plan_id or plan_id.startswith('api_')
        if is_api_plan:
            api_key = f"tx_{secrets.token_hex(16)}"
            days = 30
            limit = None
            plan_name = "Number Lookup (1 Month)"

            if plan_id == 'api_number_20':
                plan_name = "Number Lookup API (40 Lookups)"; days = 30; limit = 40
            elif plan_id == 'api_number_50':
                plan_name = "Number Lookup API (200 Lookups)"; days = 30; limit = 200
            elif plan_id == 'api_telegram_20':
                plan_name = "Telegram Lookup API (5 Lookups)"; days = 30; limit = 5
            elif plan_id == 'api_telegram_50':
                plan_name = "Telegram Lookup API (20 Lookups)"; days = 30; limit = 20
            elif plan_id == 'api_identity_20':
                plan_name = "Identity Card API (5 Lookups)"; days = 30; limit = 5
            elif plan_id == 'api_identity_50':
                plan_name = "Identity Card API (30 Lookups)"; days = 30; limit = 30
            elif plan_id == 'api_vehicle_20':
                plan_name = "Vehicle Lookup API (10 Lookups)"; days = 30; limit = 10
            elif plan_id == 'api_bank_20':
                plan_name = "BA&NK Lookup API (20 Lookups)"; days = 30; limit = 20
            elif plan_id == 'api_number':
                plan_name = "Number Lookup (1 Month)"
            elif plan_id == 'api_telegram':
                plan_name = "Telegram Lookup (1 Month)"
            elif plan_id == 'api_identity':
                plan_name = "Identity Card Lookup (1 Month)"
            elif plan_id == 'api_bank':
                plan_name = "BA&NK Lookup (1 Month)"
            elif plan_id == 'api_vehicle':
                plan_name = "Vehicle Lookup (1 Month)"
            elif plan_id == 'api_pancard':
                plan_name = "PN Card Lookup (1 Month)"
            elif plan_id == 'api_rasion':
                plan_name = "Rasion Card Lookup (1 Month)"
            elif plan_id == 'api_combo':
                plan_name = "All Combo Special (1 Month)"
            else:
                days = 15
                limit = 500
                plan_name = "15 Days API (500 Req)"
                if 'unl' in plan_id:
                    limit = None
                    plan_name = "15 Days Unlimited API" if '15' in plan_id else "1 Month Unlimited API"
                if '30' in plan_id:
                    days = 30
                if '1000' in plan_id:
                    limit = 1000
                    plan_name = "1 Month API (1000 Req)"
                elif '500' in plan_id:
                    limit = 500
                    plan_name = "15 Days API (500 Req)"

            expires_at = (datetime.utcnow() + timedelta(days=days)).isoformat()
            
            db.table("api_keys").insert({
                "api_key": api_key,
                "user_id": user_id,
                "user_email": user_email,
                "plan_name": plan_name,
                "duration_days": days,
                "request_limit": limit,
                "expires_at": expires_at,
                "order_id": order_id
            }).execute()

            db.table("payment_claims").update({"status": "success"}).eq("payment_id", order_id).execute()
            print(f"[FULFILL] Created API Key for {user_id} of plan {plan_name}")
            return

        # Regular Credit/Unlimited Plans
        profile_query = db.table("profiles").select("*").eq("id", user_id).execute()
        if not profile_query.data:
            return
        
        profile = profile_query.data[0]
        update_data = {}

        # Use more flexible ID checking with dynamic numeric credits support
        credits_to_add = 0
        if plan_id in ['c10', 'credit_10']: credits_to_add = 15
        elif plan_id in ['c20', 'credit_20']: credits_to_add = 30
        elif plan_id in ['c40', 'credit_40']: credits_to_add = 60
        elif plan_id in ['c50', 'credit_50']: credits_to_add = 75
        elif plan_id in ['c100', 'credit_100']: credits_to_add = 150
        elif plan_id in ['c150', 'credit_150']: credits_to_add = 225
        elif plan_id in ['c250', 'credit_250']: credits_to_add = 412
        elif plan_id in ['c500', 'credit_500']: credits_to_add = 900
        elif plan_id in ['c1000', 'credit_1000']: credits_to_add = 1950
        else:
            # Dynamic fallback: if plan_id is of form cXX or credit_XX
            import re
            m = re.match(r'^(?:c|credit_?)(\d+)$', str(plan_id))
            if m:
                try:
                    credits_to_add = int(m.group(1))
                except ValueError:
                    pass

        if credits_to_add > 0:
            update_data['credits'] = (profile.get('credits') or 0) + credits_to_add
            print(f"[FULFILL] Determined {credits_to_add} credits to add from plan_id '{plan_id}'")
        elif plan_id.startswith('u') or plan_id.startswith('unlimited'):
            # Hours mapping
            hours_map = {
                'u1h': 1, 'unlimited_1h': 1,
                'u1d': 24, 'u24h': 24, 'unlimited_24h': 24, 'unlimited_1d': 24,
                'u1w': 168, 'unlimited_1w': 168,
                'u1m': 720, 'unlimited_1m': 720
            }
            hours = hours_map.get(plan_id, 0)
            if not hours and 'h' in plan_id:
                try: hours = int(plan_id.split('h')[0].replace('u', '').replace('unlimited_', ''))
                except: hours = 0
            
            if hours > 0:
                now = datetime.utcnow()
                start = now
                expiry_str = profile.get('unlimited_expiry')
                if expiry_str:
                    try:
                        clean_expiry = expiry_str.replace('Z', '+00:00')
                        start = datetime.fromisoformat(clean_expiry).replace(tzinfo=None)
                    except Exception as date_err:
                        print(f"[FULFILL] Error parsing unlimited_expiry '{expiry_str}': {date_err}")
                        start = now
                if start < now:
                    start = now
                update_data['unlimited_expiry'] = (start + timedelta(hours=hours)).isoformat()

        if update_data:
            db.table("profiles").update(update_data).eq("id", user_id).execute()
            db.table("payment_claims").update({"status": "success"}).eq("payment_id", order_id).execute()
            print(f"[FULFILL] Updated profile for {user_id}")
            
    except Exception as e:
        print(f"Fulfillment error: {e}")

# --- SECURITY & PROFILE HELPERS ---

def get_user_from_token(request: Request) -> Optional[Any]:
    db = get_supabase()
    if not db:
        return None
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    if not token:
        return None
    try:
        user_response = db.auth.get_user(token)
        return user_response.user if user_response else None
    except Exception as e:
        print(f"[get_user_from_token] error: {e}")
        return None

def get_user_id(user) -> str:
    if hasattr(user, "id"):
        return str(user.id)
    if isinstance(user, dict):
        return str(user.get("id", ""))
    return ""

def get_user_email(user) -> str:
    if hasattr(user, "email"):
        return str(user.email or "")
    if isinstance(user, dict):
        return str(user.get("email", ""))
    return ""

def get_user_metadata(user) -> dict:
    if hasattr(user, "user_metadata"):
        return user.user_metadata or {}
    if isinstance(user, dict):
        return user.get("user_metadata") or {}
    return {}

def get_admin_user_or_raise(request: Request):
    user = get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session key. Please login again.")
        
    admin_emails = [
        "yashwinderbeniwaldm@gmail.com",
        "gaurav_beniwal_0001@example.com",
        "gauravbeniwal30003@gmail.com",
        "gauravbeniwal3003@gmail.com"
    ]
    email = get_user_email(user)
    if not email or email.lower().strip() not in admin_emails:
        raise HTTPException(status_code=403, detail="Access Denied: You are not authorized as an Administrator.")
    return user

# --- SECURITY & AUTH ROUTING ---

def get_client_ip(request: Request) -> str:
    # Check common proxy headers
    for header in ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"]:
        val = request.headers.get(header)
        if val:
            # x-forwarded-for can be a list of IPs, return the first one
            if "," in val:
                return val.split(",")[0].strip()
            return val.strip()
    # Fallback to direct client host
    if request.client:
        return request.client.host
    return "0.0.0.0"

@app.post("/api/visitor/log")
async def log_visitor(request: Request):
    db = get_supabase()
    if not db:
        return {"status": "error", "message": "Database offline"}
    
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent") or ""
    
    try:
        db.table("visitor_logs").insert({
            "ip_address": ip,
            "user_agent": ua
        }).execute()
        return {"status": "success", "ip": ip}
    except Exception as e:
        print(f"Error logging visitor: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/profile")
async def get_profile(request: Request):
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
    
    user = get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized: Token missing or invalid")
    
    try:
        user_id_val = get_user_id(user)
        user_email_val = get_user_email(user)
        profile_response = db.table("profiles").select("*").eq("id", user_id_val).execute()
        profile_data = profile_response.data
        
        now_str = datetime.utcnow().isoformat() + "Z"
        client_ip = get_client_ip(request)
        
        # Update last login IP address
        try:
            db.table("profiles").update({"last_login_ip": client_ip}).eq("id", user_id_val).execute()
        except Exception as ip_err:
            print(f"Error updating last_login_ip: {ip_err}")
        
        if not profile_data:
            full_name = "User"
            avatar_url = None
            metadata = get_user_metadata(user)
            if metadata:
                full_name = metadata.get("full_name") or user_email_val.split("@")[0] or "User"
                avatar_url = metadata.get("avatar_url")
            elif user_email_val:
                full_name = user_email_val.split("@")[0]
                
            new_profile = {
                "id": user_id_val,
                "email": user_email_val,
                "credits": 10,
                "unlimited_expiry": None,
                "full_name": full_name,
                "avatar_url": avatar_url,
                "is_free_credit_claimed": True,
                "last_weekly_credit_at": now_str,
                "last_daily_credit_at": now_str,
                "last_login_ip": client_ip
            }
            insert_response = db.table("profiles").insert(new_profile).execute()
            if insert_response.data:
                return insert_response.data[0]
            return new_profile
        else:
            profile = profile_data[0]
            profile["last_login_ip"] = client_ip
            last_daily_str = profile.get("last_daily_credit_at")
            should_give_daily = False
            
            if not last_daily_str:
                should_give_daily = True
            else:
                try:
                    clean_last_daily = last_daily_str.replace("Z", "")
                    if "+" in clean_last_daily:
                        clean_last_daily = clean_last_daily.split("+")[0]
                    last_daily_dt = datetime.fromisoformat(clean_last_daily)
                    if datetime.utcnow() - last_daily_dt >= timedelta(hours=24):
                        should_give_daily = True
                except Exception as ex:
                    print(f"Error parsing last_daily_credit_at: {ex}")
                    should_give_daily = True
                    
            if should_give_daily:
                updated_credits = profile.get("credits") or 0
                update_payload = {
                    "last_daily_credit_at": now_str
                }
                if updated_credits < 10:
                    update_payload["credits"] = 10
                
                try:
                    update_response = db.table("profiles").update(update_payload).eq("id", user_id_val).execute()
                    if update_response.data:
                        return update_response.data[0]
                except Exception as ex:
                    print(f"Error updating daily credits: {ex}")
            
            return profile
            
    except Exception as e:
        print(f"Error in /api/profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile/update")
async def update_profile(payload: dict = Body(...), request: Request = None):
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    user = get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    full_name = payload.get("full_name")
    avatar_url = payload.get("avatar_url")
    
    update_data = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if avatar_url is not None:
        update_data["avatar_url"] = avatar_url
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    try:
        user_id_val = get_user_id(user)
        update_response = db.table("profiles").update(update_data).eq("id", user_id_val).execute()
        if update_response.data:
            return update_response.data[0]
        raise HTTPException(status_code=404, detail="Profile not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user-keys")
async def get_user_keys(request: Request):
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    user = get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        user_id_val = get_user_id(user)
        response = db.table("api_keys").select("*").eq("user_id", user_id_val).execute()
        sorted_keys = sorted(response.data or [], key=lambda k: k.get("created_at", ""), reverse=True)
        return sorted_keys
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-protected")
async def check_protected_number(payload: dict = Body(...)):
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    type_val = payload.get("type")
    query_val = payload.get("query")
    
    if not type_val or not query_val:
        raise HTTPException(status_code=400, detail="Missing type or query")
        
    try:
        is_protected = False
        if type_val == 'phone':
            import re
            clean_phone = re.sub(r'\D', '', str(query_val))
            exist = db.table('protected_numbers').select('phone_number').eq('phone_number', clean_phone).execute()
            if exist.data:
                is_protected = True
        elif type_val == 'telegram':
            clean_tg = str(query_val).replace('@', '').strip()
            with_at = f"@{clean_tg}"
            exist1 = db.table('protected_telegrams').select('telegram_id').eq('telegram_id', clean_tg).execute()
            exist2 = db.table('protected_telegrams').select('telegram_id').eq('telegram_id', with_at).execute()
            if exist1.data or exist2.data:
                is_protected = True
                
        return {"isProtected": is_protected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ADMIN ENDPOINTS ---

@app.get("/api/admin/system")
async def admin_system(request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        api_keys_res = db.table('api_keys').select('*').execute()
        api_keys_data = api_keys_res.data or []
        api_keys_data = sorted(api_keys_data, key=lambda k: k.get("created_at", ""), reverse=True)
        
        try:
            api_logs_res = db.table('api_logs').select('*').execute()
            api_logs_data = api_logs_res.data or []
            api_logs_data = sorted(api_logs_data, key=lambda l: l.get("created_at", ""), reverse=True)[:50]
        except Exception:
            api_logs_data = []
            
        try:
            settings_res = db.table('api_settings').select('*').limit(1).execute()
            settings_data = settings_res.data[0] if settings_res.data else None
        except Exception:
            settings_data = None
            
        try:
            total_keys_res = db.table('api_keys').select('id', count='exact').execute()
            total_keys = total_keys_res.count if total_keys_res.count is not None else len(api_keys_data)
        except Exception:
            total_keys = len(api_keys_data)
            
        try:
            active_keys_res = db.table('api_keys').select('id', count='exact').eq('status', 'active').execute()
            active_keys = active_keys_res.count if active_keys_res.count is not None else len([k for k in api_keys_data if k.get("status") == "active"])
        except Exception:
            active_keys = len([k for k in api_keys_data if k.get("status") == "active"])
            
        try:
            total_logs_res = db.table('api_logs').select('id', count='exact').execute()
            total_requests = total_logs_res.count if total_logs_res.count is not None else len(api_logs_data)
        except Exception:
            total_requests = len(api_logs_data)
            
        try:
            user_count_res = db.table('profiles').select('id', count='exact').execute()
            total_users = user_count_res.count if user_count_res.count is not None else 0
        except Exception:
            total_users = 0
            
        try:
            # Calculate 24h unique visitors
            from datetime import timedelta
            time_24h_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat() + "Z"
            visitor_res = db.table("visitor_logs").select("ip_address").gte("created_at", time_24h_ago).execute()
            visitor_ips = [item.get("ip_address") for item in (visitor_res.data or []) if item.get("ip_address")]
            unique_visitors = len(set(visitor_ips))
        except Exception as e:
            print(f"Error calculating 24h visitors: {e}")
            unique_visitors = 0
            
        pricing = {
            'Unified Pro API (15 Days)': 299,
            'Unified Pro API (30 Days)': 599,
            'Identity Lookup (1 Month)': 499,
            'Bank/IFSC Lookup (1 Month)': 499,
            'Vehicle Lookup (1 Month)': 499,
            'PN Card Lookup (1 Month)': 999,
            'PAN Card Lookup (1 Month)': 999,
            'All Combo Special (1 Month)': 1499
        }
        
        revenue = 0
        for key_item in api_keys_data:
            plan_name = key_item.get('plan_name')
            revenue += pricing.get(plan_name, 0)
            
        keys_map = {k.get('id'): k.get('user_email', 'N/A') for k in api_keys_data if k.get('id')}
        for log in api_logs_data:
            log['api_keys'] = {
                'user_email': keys_map.get(log.get('api_key_id'), 'N/A')
            }
        
        return {
            "status": "success",
            "data": {
                "isServiceRoleActive": True,
                "apiKeys": api_keys_data[:100],
                "apiLogs": api_logs_data,
                "settings": settings_data,
                "stats": {
                    "totalKeys": total_keys,
                    "totalRequests": total_requests,
                    "activeKeys": active_keys,
                    "revenue": revenue,
                    "totalUsers": total_users,
                    "uniqueVisitors": unique_visitors
                }
            }
        }
    except Exception as e:
        print(f"Error in admin system: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/profiles")
async def get_admin_profiles(request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        all_profiles = []
        limit = 1000
        offset = 0
        while True:
            profile_res = db.table("profiles").select("*").range(offset, offset + limit - 1).execute()
            data = profile_res.data or []
            all_profiles.extend(data)
            if len(data) < limit:
                break
            offset += limit
            
        all_profiles = sorted(all_profiles, key=lambda p: (p.get("email") or "").lower())
        return {"status": "success", "data": all_profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/profiles")
async def create_admin_profile(payload: dict = Body(...), request: Request = None):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    id_val = payload.get("id") or str(uuid.uuid4())
    full_name = payload.get("full_name") or email.split("@")[0]
    credits_val = int(payload.get("credits") or 0)
    unlimited_expiry = payload.get("unlimited_expiry")
    
    if unlimited_expiry:
        try:
            unlimited_expiry = datetime.fromisoformat(unlimited_expiry.replace("Z", "")).isoformat() + "Z"
        except Exception:
            pass
            
    try:
        new_profile = {
            "id": id_val,
            "email": email.strip().lower(),
            "full_name": full_name.strip(),
            "credits": credits_val,
            "unlimited_expiry": unlimited_expiry,
            "is_free_credit_claimed": True,
            "last_weekly_credit_at": datetime.utcnow().isoformat() + "Z"
        }
        insert_res = db.table("profiles").insert(new_profile).execute()
        return {"status": "success", "data": insert_res.data[0] if insert_res.data else new_profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/profiles/{id}")
async def update_admin_profile(id: str, payload: dict = Body(...), request: Request = None):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    email = payload.get("email")
    full_name = payload.get("full_name")
    credits_val = int(payload.get("credits") or 0)
    unlimited_expiry = payload.get("unlimited_expiry")
    
    if unlimited_expiry:
        try:
            unlimited_expiry = datetime.fromisoformat(unlimited_expiry.replace("Z", "")).isoformat() + "Z"
        except Exception:
            pass
            
    update_payload = {
        "id": id,
        "email": email,
        "full_name": full_name or "",
        "credits": credits_val,
        "unlimited_expiry": unlimited_expiry
    }
    
    try:
        update_res = db.table("profiles").upsert(update_payload, on_conflict="id").execute()
        return {"status": "success", "data": update_res.data[0] if update_res.data else update_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/profiles/{id}")
async def delete_admin_profile(id: str, request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        db.table("profiles").delete().eq("id", id).execute()
        return {"status": "success", "message": "User profile deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/earnings")
async def get_admin_earnings(request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        claims_res = db.table("payment_claims").select("*").execute()
        claims = claims_res.data or []
        claims = sorted(claims, key=lambda c: c.get("created_at", ""), reverse=True)
        
        now_dt = datetime.utcnow()
        def get_ist_date_string(dt: datetime) -> str:
            ist_time = dt + timedelta(hours=5, minutes=30)
            return ist_time.strftime("%Y-%m-%d")
            
        today_str = get_ist_date_string(now_dt)
        yesterday_dt = now_dt - timedelta(days=1)
        yesterday_str = get_ist_date_string(yesterday_dt)
        seven_days_ago = now_dt - timedelta(days=7)
        
        today_earning = 0
        yesterday_earning = 0
        week_earning = 0
        total_earning = 0
        
        all_transactions = []
        user_ids = []
        
        for claim in claims:
            amount = float(claim.get("amount") or 0)
            status = claim.get("status")
            claim_created = claim.get("created_at")
            
            try:
                clean_created = claim_created.replace("Z", "")
                if "+" in clean_created:
                    clean_created = clean_created.split("+")[0]
                claim_dt = datetime.fromisoformat(clean_created)
            except Exception:
                claim_dt = now_dt
                
            claim_date_str = get_ist_date_string(claim_dt)
            
            if status == "success":
                total_earning += amount
                if claim_date_str == today_str:
                    today_earning += amount
                elif claim_date_str == yesterday_str:
                    yesterday_earning += amount
                if claim_dt >= seven_days_ago:
                    week_earning += amount
                    
            user_id = claim.get("user_id")
            if user_id:
                user_ids.append(user_id)
                
            all_transactions.append({
                "id": claim.get("id"),
                "payment_id": claim.get("payment_id"),
                "user_id": user_id,
                "plan_id": claim.get("plan_id"),
                "amount": amount,
                "status": status,
                "created_at": claim_created
            })
            
        profiles_by_user_id = {}
        unique_user_ids = list(set(user_ids))
        if unique_user_ids:
            try:
                profiles_res = db.table("profiles").select("id, email, full_name").execute()
                for p in (profiles_res.data or []):
                    profiles_by_user_id[p.get("id")] = p
            except Exception:
                pass
                
        enriched_transactions = []
        for t in all_transactions:
            user_id = t["user_id"]
            profile = profiles_by_user_id.get(user_id, {}) if user_id else {}
            enriched_transactions.append({
                **t,
                "user_email": profile.get("email", "N/A") if user_id else "Guest User",
                "user_name": profile.get("full_name", "") if user_id else ""
            })
            
        return {
            "status": "success",
            "summary": {
                "today": today_earning,
                "yesterday": yesterday_earning,
                "week": week_earning,
                "total": total_earning
            },
            "transactions": enriched_transactions[:100]
        }
    except Exception as e:
        print(f"Error in admin earnings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/history")
async def get_admin_history(request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        history_res = db.table("search_history").select("*").execute()
        sorted_history = sorted(history_res.data or [], key=lambda h: h.get("created_at", ""), reverse=True)[:150]
        return {"status": "success", "data": sorted_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/api-keys")
async def get_admin_api_keys(request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        keys_res = db.table("api_keys").select("*").execute()
        sorted_keys = sorted(keys_res.data or [], key=lambda k: k.get("created_at", ""), reverse=True)
        return {"data": sorted_keys}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/api-keys")
async def create_admin_api_key(payload: dict = Body(...), request: Request = None):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    user_email = payload.get("user_email")
    plan_name = payload.get("plan_name")
    days = int(payload.get("days") or 30)
    custom_key = payload.get("custom_key")
    
    api_key = custom_key or f"tx_{secrets.token_hex(16)}"
    expires_at = (datetime.utcnow() + timedelta(days=days)).isoformat() + "Z"
    
    new_key = {
        "user_email": user_email,
        "api_key": api_key,
        "plan_name": plan_name,
        "requests_used": 0,
        "request_limit": None,
        "expires_at": expires_at,
        "status": "active"
    }
    
    try:
        insert_res = db.table("api_keys").insert(new_key).execute()
        return {"data": insert_res.data[0] if insert_res.data else new_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/api-keys/{id}")
async def update_admin_api_key(id: str, payload: dict = Body(...), request: Request = None):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    plan_name = payload.get("plan_name")
    status = payload.get("status")
    expires_at = payload.get("expires_at")
    user_email = payload.get("user_email")
    
    update_payload = {
        "plan_name": plan_name,
        "request_limit": None,
        "status": status,
        "expires_at": expires_at,
        "user_email": user_email
    }
    
    try:
        db.table("api_keys").update(update_payload).eq("id", id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/api-keys/{id}")
async def delete_admin_api_key(id: str, request: Request):
    get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    try:
        db.table("api_keys").delete().eq("id", id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/api-settings")
async def create_admin_api_settings(payload: dict = Body(...), request: Request = None):
    admin_user = get_admin_user_or_raise(request)
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
        
    id_val = payload.get("id")
    real_api_url = payload.get("real_api_url")
    
    upsert_payload = {
        "real_api_url": real_api_url,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "updated_by": get_user_id(admin_user)
    }
    if id_val:
        upsert_payload["id"] = id_val
        
    try:
        db.table("api_settings").upsert(upsert_payload).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- END SECURITY & AUTH ROUTING ---

@app.post("/api/cashfree/create-order")
async def create_order(payload: dict = Body(...), request: Request = None):
    plan_id = payload.get("plan_id")
    is_pg_pay = plan_id in ["pgpay_manual", "panfind"]
    
    db = get_supabase()
    if not db and not is_pg_pay:
        return {"error": "Server connection failure"}

    user_id = payload.get("user_id")
    amount = payload.get("amount")
    user_email = payload.get("user_email", "customer@example.com")
    customer_phone = payload.get("customer_phone", "9999999999")
    
    # Default origin fallback
    origin = "https://tracexdata-api.onrender.com"
    if request and request.headers.get("origin"):
        origin = request.headers.get("origin")
        
    return_url = payload.get("return_url", f"{origin}?order_id={{order_id}}")

    if not user_id or not plan_id or not amount:
        return {"error": "Missing required parameters"}

    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        return {"error": "Payment gateway credentials not set"}

    order_id = f"order_{int(time.time())}_{secrets.token_hex(3)}"
    
    cf_payload = {
        "order_id": order_id,
        "order_amount": float(amount),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": user_id,
            "customer_email": user_email,
            "customer_phone": customer_phone
        },
        "order_meta": {
            "return_url": return_url
        }
    }

    try:
        headers = {
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
        }
        resp = requests.post(f"{CASHFREE_BASE_URL}/orders", json=cf_payload, headers=headers)
        data = resp.json()

        if resp.status_code != 200:
            return {"error": data.get("message", "Cashfree error")}

        # Log pending claim
        if db:
            db_user_id = user_id if is_valid_uuid(user_id) else None
            try:
                db.table("payment_claims").insert({
                    "payment_id": order_id,
                    "user_id": db_user_id,
                    "plan_id": plan_id,
                    "amount": float(amount),
                    "status": "pending"
                }).execute()
            except Exception as dberr:
                print(f"[DB_CLAIM_ERR] {dberr}")
        else:
            print("[TRACEXDATA] Supabase database offline. Proceeding without payment claim logging.")

        return data
    except Exception as e:
        return {"error": f"Gateway Exception: {str(e)}"}

@app.get("/api/cashfree/status/{order_id}")
async def get_status(order_id: str):
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        return {"error": "Credentials missing"}

    try:
        headers = {
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01"
        }
        resp = requests.get(f"{CASHFREE_BASE_URL}/orders/{order_id}", headers=headers)
        data = resp.json()

        if resp.status_code == 200 and data.get("order_status") == "PAID":
            await fulfill_order(order_id, data['customer_details']['customer_id'])
        
        db = get_supabase()
        if db:
            claim_query = db.table("payment_claims").select("plan_id").eq("payment_id", order_id).execute()
            if claim_query.data:
                data["plan_id"] = claim_query.data[0]["plan_id"]
        
        return data
    except Exception as e:
        return {"error": str(e)}

# --- THE "TECH VISHAL" STYLE FORMATTER ---
def clean_branding_text_line_by_line(raw_text: str) -> str:
    if not raw_text:
        return ""
    import re
    lines = raw_text.split('\n')
    cleaned_lines = []
    # Broad patterns for any kind of branding or unwanted spam lines
    forbidden_keywords = [
        "cyb3r", "s0ldier", "anish", "exploits", "buy api", "buy_api", 
        "retailer", "seller", "admin", "cyb3rs0ldier", "cyb3r_s0ldier",
        "support:", "c143", "cyber", "soldier", "userxinfo", "uersxinfo",
        "techvishal", "techvishalboss", "exploitsindia", "userx", "uersx"
    ]
    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue
        if any(fw in line_lower for fw in forbidden_keywords):
            continue
        # Strip some inline patterns
        line = re.sub(
            r'(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?|anish|exploits|userxinfo|uersxinfo|userx|uersx|vishal(?:[\s\-_]*boss)?|cyber|cyb3r|s0ldier|soldier|techvishalboss\.com|exploitsindia\.site|exploitsindia|techvishal|developer|provider|api_buy_link|website_link|buy_api|contact|support)',
            '',
            line,
            flags=re.IGNORECASE
        )
        # Strip code tag elements
        line = re.sub(r'<\/?code>', '', line)
        cleaned_lines.append(line)
    return '\n'.join(cleaned_lines)

def parse_raw_text_to_records(raw_text: str, query_val: str = None) -> dict:
    import re
    if not raw_text or not raw_text.strip():
        return {}
        
    cleaned_body = clean_branding_text_line_by_line(raw_text)
    lower_body = cleaned_body.lower()
    
    # If the response indicates empty result, return empty dictionary
    if any(term in lower_body for term in ["no result", "no records found", "unknown field", "invalid number", "not found", "no data found", "no data", "❌"]):
        return {}
        
    # Split text into sections by common delimiters
    parts = re.split(r'─{5,}|━{5,}|📌?\s*Additional\s*Result:?', cleaned_body)
    
    records = {}
    record_idx = 1
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        part_lower = part.lower()
        # Avoid section headers/footers with no useful fields
        if not any(k in part_lower for k in ["name", "mobile", "phone", "address", "branch", "ifsc", "aadhaar", "identity", "family", "email", "mail", "username", "term", "leak", "password", "database", "platform"]):
            continue
            
        record_data = {}
        part_lines = part.split('\n')
        last_key = None
        
        for line in part_lines:
            line = line.strip()
            if not line:
                continue
                
            # Strip emojis. Use a simple unicode regex
            emoji_pattern = re.compile(
                r'[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]', 
                re.UNICODE
            )
            clean_line = emoji_pattern.sub('', line).strip()
            clean_line = clean_line.replace('*', '').strip()
            if not clean_line or clean_line.startswith('─') or clean_line.startswith('━'):
                continue
            
            if ':' in clean_line:
                parts_kv = clean_line.split(':', 1)
                key_raw = parts_kv[0].strip()
                val_raw = parts_kv[1].strip()
                
                # Strip HTML tags
                val_raw = re.sub(r'<\/?code>', '', val_raw).strip()
                
                if not val_raw or val_raw.upper() in ["", "NONE", "NULL", "N/A"]:
                    last_key = None
                    continue
                    
                key_lower = key_raw.lower()
                mapped_key = ""
                
                # Standardize fields to match ResultCard definitions
                if "name" in key_lower and "father" not in key_lower:
                    mapped_key = "name"
                elif "father" in key_lower:
                    mapped_key = "father_name"
                elif "mobile" in key_lower or "phone" in key_lower:
                    mapped_key = "mobile"
                elif "address" in key_lower:
                    mapped_key = "address"
                elif "aadhaar" in key_lower or "identity" in key_lower:
                    mapped_key = "aadhar_number"
                elif "circle" in key_lower or "operator" in key_lower:
                    mapped_key = "state_circle"
                elif "branch" in key_lower:
                    mapped_key = "branch"
                elif "ifsc" in key_lower:
                    mapped_key = "ifsc"
                elif "city" in key_lower:
                    mapped_key = "city"
                elif "district" in key_lower:
                    mapped_key = "district"
                elif "state" in key_lower:
                    mapped_key = "state"
                elif "email" in key_lower or "mail" in key_lower:
                    mapped_key = "email"
                elif "password" in key_lower or "leak" in key_lower:
                    mapped_key = "password"
                elif "database" in key_lower or "source" in key_lower or "platform" in key_lower:
                    mapped_key = "platform"
                elif "family" in key_lower:
                    mapped_key = "family_id"
                else:
                    # Generic key sanitizer
                    clean_key = re.sub(r'[^a-zA-Z0-9\s_]', '', key_raw).strip().lower().replace(' ', '_')
                    if clean_key:
                        mapped_key = clean_key
                
                if mapped_key:
                    record_data[mapped_key] = val_raw
                    last_key = mapped_key
                else:
                    last_key = None
            else:
                if last_key and last_key in record_data:
                    record_data[last_key] = f"{record_data[last_key]} {clean_line}"
                        
        if record_data:
            # Set default main name key so the card displays nicely
            if "name" not in record_data:
                if "branch" in record_data:
                    record_data["name"] = record_data["branch"]
                elif "ifsc" in record_data:
                    record_data["name"] = f"IFSC: {record_data['ifsc']}"
                elif "family_id" in record_data:
                    record_data["name"] = f"Family ID: {record_data['family_id']}"
                elif "aadhar_number" in record_data:
                    record_data["name"] = f"Aadhaar: {record_data['aadhar_number']}"
                elif "email" in record_data:
                    record_data["name"] = record_data["email"]
                else:
                    record_data["name"] = "REGISTRY ENTRY"
                    
            records[f"Result {record_idx}"] = record_data
            record_idx += 1
            
    # Fallback to single general details card if body exists but could not split structured keys
    if not records and cleaned_body.strip():
        records["Result 1"] = {
            "name": "DATA ENTRY",
            "details": cleaned_body.strip()
        }
        
    return records

def clean_branding_recursive(obj):
    if isinstance(obj, dict):
        return {clean_branding_recursive(k): clean_branding_recursive(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_branding_recursive(x) for x in obj]
    elif isinstance(obj, str):
        import re
        # Aggressive regular expression matching all forms of supplier branding
        pattern = re.compile(
            r'(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?|anish|exploits|userxinfo|uersxinfo|userx|uersx|vishal(?:[\s\-_]*boss)?|cyber|cyb3r|s0ldier|soldier|techvishalboss\.com|exploitsindia\.site|exploitsindia|techvishal|developer|provider|api_buy_link|website_link|buy_api|contact|support)',
            re.IGNORECASE
        )
        val = pattern.sub("", obj)
        # Clean up multi-spaces
        val = re.sub(r'\s+', ' ', val).strip()
        # Clean trailing and leading punctuation leftover from branding removal
        val = re.sub(r'^[:\-\s@]+|[:\-\s@]+$', '', val).strip()
        if not val or val.upper() in ["", "BOSS"]:
            return "N/A"
        return val
    return obj

def make_api_response(data: dict) -> dict:
    data["api_buy_link"] = "https://tracexdata.online/buy-api"
    data["website_link"] = "https://tracexdata.online"
    return data

def build_output(raw_json: dict, query_num: str, plan_info: dict, usage: int):
    # Detect items: could be a list or a dict (Result 1, Result 2, etc.)
    items = raw_json.get('results') or raw_json.get('data') or raw_json.get('records')
    
    # Safely handle the case where raw_json is already the parsed results dictionary (e.g. from plain-text API responses)
    if not items and isinstance(raw_json, dict):
        has_nested = any(isinstance(v, dict) for v in raw_json.values())
        if has_nested:
            items = raw_json
        elif any(k in raw_json for k in ["name", "mobile", "phone", "full_name"]):
            items = {"Result 1": raw_json}
            
    clean_results = {}
    
    # CASE 1: Items is a Dictionary (e.g., {"Result 1": {...}})
    if isinstance(items, dict):
        for key, val in items.items():
            if isinstance(val, dict):
                clean_results[key] = {
                    "name": str(val.get('name', val.get('full_name', 'N/A'))).upper(),
                    "father_name": str(val.get('father_name', val.get('fathername', 'N/A'))).upper(),
                    "mobile": str(val.get('mobile', val.get('number', query_num))),
                    "alt_mobile": str(val.get('alt_mobile', 'N/A')),
                    "email": str(val.get('email', 'N/A')),
                    "aadhar_number": str(val.get('aadhar_number', 'N/A')),
                    "operator": str(val.get('operator', val.get('carrier', 'N/A'))).upper(),
                    "state_circle": str(val.get('circle', val.get('state_circle', val.get('state', 'N/A')))).upper(),
                    "address": str(val.get('address', val.get('location', 'N/A')))
                }
    
    # CASE 2: Items is a List
    elif isinstance(items, list):
        for i, val in enumerate(items, 1):
            if isinstance(val, dict):
                clean_results[f"Result {i}"] = {
                    "name": str(val.get('name', val.get('full_name', 'N/A'))).upper(),
                    "father_name": str(val.get('father_name', val.get('fathername', 'N/A'))).upper(),
                    "mobile": str(val.get('mobile', val.get('number', query_num))),
                    "alt_mobile": str(val.get('alt_mobile', 'N/A')),
                    "email": str(val.get('email', 'N/A')),
                    "aadhar_number": str(val.get('aadhar_number', 'N/A')),
                    "operator": str(val.get('operator', val.get('carrier', 'N/A'))).upper(),
                    "state_circle": str(val.get('circle', val.get('state_circle', val.get('state', 'N/A')))).upper(),
                    "address": str(val.get('address', val.get('location', 'N/A')))
                }
    
    # CASE 3: Raw response is the data itself or we can locate data inside raw_json itself
    elif raw_json.get('status') is True or raw_json.get('name') or raw_json.get('owner_name') or raw_json.get('data') or isinstance(raw_json.get('data'), list):
        clean_results["Result 1"] = {
            "name": str(raw_json.get('name', raw_json.get('owner_name', 'N/A'))).upper(),
            "father_name": str(raw_json.get('father_name', 'N/A')).upper(),
            "mobile": str(raw_json.get('mobile', query_num)),
            "alt_mobile": str(raw_json.get('alt_mobile', 'N/A')),
            "email": str(raw_json.get('email', 'N/A')),
            "aadhar_number": str(raw_json.get('aadhar_number', 'N/A')),
            "operator": str(raw_json.get('operator', 'N/A')).upper(),
            "state_circle": str(raw_json.get('circle', 'N/A')).upper(),
            "address": str(raw_json.get('address', 'N/A'))
        }

    # Clean the brand marks and references (such as Tech Vishal) recursively
    clean_results = clean_branding_recursive(clean_results)

    # All search results are retained and forwarded without truncation
    return make_api_response({
        "status": "success" if clean_results else "failed",
        "success": True if clean_results else False,
        "results_found": len(clean_results),
        "query": query_num,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %I:%M:%S %p UTC"),
        "license_info": {
            "plan_name": plan_info.get('plan_name', 'Basic'),
            "expires_at": plan_info.get('expires_at', 'N/A'),
            "requests_used": usage
        },
        "results": clean_results
    })

def sanitize_error_message(msg: str) -> str:
    lowercase_msg = str(msg or "").lower()
    if any(forbidden in lowercase_msg for forbidden in ["vishal", "tech_vishal", "techvishal", "boss", "telegram", "channel", "access denied", "restricted", "authorized", "engine error"]):
        return "API error, please try again later."
    return msg

# --- PRIMARY GATEWAY ---

@app.get("/")
async def index():
    return {
        "status": "Online",
        "engine": "TraceX Intelligence Node",
        "version": "2.8.0-STABLE"
    }

@app.get("/api/user-lookup")
async def user_lookup(
    request: Request,
    service: Optional[str] = Query(None),
    query: Optional[str] = Query(None)
):
    import urllib.parse
    import re
    import json
    import time
    from datetime import datetime
    
    if not service or not query:
        return make_api_response({
            "status": "success",
            "results": {"error": "Missing or invalid service/query"}
        })
        
    service_clean = service.lower().strip()
    cleaned_query = query.strip()
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    # Strict auth and credit deduction
    db = get_supabase()
    if not db:
        return make_api_response({
            "status": "error",
            "message": "Engine Offline: Database connection failure"
        })
        
    auth_header = request.headers.get("Authorization")
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
        profile_query = db.table("profiles").select("*").eq("id", user.id).execute()
        profile_data = profile_query.data
        
        if not profile_data:
            # Create profile on-the-fly to be completely fail-proof
            now_str = datetime.utcnow().isoformat() + "Z"
            user_email_val = get_user_email(user)
            full_name = "User"
            avatar_url = None
            metadata = get_user_metadata(user)
            if metadata:
                full_name = metadata.get("full_name") or user_email_val.split("@")[0] or "User"
                avatar_url = metadata.get("avatar_url")
            elif user_email_val:
                full_name = user_email_val.split("@")[0]
                
            new_profile = {
                "id": user.id,
                "email": user_email_val,
                "credits": 10,
                "unlimited_expiry": None,
                "full_name": full_name,
                "avatar_url": avatar_url,
                "is_free_credit_claimed": True,
                "last_weekly_credit_at": now_str,
                "last_daily_credit_at": now_str
            }
            try:
                db.table("profiles").insert(new_profile).execute()
                profile = new_profile
            except Exception as ins_err:
                print(f"[Auth profile insert err]: {ins_err}")
                profile = new_profile
        else:
            profile = profile_data[0]
            
    except Exception as profile_err:
        print(f"[Profile retrieve error]: {profile_err}")
        return make_api_response({
            "status": "error",
            "message": "Failed to retrieve your profile. Please try again later."
        })
        
    # Check unlimited plans
    is_unlimited = False
    if profile.get('unlimited_expiry'):
        try:
            clean_exp = profile['unlimited_expiry'].replace('Z', '')
            if '+' in clean_exp:
                clean_exp = clean_exp.split('+')[0]
            expiry_dt = datetime.fromisoformat(clean_exp)
            if expiry_dt > datetime.utcnow():
                is_unlimited = True
        except:
            pass
            
    credit_cost = 2
    if service_clean == 'phone':
        credit_cost = 2
    elif service_clean == 'telegram':
        credit_cost = 8
    elif service_clean == 'adhr':
        credit_cost = 10
    elif service_clean == 'bnk':
        credit_cost = 10
    elif service_clean == 'vehicle':
        credit_cost = 5
    elif service_clean == 'pancard':
        credit_cost = 10
    elif service_clean == 'aadhaar_to_pan':
        credit_cost = 150
    elif service_clean == 'email':
        credit_cost = 20
    elif service_clean == 'veh_owner_num' or service_clean == 'veh_numm':
        credit_cost = 15
        
    # Check if daily free credit top-up is due before evaluating current credits
    from datetime import timedelta
    last_daily_str = profile.get("last_daily_credit_at")
    should_give_daily = False
    now_str = datetime.utcnow().isoformat() + "Z"
    
    if not last_daily_str:
        should_give_daily = True
    else:
        try:
            clean_last_daily = last_daily_str.replace("Z", "")
            if "+" in clean_last_daily:
                clean_last_daily = clean_last_daily.split("+")[0]
            last_daily_dt = datetime.fromisoformat(clean_last_daily)
            if datetime.utcnow() - last_daily_dt >= timedelta(hours=24):
                should_give_daily = True
        except Exception as ex:
            print(f"Error parsing last_daily_credit_at in user_lookup: {ex}")
            should_give_daily = True
            
    if should_give_daily:
        updated_credits = profile.get("credits") or 0
        update_payload = {
            "last_daily_credit_at": now_str
        }
        if updated_credits < 10:
            update_payload["credits"] = 10
            
        try:
            update_response = db.table("profiles").update(update_payload).eq("id", user.id).execute()
            if update_response.data:
                profile = update_response.data[0]
        except Exception as ex:
            print(f"Error updating daily credits in user_lookup: {ex}")
            
    current_credits = int(profile.get('credits') or 0)
    
    if not is_unlimited:
        if current_credits < credit_cost:
            return make_api_response({
                "status": "error",
                "message": f"Insufficient credits. This search requires {credit_cost} credits, but you only have {current_credits} credits."
            })
            
        # Deduct credits (Try RPC first, fallback to direct table update)
        deduction_success = False
        try:
            rpc_res = db.rpc("deduct_credits", {
                "user_id": user.id,
                "amount": credit_cost
            }).execute()
            if rpc_res and rpc_res.data:
                deduction_success = True
        except Exception as rpc_err:
            print(f"[user_lookup RPC err, falling back to direct update]: {rpc_err}")
            
        if not deduction_success:
            try:
                new_credits = max(0, current_credits - credit_cost)
                db.table("profiles").update({"credits": new_credits}).eq("id", user.id).execute()
            except Exception as update_err:
                print(f"[user_lookup direct update err]: {update_err}")
                return make_api_response({
                    "status": "error",
                    "message": "Failed to deduct credits. Please try again later."
                })
            
    response_data = None
    raw_results = None
    
    try:
        if service_clean == 'phone':
            # Query the primary phone API
            new_api_url = f"https://exploitsindia.site//osint-api/number.php?exploits={urllib.parse.quote(cleaned_query)}"
            try:
                print(f"[user-lookup] Fetching phone API: {new_api_url}")
                resp = requests.get(new_api_url, headers=headers, timeout=12)
                if resp.status_code == 200:
                    text = resp.text.strip()
                    # Allow plaintext responses through
                    try:
                        parsed = resp.json()
                    except:
                        print("[user-lookup] Phone API is not JSON, parsing as plain text...")
                        parsed = parse_raw_text_to_records(text)
                    
                    if isinstance(parsed, dict):
                        try:
                            records = parsed.get("results") or parsed.get("data") or parsed.get("records")
                            if not records:
                                if any(parsed.get(k) for k in ["name", "mobile", "father_name", "full_name"]):
                                    records = {"1": parsed}
                                else:
                                    has_nested = any(isinstance(v, dict) for v in parsed.values())
                                    if has_nested:
                                        records = parsed
                            if records:
                                if isinstance(records, list):
                                    records_map = {}
                                    for idx, rec in enumerate(records):
                                        if isinstance(rec, dict):
                                            records_map[f"Result {idx + 1}"] = rec
                                    response_data = records_map
                                else:
                                    response_data = records
                            else:
                                response_data = parsed
                        except: pass
            except Exception as e:
                print(f"[Phone API primary failed]: {e}")
                
            if not response_data:
                # Fallback to saas_lookup internally
                print(f"[user-lookup] Falling back to old phone target...")
                try:
                    res = await saas_lookup(request=request, key=INTERNAL_MASTER_KEY, number=cleaned_query)
                    if res and isinstance(res, dict):
                        response_data = res.get("results")
                except Exception as fb_err:
                    print(f"[Phone API fallback failed]: {fb_err}")
                    
        else:
            api_url = ""
            if service_clean == 'adhr':
                target_query = re.sub(r'[^0-9]', '', cleaned_query)
                api_url = f"https://exploitsindia.site/osint-api/aadhar.php?exploits={urllib.parse.quote(target_query)}"
            elif service_clean == 'bnk':
                target_query = re.sub(r'[^a-zA-Z0-9]', '', cleaned_query).upper()
                api_url = f"https://exploitsindia.site/osint-api/ifsc.php?exploits={urllib.parse.quote(target_query)}"
            elif service_clean == 'vehicle':
                target_query = re.sub(r'[^a-zA-Z0-9]', '', cleaned_query).upper()
                api_url = f"https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={urllib.parse.quote(target_query)}"
            elif service_clean == 'pancard':
                target_query = re.sub(r'[^a-zA-Z0-9]', '', cleaned_query).upper()
                api_url = f"https://exploitsindia.site/osint-api/pancard.php?exploits={urllib.parse.quote(target_query)}"
            elif service_clean == 'aadhaar_to_pan' or service_clean == 'aadhaar_pan':
                target_query = re.sub(r'[^0-9]', '', cleaned_query)
                api_key = "c8117598aafa71238a4bf8377087b0ff"
                api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={urllib.parse.quote(target_query)}"
            elif service_clean == 'telegram':
                target_query = cleaned_query.lstrip('@')
                api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=uers&term={urllib.parse.quote(target_query)}"
            elif service_clean == 'email':
                api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=mail&term={urllib.parse.quote(cleaned_query)}"
            elif service_clean == 'veh_owner_num' or service_clean == 'veh_numm':
                target_query = re.sub(r'[^a-zA-Z0-9]', '', cleaned_query).upper()
                api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={urllib.parse.quote(target_query)}"
                
            if api_url:
                print(f"[user-lookup] Fetching {service_clean} from: {api_url}")
                resp = requests.get(api_url, headers=headers, timeout=15)
                if resp.status_code == 200:
                    text = resp.text or ""
                    cleaned_body = clean_branding_text_line_by_line(text)
                    raw_results = cleaned_body
                    
                    # Try to parse JSON first
                    try:
                        parsed = resp.json()
                        response_data = parsed
                    except:
                        # Parse plain text
                        parsed_records = parse_raw_text_to_records(text, cleaned_query)
                        response_data = parsed_records
                else:
                    raise Exception(f"API status {resp.status_code}")
                    
        if not response_data:
            return make_api_response({
                "status": "success",
                "results": {"error": f"No records found for query: {cleaned_query}"}
            })
            
        # Clean brandings recursively
        cleaned_data = clean_branding_recursive(response_data)
        
        # Save cache for vehicle if successful
        if service_clean == 'vehicle' and cleaned_data and isinstance(cleaned_data, dict) and len(cleaned_data) > 0 and db:
            try:
                db.table("vehicle_search_results").upsert({
                    "vehicle_number": re.sub(r'[^a-zA-Z0-9]', '', cleaned_query).upper(),
                    "raw_data": cleaned_data
                }, on_conflict="vehicle_number").execute()
            except Exception as cache_err:
                print(f"[Vehicle Cache Err] {cache_err}")
                
        ret = {
            "status": "success",
            "results": cleaned_data
        }
        if raw_results is not None:
            ret["raw_results"] = clean_branding_recursive(raw_results)
            
        return make_api_response(ret)
        
    except Exception as err:
        print(f"[user-lookup error]: {err}")
        return make_api_response({
            "status": "success",
            "results": {"error": "Search gateway is currently unavailable. Please try again later."}
        })

@app.get("/api/lookup")
async def saas_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    number: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    numquery: Optional[str] = Query(None),
    service: Optional[str] = Query(None)
):
    start_time = time.time()
    
    # Route right away if service is passed
    if service:
        service_lower = service.lower()
        if service_lower in ["adhr", "identity", "aadhaar", "aadhar"]:
            return await identity_lookup(
                request=request, 
                key=key, 
                query=query or number or numquery
            )
        elif service_lower in ["bnk", "bank", "ifsc"]:
            return await bank_lookup(
                request=request, 
                key=key, 
                query=query or number or numquery
            )
        elif service_lower in ["telegram", "tg", "tele"]:
            return await telegram_lookup(
                request=request, 
                key=key, 
                query=query or number or numquery
            )
        elif service_lower in ["vehicle", "rc", "vahan"]:
            rc_arg = request.query_params.get("rc") or query or number or numquery
            return await vehicle_lookup(
                request=request,
                key=key,
                rc=rc_arg
            )
        elif service_lower in ["email", "mail"]:
            return await email_lookup(
                request=request,
                key=key,
                query=query or number or numquery
            )
        elif service_lower in ["veh_owner_num", "veh-owner-num", "veh_numm", "veh-numm"]:
            rc_arg = request.query_params.get("rc") or query or number or numquery
            return await veh_owner_num_lookup(
                request=request,
                key=key,
                rc=rc_arg
            )


    num = (number or query or numquery or "").strip()

    import re
    if not service and num:
        if "@" in num and "." in num:
            return await email_lookup(request=request, key=key, query=num)
        elif re.match(r'^[A-Za-z]{4}0[A-Za-z0-9]{6}$', num):
            return await bank_lookup(request=request, key=key, query=num)
        elif re.match(r'^[A-Za-z0-9]{4,11}$', num) and any(c.isalpha() for c in num) and any(c.isdigit() for c in num) and "_" not in num and not num.startswith("@"):
            return await vehicle_lookup(request=request, key=key, rc=num)
        elif num.isdigit() and len(num) == 12:
            return await identity_lookup(request=request, key=key, query=num)

    try:
        # 1. Rate Limiting Check
        if not check_rate_limit(request):
            return make_api_response({"status": "error", "message": "Too many requests. Please slow down."})

        # 2. Key Check (Parameter level check)
        if not key:
            return make_api_response({"status": "error", "message": "Access Denied: Please provide your 'key' parameter"})

        db = get_supabase()
        if not db:
            return make_api_response({"status": "error", "message": "ServerDown: Database connection failure"})

        # Determine if master key is used
        is_master = key == INTERNAL_MASTER_KEY

        # 3. Authentication & Plan Validity (Must pass prior to checking target safety status to avoid enumeration attacks)
        license = None
        user_id = None
        user_email = None

        if not is_master:
            auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
            if not auth_query.data or len(auth_query.data) == 0:
                print(f"[AUTH_FAIL] Key: {key}")
                return make_api_response({"status": "error", "message": "Auth Failed: Invalid API key"})
            
            license = auth_query.data[0]
            
            # Status check
            if license.get('status') != 'active':
                return make_api_response({"status": "error", "message": "Key Suspended: Access disabled"})

            # Expiry check
            try:
                if license.get('expires_at'):
                    exp_date = datetime.fromisoformat(license['expires_at'].replace('Z', '+00:00')).replace(tzinfo=None)
                    if exp_date < datetime.utcnow():
                        return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
            except Exception as e:
                print(f"[EXPIRY_PARSE_ERR] {e}")
                pass
            
            user_id = license.get('user_id')
            user_email = license.get('user_email')
        else:
            license = {"id": "system", "plan_name": "Internal VIP", "requests_used": 0, "expires_at": "Never"}
            user_id = None
            user_email = None

        # Check permission for Number Lookup
        plan_name = license.get('plan_name') or ""
        plan_upper = str(plan_name).upper()
        is_num_allowed = any(p in plan_upper for p in ["NUMBER", "PRO", "INFINITY", "COMBO", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
        if not is_num_allowed:
            return make_api_response({
                "status": "error",
                "message": f"Access Denied: Your API key is authorized for '{plan_name}' but you initiated a 'number' query."
            })

        # Format safety check for strict Number Lookup keys
        is_strict_number_plan = "NUMBER" in plan_upper and not any(p in plan_upper for p in ["COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP"])
        if is_strict_number_plan:
            # Under a strict number lookup plan, only simple 10 digit number is allowed
            if not num.isdigit() or len(num) != 10:
                return make_api_response({
                    "status": "error",
                    "message": "Your plan is of number lookup so please enter 10 digit number"
                })

        # Check presence of input target
        if not num:
            return make_api_response({
                "status": "error",
                "message": "Input Required: Please provide a 10-digit mobile number or Telegram username. Example: numquery=98797XXXXX or numquery=@gaurav_beniwal_0001"
            })

        # 4. STRICTLY FIRST: DB PROTECTION CHECK
        # Check if target mobile number or telegram username is registered as protected
        is_protected_phone = False
        is_protected_telegram = False

        # Check Mobile Protection (only if numeric)
        if num.isdigit():
            try:
                protected_num_query = db.table("protected_numbers").select("phone_number").eq("phone_number", num).execute()
                if protected_num_query.data:
                    is_protected_phone = True
            except Exception as ep:
                print(f"[MOBILE_PROTECT_ERR] {ep}")

        # Check Telegram Protection (checking clean username and with @ symbol prefix)
        tg_clean = num.lstrip('@')
        tg_at = f"@{tg_clean}"
        try:
            protected_tg_query1 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", tg_clean).execute()
            if protected_tg_query1.data:
                is_protected_telegram = True
            else:
                protected_tg_query2 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", tg_at).execute()
                if protected_tg_query2.data:
                    is_protected_telegram = True
        except Exception as et:
            print(f"[TG_PROTECT_ERR] {et}")

        if is_protected_phone or is_protected_telegram:
            # Deduct request and update telemetry
            new_count = (license.get('requests_used') or 0) + 1
            if not is_master:
                db.table("api_keys").update({
                    "requests_used": new_count,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", license['id']).execute()

            try:
                db.table("api_logs").insert({
                    "api_key_id": license.get('id') if not is_master else None,
                    "masked_number": f"PROTECTED:{num[:5]}",
                    "status": "success",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except:
                pass

            if is_protected_phone:
                return make_api_response({
                    "status": "success",
                    "success": True,
                    "message": "Protected: This mobile number is protected on TRACEXDATA. 🛡️",
                    "results": {
                        "Mobile Match": {
                            "name": "PROTECTED RECORD",
                            "mobile": num,
                            "father_name": "PROTECTED @ TRACEX SHIELD",
                            "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                            "email": "PROTECTED @ TRACEX SHIELD",
                            "operator": "PROTECTED @ TRACEX SHIELD",
                            "state_circle": "PROTECTED @ TRACEX SHIELD",
                            "address": "PROTECTED @ TRACEX SHIELD",
                            "aadhar_number": "PROTECTED @ TRACEX SHIELD",
                            "platform": "Mobile Protection"
                        }
                    }
                })
            else:
                return make_api_response({
                    "status": "success",
                    "success": True,
                    "message": "Protected: This Telegram account is protected on TRACEXDATA. 🛡️",
                    "results": {
                        "Telegram Match": {
                            "name": "PROTECTED RECORD",
                            "telegram_id": num,
                            "mobile": "PROTECTED @ TRACEX SHIELD",
                            "father_name": "PROTECTED @ TRACEX SHIELD",
                            "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                            "email": "PROTECTED @ TRACEX SHIELD",
                            "operator": "PROTECTED @ TRACEX SHIELD",
                            "state_circle": "PROTECTED @ TRACEX SHIELD",
                            "address": "PROTECTED @ TRACEX SHIELD",
                            "platform": "Telegram Lookup"
                        }
                    }
                })

        # 5. INPUT FORMAT COMPLIANCE VALIDATION
        # Dynamic detection whether the input is a Telegram handle or standard mobile number
        is_telegram_query = False
        if any(c.isalpha() for c in num) or num.startswith("@") or "_" in num:
            is_telegram_query = True

        if is_telegram_query:
            # Validate Telegram length
            if len(num) < 3:
                return make_api_response({
                    "status": "error",
                    "message": "Invalid Format: Telegram username/handle must be at least 3 characters long. (e.g. '@gaurav_beniwal_0001')"
                })
        else:
            # Strict 10-Digit Mobile Number Validation
            if not num.isdigit() or len(num) != 10:
                return make_api_response({
                    "status": "error",
                    "message": f"Invalid Query: '{num}' is not a 10-digit mobile number"
                })

        # 6. Log search queries
        try:
            db.table("search_logs").insert({
                "user_id": user_id,
                "user_email": user_email,
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0",
                "search_query": num
            }).execute()
        except Exception as e:
            print(f"[LOG_ERR] {e}")

        # 7. Quota limitation checks
        requests_used = license.get('requests_used') or 0
        limit = license.get('request_limit')
        if limit is not None and int(requests_used) >= int(limit):
            return make_api_response({"status": "error", "message": "Quota Exhausted: Plan limit reached"})

        # 8. Intelligence Source Dispatch
        if is_telegram_query:
            # LIVE API CALL FOR TELEGRAM username LOOKUP
            target_username = num if num.startswith('@') else f"@{num}"
            api_url = f"https://exploitsindia.site//osint-api/telegram.php?exploits={requests.utils.quote(target_username)}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
                "Accept": "text/plain,text/html,application/json,*/*"
            }

            try:
                resp = requests.get(api_url, timeout=15, headers=headers)
                if resp.status_code != 200:
                    return make_api_response({"status": "error", "message": "API Source currently unreachable"})

                text = resp.text or ""
                cleanedText = clean_branding_text_line_by_line(text)
                lowerText = cleanedText.lower()

                if "no result" in lowerText or "no records found" in lowerText or not cleanedText.strip():
                    return make_api_response({"status": "success", "results": {}, "message": "no data found"})

                import re
                usernameMatch = re.search(r"(?:Username|User):\s*([^\s\n\r]+)", cleanedText, re.IGNORECASE)
                idMatch = re.search(r"(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?", cleanedText, re.IGNORECASE)
                phoneMatch = re.search(r"(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?", cleanedText, re.IGNORECASE)
                countryMatch = re.search(r"Country:\s*([^\n\r]+)", cleanedText, re.IGNORECASE)
                codeMatch = re.search(r"Country Code:\s*([^\n\r]+)", cleanedText, re.IGNORECASE)

                username = usernameMatch.group(1).strip() if usernameMatch else target_username
                telegram_id = idMatch.group(1).strip() if idMatch else "N/A"
                phone = phoneMatch.group(1).strip() if phoneMatch else "N/A"
                country = countryMatch.group(1).strip() if countryMatch else "N/A"
                country_code = codeMatch.group(1).strip() if codeMatch else "N/A"

                if telegram_id == "N/A" and phone == "N/A":
                    return make_api_response({
                        "status": "success", 
                        "results": {}, 
                        "message": "no data found"
                    })

                # Post-fetch validation to verify protection status (both for Telegram ID and username)
                post_protected = False
                if telegram_id != "N/A":
                    try:
                        p_query_id = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", telegram_id).execute()
                        if p_query_id and p_query_id.data:
                            post_protected = True
                    except Exception as e_post1:
                        print(f"[POST_ID_PROTECT_ERR] {e_post1}")

                if not post_protected and username and username != "N/A":
                    clean_un = username.lstrip('@')
                    at_un = f"@{clean_un}"
                    try:
                        p_query_un1 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", clean_un).execute()
                        if p_query_un1 and p_query_un1.data:
                            post_protected = True
                        else:
                            p_query_un2 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", at_un).execute()
                            if p_query_un2 and p_query_un2.data:
                                post_protected = True
                    except Exception as e_post2:
                        print(f"[POST_UN_PROTECT_ERR] {e_post2}")

                if post_protected:
                    # Deduct telemetry count and return shielded/protected response
                    new_count = (license.get('requests_used') or 0) + 1
                    if not is_master:
                        db.table("api_keys").update({
                            "requests_used": new_count,
                            "last_used_at": datetime.utcnow().isoformat()
                        }).eq("id", license['id']).execute()

                    try:
                        db.table("api_logs").insert({
                            "api_key_id": license.get('id') if not is_master else None,
                            "masked_number": f"PROTECTED:{num[:5]}",
                            "status": "success",
                            "response_time_ms": int((time.time() - start_time) * 1000),
                            "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                        }).execute()
                    except:
                        pass

                    return make_api_response({
                        "status": "success",
                        "success": True,
                        "message": "Protected: This Telegram account is protected on TRACEXDATA. 🛡️",
                        "results": {
                            "Telegram Match": {
                                "name": "PROTECTED RECORD",
                                "telegram_id": telegram_id if telegram_id != "N/A" else num,
                                "mobile": "PROTECTED @ TRACEX SHIELD",
                                "father_name": "PROTECTED @ TRACEX SHIELD",
                                "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                                "email": "PROTECTED @ TRACEX SHIELD",
                                "operator": "PROTECTED @ TRACEX SHIELD",
                                "state_circle": "PROTECTED @ TRACEX SHIELD",
                                "address": "PROTECTED @ TRACEX SHIELD",
                                "platform": "Telegram Lookup"
                            }
                        }
                    })

                results = {
                    "Telegram Match": {
                        "name": username,
                        "telegram_id": telegram_id,
                        "mobile": phone,
                        "father_name": "N/A",
                        "alt_mobile": country_code,
                        "email": "N/A",
                        "operator": country,
                        "state_circle": "N/A",
                        "address": "N/A",
                        "platform": "Telegram Lookup"
                    }
                }

                new_count = (license.get('requests_used') or 0) + 1
                if not is_master:
                    db.table("api_keys").update({
                        "requests_used": new_count,
                        "last_used_at": datetime.utcnow().isoformat()
                    }).eq("id", license['id']).execute()

                # Format final response
                output = make_api_response({
                    "status": "success",
                    "success": True,
                    "results": results,
                    "credits_remaining": (int(limit) - new_count) if (limit is not None and not is_master) else 999999,
                    "requests_used": new_count if not is_master else 0,
                    "execution_time_ms": int((time.time() - start_time) * 1000)
                })

                try:
                    db.table("api_logs").insert({
                        "api_key_id": license.get('id') if not is_master else None,
                        "masked_number": f"TG: {num[:12]}",
                        "status": "success",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass

                return output
            except Exception as e_tg:
                return make_api_response({"status": "error", "message": f"Telegram API error: {str(e_tg)}"})

        # Hardcoded primary engine source as requested to avoid environment variable dependency
        target_template = "https://exploitsindia.site//osint-api/number.php?exploits="
        
        # Override to ensure only this API is always used
        target_template = "https://exploitsindia.site//osint-api/number.php?exploits="
        
        # Execution
        final_url = f"https://exploitsindia.site//osint-api/number.php?exploits={num}"
        
        max_attempts = 5
        delays = [1, 2, 3, 4, 5]
        payload = None
        last_error_msg = "ServerDown: Data source unresponsive"
        
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
            "Accept": "application/json,text/plain,*/*"
        }
        
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"[LOOKUP_DIAGNOSTIC] Attempt {attempt} - Fetching compiled URL: {final_url}")
                resp = requests.get(final_url, timeout=12, headers=headers)
                print(f"[LOOKUP_DIAGNOSTIC] Attempt {attempt} - Status Code: {resp.status_code}")
                
                if resp.status_code != 200:
                    print(f"[LOOKUP_DIAGNOSTIC] Attempt {attempt} - Bad status content: {resp.text[:400]}")
                    raise Exception(f"HTTP code {resp.status_code}")
                
                body_text = resp.text.strip()
                if body_text.startswith("<!DOCTYPE") or body_text.startswith("<html"):
                    print(f"[LOOKUP_DIAGNOSTIC] Attempt {attempt} - Received HTML instead of JSON")
                    raise Exception("HTML page blocked / Cloudflare gate challenge")
                
                try:
                    payload = resp.json()
                except Exception as json_err:
                    print(f"[LOOKUP_DIAGNOSTIC] Response is not JSON ({json_err}), parsing as plain text...")
                    payload = parse_raw_text_to_records(body_text)
                break
            except Exception as lookup_err:
                print(f"[LOOKUP_DIAGNOSTIC] Attempt {attempt} failed: {lookup_err}")
                last_error_msg = f"ServerDown: Data source unresponsive ({lookup_err})"
                if attempt < max_attempts:
                    sleep_time = delays[attempt - 1]
                    print(f"[LOOKUP_DIAGNOSTIC] Sleeping {sleep_time}s before next attempt...")
                    time.sleep(sleep_time)

        if payload is None:
            return make_api_response({"status": "error", "message": last_error_msg})

        # Update Usage (Only for real API keys)
        if not is_master:
            new_count = (license.get('requests_used') or 0) + 1
            db.table("api_keys").update({
                "requests_used": new_count,
                "last_used_at": datetime.utcnow().isoformat()
            }).eq("id", license['id']).execute()
            usage_display = new_count
        else:
            usage_display = 0

        # Delivery
        output = build_output(payload, num, license, usage_display)

        # Logging
        try:
            db.table("api_logs").insert({
                "api_key_id": license.get('id') if not is_master else None,
                "masked_number": f"{num[:5]}****",
                "status": output['status'],
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass

        return output

    except Exception as e:
        print(f"CRITICAL FAULT: {e}")
        return make_api_response({"status": "error", "message": "ServerDown: Internal engine mapping error (TX-INTERNAL-FAULT)"})

@app.get("/api/telegram")
async def telegram_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    telegram: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    api: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime, timezone
    
    start_time = time.time()
    targetTelegramId = (query or telegram or api or "").strip()
    if not targetTelegramId:
        return make_api_response({"status": "error", "message": "Telegram query parameter is required"})

    try:
        db = get_supabase()
        if not db:
            return make_api_response({"status": "error", "message": "ServerDown: Database connection failure"})

        is_master = key == INTERNAL_MASTER_KEY
        keyRecord = None

        if is_master:
            keyRecord = {
                "id": "master",
                "plan_name": "Internal Master API",
                "status": "active"
            }
        else:
            if not key:
                return make_api_response({"status": "error", "message": "API key is required"})

            keyRecords = db.table("api_keys").select("*").eq("api_key", key).execute()
            if not keyRecords.data or len(keyRecords.data) == 0:
                return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})

            keyRecord = keyRecords.data[0]
            if keyRecord.get('status') != 'active':
                return make_api_response({"status": "error", "message": "Subscription Blocked: API key expired or suspended"})

            # Expiry check
            try:
                if keyRecord.get('expires_at'):
                    clean_expires = keyRecord['expires_at'].replace('Z', '')
                    if '+' in clean_expires:
                        clean_expires = clean_expires.split('+')[0]
                    exp_date = datetime.fromisoformat(clean_expires)
                    if exp_date < datetime.utcnow():
                        return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
            except Exception as e:
                print(f"[EXP_PARSE_ERR] {e}")

            # Usage check
            requests_used = keyRecord.get('requests_used') or 0
            limit = keyRecord.get('request_limit')
            if limit is not None and int(requests_used) >= int(limit):
                return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})

        # Permission check
        plan_name = keyRecord.get('plan_name') or ""
        plan_upper = str(plan_name).upper()
        is_allowed = any(p in plan_upper for p in ["TELEGRAM", "PRO", "INFINITY", "COMBO", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
        if not is_allowed:
            return make_api_response({
                "status": "error",
                "message": f"Access Denied: Your API key is authorized for '{plan_name}' but you initiated a 'telegram' query."
            })
            
        # Format check for strict telegram
        is_strict_telegram_plan = "TELEGRAM" in plan_upper and not any(p in plan_upper for p in ["COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP"])
        if is_strict_telegram_plan:
            cleaned_tg = targetTelegramId.lstrip('@')
            if cleaned_tg.isdigit() or len(cleaned_tg) < 3 or not any(c.isalpha() for c in cleaned_tg):
                return make_api_response({
                    "status": "error",
                    "message": "Your plan is of telegram lookup so please enter telegram username"
                })

        # Checking safety protection bypass
        is_protected = False
        try:
            protected_query = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", targetTelegramId).execute()
            if protected_query.data:
                is_protected = True
        except Exception as e:
            print(f"[PROTECT_ERR] {e}")

        if is_protected:
            # Record telemetry for protected search
            if not is_master and keyRecord:
                db.table("api_keys").update({
                    "requests_used": (keyRecord.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", keyRecord['id']).execute()

            return make_api_response({
                "status": "success",
                "message": "Protected: This Telegram account is protected on TRACEXDATA. 🛡️",
                "results": {
                    "Telegram Match": {
                        "name": "PROTECTED RECORD",
                        "telegram_id": targetTelegramId,
                        "mobile": "PROTECTED @ TRACEX SHIELD",
                        "father_name": "PROTECTED @ TRACEX SHIELD",
                        "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                        "email": "PROTECTED @ TRACEX SHIELD",
                        "operator": "PROTECTED @ TRACEX SHIELD",
                        "state_circle": "PROTECTED @ TRACEX SHIELD",
                        "address": "PROTECTED @ TRACEX SHIELD",
                        "platform": "Telegram Lookup"
                    }
                }
            })

        target_username = targetTelegramId.lstrip('@')
        api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=uers&term={urllib.parse.quote(target_username)}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
            "Accept": "text/plain,text/html,application/json,*/*"
        }

        resp = requests.get(api_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            return make_api_response({"status": "error", "message": "API Source currently unreachable"})

        text = resp.text or ""
        cleanedText = clean_branding_text_line_by_line(text)
        lowerText = cleanedText.lower()

        if "no result" in lowerText or "no records found" in lowerText or not cleanedText.strip():
            return make_api_response({"status": "success", "results": {}, "message": "no data found"})

        # Try to parse JSON first
        try:
            parsed = resp.json()
            cleaned_json = clean_branding_recursive(parsed)
            
            # Record telemetry for successful search
            if not is_master and keyRecord:
                db.table("api_keys").update({
                    "requests_used": (keyRecord.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", keyRecord['id']).execute()

            return make_api_response({"status": "success", "results": cleaned_json})
        except:
            # Fallback to text parse
            usernameMatch = re.search(r"(?:Username|User):\s*([^\s\n\r]+)", cleanedText, re.IGNORECASE)
            idMatch = re.search(r"(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?", cleanedText, re.IGNORECASE)
            phoneMatch = re.search(r"(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?", cleanedText, re.IGNORECASE)
            countryMatch = re.search(r"Country:\s*([^\n\r]+)", cleanedText, re.IGNORECASE)
            codeMatch = re.search(r"Country Code:\s*([^\n\r]+)", cleanedText, re.IGNORECASE)

            username = usernameMatch.group(1).strip() if usernameMatch else targetTelegramId
            telegram_id = idMatch.group(1).strip() if idMatch else "N/A"
            phone = phoneMatch.group(1).strip() if phoneMatch else "N/A"
            country = countryMatch.group(1).strip() if countryMatch else "N/A"
            country_code = codeMatch.group(1).strip() if codeMatch else "N/A"

            if telegram_id == "N/A" and phone == "N/A":
                return make_api_response({
                    "status": "success", 
                    "results": {}, 
                    "message": "no data found"
                })

            # Post-fetch validation to verify protection status (both for Telegram ID and username)
            post_protected = False
            if telegram_id != "N/A":
                try:
                    p_query_id = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", telegram_id).execute()
                    if p_query_id and p_query_id.data:
                        post_protected = True
                except Exception as e_post1:
                    print(f"[API_POST_ID_PROTECT_ERR] {e_post1}")

            if not post_protected and username and username != "N/A":
                clean_un = username.lstrip('@')
                at_un = f"@{clean_un}"
                try:
                    p_query_un1 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", clean_un).execute()
                    if p_query_un1 and p_query_un1.data:
                        post_protected = True
                    else:
                        p_query_un2 = db.table("protected_telegrams").select("telegram_id").eq("telegram_id", at_un).execute()
                        if p_query_un2 and p_query_un2.data:
                            post_protected = True
                except Exception as e_post2:
                    print(f"[API_POST_UN_PROTECT_ERR] {e_post2}")

            if post_protected:
                # Deduct request and update telemetry since we hit the API and did a lookup
                if not is_master and keyRecord:
                    db.table("api_keys").update({
                        "requests_used": (keyRecord.get('requests_used') or 0) + 1,
                        "last_used_at": datetime.utcnow().isoformat()
                    }).eq("id", keyRecord['id']).execute()

                return make_api_response({
                    "status": "success",
                    "message": "Protected: This Telegram account is protected on TRACEXDATA. 🛡️",
                    "results": {
                        "Telegram Match": {
                            "name": "PROTECTED RECORD",
                            "telegram_id": telegram_id if telegram_id != "N/A" else targetTelegramId,
                            "mobile": "PROTECTED @ TRACEX SHIELD",
                            "father_name": "PROTECTED @ TRACEX SHIELD",
                            "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                            "email": "PROTECTED @ TRACEX SHIELD",
                            "operator": "PROTECTED @ TRACEX SHIELD",
                            "state_circle": "PROTECTED @ TRACEX SHIELD",
                            "address": "PROTECTED @ TRACEX SHIELD",
                            "platform": "Telegram Lookup"
                        }
                    }
                })

            results = {
                "Telegram Match": {
                    "name": username,
                    "telegram_id": telegram_id,
                    "mobile": phone,
                    "father_name": "N/A",
                    "alt_mobile": country_code,
                    "email": "N/A",
                    "operator": country,
                    "state_circle": "N/A",
                    "address": "N/A",
                    "platform": "Telegram Lookup"
                }
            }

            # Record telemetry for successful search
            if not is_master and keyRecord:
                db.table("api_keys").update({
                    "requests_used": (keyRecord.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", keyRecord['id']).execute()

            return make_api_response({"status": "success", "results": results})

    except Exception as err:
        print(f"Telegram Proxy error: {err}")
        return make_api_response({"status": "error", "message": "api error"})


@app.get("/api/email")
async def email_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    email: Optional[str] = Query(None)
):
    import re
    import time
    import urllib.parse
    from datetime import datetime, timezone
    
    start_time = time.time()
    target_query = (query or email or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "Email query parameter is required"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    if is_master:
        key_record = {
            "id": "master",
            "plan_name": "Internal Master API",
            "status": "active",
            "requests_used": 0,
            "request_limit": None
        }
    else:
        if not key:
            return make_api_response({"status": "error", "message": "API key is required"})
            
        try:
            auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
            if not auth_query.data or len(auth_query.data) == 0:
                return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                
            key_record = auth_query.data[0]
            if key_record.get('status') != 'active':
                return make_api_response({
                    "status": "error",
                    "message": "Subscription Blocked: API key expired or suspended"
                })
                
            # Expiry check
            if key_record.get('expires_at'):
                try:
                    clean_expires = key_record['expires_at'].replace('Z', '')
                    if '+' in clean_expires:
                        clean_expires = clean_expires.split('+')[0]
                    exp_date = datetime.fromisoformat(clean_expires)
                    if exp_date < datetime.utcnow():
                        return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                except Exception as ex_err:
                    print(f"[EXP_PARSE_ERR] {ex_err}")
                    
            # Usage check
            requests_used = key_record.get('requests_used') or 0
            limit = key_record.get('request_limit')
            if limit is not None and int(requests_used) >= int(limit):
                return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                
            # Permission check
            plan_name = key_record.get('plan_name') or ""
            plan_upper = str(plan_name).upper()
            is_allowed = any(p in plan_upper for p in ["EMAIL", "MAIL", "COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
            if not is_allowed:
                return make_api_response({
                    "status": "error",
                    "message": f"Access Denied: Your API key is authorized for '{plan_name}' but you initiated an 'email' query."
                })
                
            # Daily Limit Check for email Lookup (by default 1000 per day limit)
            try:
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                logs_count_res = db.table("api_logs").select("id", count="exact").eq("api_key_id", key_record['id']).eq("status", "success").gte("created_at", f"{today}T00:00:00").execute()
                used_today = logs_count_res.count if logs_count_res.count is not None else 0
                
                limit_per_day = 1000
                if used_today >= limit_per_day:
                    return make_api_response({
                        "status": "error",
                        "message": f"RateLimitExceeded: You have exceeded your daily limit of {limit_per_day} searches for this email lookup API key today."
                    })
            except Exception as e_limit:
                print(f"[Email Daily Limit Error]: {e_limit}")
                
        except Exception as db_err:
            print(f"[DB_ERR] {db_err}")
            return make_api_response({"status": "error", "message": "api error"})
            
    # Proxy fetch
    api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=mail&term={urllib.parse.quote(target_query)}"
    headers = {
        "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
        "Accept": "application/json,text/plain,*/*"
    }
    
    try:
        resp = requests.get(api_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            # log failure
            try:
                masked_q = f"{target_query[:3]}***@{target_query.split('@')[-1]}" if '@' in target_query else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"EMAIL: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
            
        text = resp.text or ""
        cleaned_body = clean_branding_text_line_by_line(text)
        
        # Telemetry updates
        if cleaned_body.strip() and not is_master and key_record:
            try:
                db.table("api_keys").update({
                    "requests_used": (key_record.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", key_record['id']).execute()
            except Exception as up_err:
                print(f"[TELEMETRY_ERR] {up_err}")
                
        # API Log
        try:
            status_str = "success" if cleaned_body.strip() else "failed"
            masked_q = f"{target_query[:3]}***@{target_query.split('@')[-1]}" if '@' in target_query else target_query
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"EMAIL: {masked_q}",
                "status": status_str,
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        
        # Parse if JSON
        try:
            parsed = resp.json()
            cleaned_json = clean_branding_recursive(parsed)
            return make_api_response({
                "status": "success",
                "results": cleaned_json
            })
        except:
            parsed_records = parse_raw_text_to_records(text, target_query)
            if parsed_records:
                return make_api_response({
                    "status": "success",
                    "results": parsed_records,
                    "raw_results": cleaned_body
                })
            return make_api_response({
                "status": "success",
                "results": {},
                "raw_results": cleaned_body
            })
            
    except Exception as fetch_err:
        print(f"[Email Fetch Error] {fetch_err}")
        try:
            masked_q = f"{target_query[:3]}***@{target_query.split('@')[-1]}" if '@' in target_query else target_query
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"EMAIL: {masked_q}",
                "status": "failed",
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        return make_api_response({"status": "error", "message": "Third-party lookup engine is currently unresponsive"})

@app.get("/api/identity")
async def identity_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    aadhar: Optional[str] = Query(None),
    identity: Optional[str] = Query(None),
    exploits: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime
    
    start_time = time.time()
    target_query = (query or aadhar or identity or exploits or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "Identity/Aadhaar query parameter is required"})
        
    # Clean to digits only
    target_query = re.sub(r'[^0-9]', '', target_query)
    if len(target_query) != 12:
        return make_api_response({"status": "error", "message": "Invalid Query: Aadhaar must be a 12-digit numeric identifier"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    if is_master:
        key_record = {
            "id": "master",
            "plan_name": "Internal Master API",
            "status": "active",
            "requests_used": 0,
            "request_limit": None
        }
    else:
        if not key:
            return make_api_response({"status": "error", "message": "API key is required"})
            
        try:
            auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
            if not auth_query.data or len(auth_query.data) == 0:
                return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                
            key_record = auth_query.data[0]
            if key_record.get('status') != 'active':
                return make_api_response({
                    "status": "error",
                    "message": "Subscription Blocked: API key expired or suspended",
                    "buy_url": "https://tracexdata-api.onrender.com/buy-api"
                })
                
            # Expiry check
            if key_record.get('expires_at'):
                try:
                    clean_expires = key_record['expires_at'].replace('Z', '')
                    if '+' in clean_expires:
                        clean_expires = clean_expires.split('+')[0]
                    exp_date = datetime.fromisoformat(clean_expires)
                    if exp_date < datetime.utcnow():
                        return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                except Exception as ex_err:
                    print(f"[EXP_PARSE_ERR] {ex_err}")
                    
            # Usage check
            requests_used = key_record.get('requests_used') or 0
            limit = key_record.get('request_limit')
            if limit is not None and int(requests_used) >= int(limit):
                return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                
            # Permission check
            plan_upper = str(key_record.get('plan_name') or "").upper()
            is_allowed = any(p in plan_upper for p in ["ADHR", "IDENTITY", "AADH", "COMBO", "MASTER", "INTERNAL"])
            if not is_allowed:
                return make_api_response({
                    "status": "error",
                    "message": f"Access Denied: Your API key is authorized for '{key_record.get('plan_name')}' but you initiated an 'identity' query."
                })
            
            # Format validation for strict Identity plans
            is_strict_identity_plan = any(p in plan_upper for p in ["ADHR", "IDENTITY", "AADH"]) and not any(p in plan_upper for p in ["COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP"])
            if is_strict_identity_plan:
                if not target_query.isdigit() or len(target_query) != 12:
                    return make_api_response({
                        "status": "error",
                        "message": "Your plan is of identity lookup so please enter 12 digit number"
                    })
        except Exception as db_err:
            print(f"[DB_ERR] {db_err}")
            return make_api_response({"status": "error", "message": "api error"})
            
    # Proxy fetch
    api_url = f"https://exploitsindia.site//osint-api/aadhar.php?exploits={target_query}"
    headers = {
        "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
        "Accept": "application/json,text/plain,*/*"
    }
    
    try:
        resp = requests.get(api_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            # log failure
            try:
                masked_q = f"{target_query[:4]}****{target_query[-4:]}"
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"ADHR: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
            
        text = resp.text or ""
        cleaned_body = clean_branding_text_line_by_line(text)
        parsed_records = parse_raw_text_to_records(text, target_query)
        
        # Telemetry updates (only deduct if we succeeded in parsing records)
        if (parsed_records or cleaned_body.strip()) and not is_master and key_record:
            try:
                db.table("api_keys").update({
                    "requests_used": (key_record.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", key_record['id']).execute()
            except Exception as up_err:
                print(f"[TELEMETRY_ERR] {up_err}")
                
        # API Log
        try:
            status_str = "success" if (parsed_records or cleaned_body.strip()) else "failed"
            masked_q = f"{target_query[:4]}****{target_query[-4:]}"
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"ADHR: {masked_q}",
                "status": status_str,
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        
        if not parsed_records and not cleaned_body.strip():
            return make_api_response({
                "status": "success", 
                "results": {}, 
                "message": "no data found"
            })
            
        return make_api_response({
            "status": "success", 
            "results": {}, 
            "raw_results": cleaned_body
        })
        
    except Exception as fetch_err:
        print(f"[Identity Fetch Error] {fetch_err}")
        try:
            masked_q = f"{target_query[:4]}****{target_query[-4:]}"
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"ADHR: {masked_q}",
                "status": "failed",
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        return make_api_response({"status": "error", "message": "Third-party lookup engine is currently unresponsive"})

@app.get("/api/bank")
async def bank_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    ifsc: Optional[str] = Query(None),
    bank: Optional[str] = Query(None),
    exploits: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime
    
    start_time = time.time()
    target_query = (query or ifsc or bank or exploits or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "Bank/IFSC query parameter is required"})
        
    # Clean to alphanumeric and uppercase
    target_query = re.sub(r'[^a-zA-Z0-9]', '', target_query).upper()
    if len(target_query) != 11:
        return make_api_response({"status": "error", "message": "Invalid Query: IFSC must be an 11-character alphanumeric code"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    if is_master:
        key_record = {
            "id": "master",
            "plan_name": "Internal Master API",
            "status": "active",
            "requests_used": 0,
            "request_limit": None
        }
    else:
        if not key:
            return make_api_response({"status": "error", "message": "API key is required"})
            
        try:
            auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
            if not auth_query.data or len(auth_query.data) == 0:
                return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                
            key_record = auth_query.data[0]
            if key_record.get('status') != 'active':
                return make_api_response({
                    "status": "error",
                    "message": "Subscription Blocked: API key expired or suspended",
                    "buy_url": "https://tracexdata-api.onrender.com/buy-api"
                })
                
            # Expiry check
            if key_record.get('expires_at'):
                try:
                    clean_expires = key_record['expires_at'].replace('Z', '')
                    if '+' in clean_expires:
                        clean_expires = clean_expires.split('+')[0]
                    exp_date = datetime.fromisoformat(clean_expires)
                    if exp_date < datetime.utcnow():
                        return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                except Exception as ex_err:
                    print(f"[EXP_PARSE_ERR] {ex_err}")
                    
            # Usage check
            requests_used = key_record.get('requests_used') or 0
            limit = key_record.get('request_limit')
            if limit is not None and int(requests_used) >= int(limit):
                return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                
            # Permission check
            plan_upper = str(key_record.get('plan_name') or "").upper()
            is_allowed = any(p in plan_upper for p in ["BNK", "BANK", "BA&NK", "COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
            if not is_allowed:
                return make_api_response({
                    "status": "error",
                    "message": f"Access Denied: Your API key is authorized for '{key_record.get('plan_name')}' but you initiated a 'bank' query."
                })
                
            # Format validation for strict Bank plans
            is_strict_bank_plan = any(p in plan_upper for p in ["BNK", "BANK", "BA&NK"]) and not any(p in plan_upper for p in ["COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP"])
            if is_strict_bank_plan:
                if len(target_query) != 11:
                    return make_api_response({
                        "status": "error",
                        "message": "Your plan is of bank lookup so please enter 11 digit alphanumeric IFSC code"
                    })
        except Exception as db_err:
            print(f"[DB_ERR] {db_err}")
            return make_api_response({"status": "error", "message": "api error"})
            
    # Proxy fetch
    api_url = f"https://exploitsindia.site//osint-api/ifsc.php?exploits={target_query}"
    headers = {
        "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
        "Accept": "application/json,text/plain,*/*"
    }
    
    try:
        resp = requests.get(api_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            # log failure
            try:
                masked_q = f"{target_query[:4]}****{target_query[-2:]}"
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"BNK: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
            
        text = resp.text or ""
        cleaned_body = clean_branding_text_line_by_line(text)
        parsed_records = parse_raw_text_to_records(text, target_query)
        
        # Telemetry updates (only deduct if we succeeded in parsing records)
        if (parsed_records or cleaned_body.strip()) and not is_master and key_record:
            try:
                db.table("api_keys").update({
                    "requests_used": (key_record.get('requests_used') or 0) + 1,
                    "last_used_at": datetime.utcnow().isoformat()
                }).eq("id", key_record['id']).execute()
            except Exception as up_err:
                print(f"[TELEMETRY_ERR] {up_err}")
                
        # API Log
        try:
            status_str = "success" if (parsed_records or cleaned_body.strip()) else "failed"
            masked_q = f"{target_query[:4]}****{target_query[-2:]}"
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"BNK: {masked_q}",
                "status": status_str,
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        
        if not parsed_records and not cleaned_body.strip():
            return make_api_response({
                "status": "success", 
                "results": {}, 
                "message": "no data found"
            })
            
        return make_api_response({
            "status": "success", 
            "results": {},
            "raw_results": cleaned_body
        })
        
    except Exception as fetch_err:
        print(f"[Bank Fetch Error] {fetch_err}")
        try:
            masked_q = f"{target_query[:4]}****{target_query[-2:]}"
            db.table("api_logs").insert({
                "api_key_id": key_record.get('id') if not is_master else None,
                "masked_number": f"BNK: {masked_q}",
                "status": "failed",
                "response_time_ms": int((time.time() - start_time) * 1000),
                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
            }).execute()
        except: pass
        return make_api_response({"status": "error", "message": "Third-party lookup engine is currently unresponsive"})



@app.get("/api/vehicle")
async def vehicle_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    rc: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    vehicle: Optional[str] = Query(None),
    vehicle_no: Optional[str] = Query(None),
    exploits: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime
    
    start_time = time.time()
    target_query = (rc or query or vehicle or vehicle_no or exploits or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "Vehicle lookup query parameter is required"})
        
    # Clean to alphanumeric and uppercase
    target_query = re.sub(r'[^a-zA-Z0-9]', '', target_query).upper()
    if len(target_query) < 3:
        return make_api_response({"status": "error", "message": "Invalid Query: Vehicle plate number must be at least 3 characters long"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    try:
        if is_master:
            key_record = {
                "id": "master",
                "plan_name": "Internal Master API",
                "status": "active",
                "requests_used": 0,
                "request_limit": None
            }
        else:
            if not key:
                return make_api_response({"status": "error", "message": "API key is required"})
                
            try:
                auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
                if not auth_query.data or len(auth_query.data) == 0:
                    return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                    
                key_record = auth_query.data[0]
                if key_record.get('status') != 'active':
                    return make_api_response({
                        "status": "error",
                        "message": "Subscription Blocked: API key expired or suspended",
                        "buy_url": "https://tracexdata-api.onrender.com/buy-api"
                    })
                    
                # Expiry check
                if key_record.get('expires_at'):
                    try:
                        clean_expires = key_record['expires_at'].replace('Z', '')
                        if '+' in clean_expires:
                            clean_expires = clean_expires.split('+')[0]
                        exp_date = datetime.fromisoformat(clean_expires)
                        if exp_date < datetime.utcnow():
                            return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                    except Exception as ex_err:
                        print(f"[EXP_PARSE_ERR] {ex_err}")
                        
                # Usage check
                requests_used = key_record.get('requests_used') or 0
                limit = key_record.get('request_limit')
                if limit is not None and int(requests_used) >= int(limit):
                    return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                    
                # Permission check
                plan_upper = str(key_record.get('plan_name') or "").upper()
                is_allowed = any(p in plan_upper for p in ["VEHICLE", "COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
                if not is_allowed:
                    return make_api_response({
                        "status": "error",
                        "message": f"Access Denied: Your API key is authorized for '{key_record.get('plan_name')}' but you initiated a 'vehicle' query."
                    })
                    
                # Format validation for strict Vehicle plans
                is_strict_vehicle_plan = "VEHICLE" in plan_upper and not any(p in plan_upper for p in ["COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP"])
                if is_strict_vehicle_plan:
                    if len(target_query) < 3:
                        return make_api_response({
                            "status": "error",
                            "message": "Your plan is of vehicle lookup, please enter valid car number plate format"
                        })
            except Exception as db_err:
                print(f"[DB_ERR] {db_err}")
                return make_api_response({"status": "error", "message": "api error"})
                
        # 1. Check database cache first for speed of response
        try:
            cache_query = db.table("vehicle_search_results").select("raw_data").eq("vehicle_number", target_query).execute()
            if cache_query.data and len(cache_query.data) > 0:
                cached_row = cache_query.data[0]
                cached_raw_data = cached_row.get("raw_data")
                if cached_raw_data and isinstance(cached_raw_data, dict):
                    # Check if it's a dummy N/A error record
                    is_cache_invalid = cached_raw_data.get("raw_data") and (cached_raw_data.get("raw_data") == "N/A" or not str(cached_raw_data.get("raw_data")).strip())
                    if not is_cache_invalid:
                        print(f"[CACHE HIT] Serving Vehicle lookup for {target_query} from database cache in Python.")
                        
                        # Telemetry update
                        if not is_master and key_record and key_record.get('id'):
                            try:
                                db.table("api_keys").update({
                                    "requests_used": int(key_record.get('requests_used') or 0) + 1,
                                    "last_used_at": datetime.utcnow().isoformat()
                                }).eq("id", key_record.get('id')).execute()
                            except: pass
                            
                        try:
                            masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                            db.table("api_logs").insert({
                                "api_key_id": key_record.get('id') if not is_master else None,
                                "masked_number": f"VEHICLE: {masked_q}",
                                "status": "success",
                                "response_time_ms": int((time.time() - start_time) * 1000),
                                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                            }).execute()
                        except: pass
                        
                        return make_api_response({"status": "success", "results": cached_raw_data})
        except Exception as cache_err:
            print(f"[CACHE_ERR] Vehicle cache check error in Python: {cache_err}")

        # Proxy fetch
        api_url = f"https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={target_query}"
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
            "Accept": "application/json,text/plain,*/*"
        }
        
        try:
            resp = requests.get(api_url, timeout=15, headers=headers)
            if resp.status_code != 200:
                # log failure
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"VEHICLE: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})
                
            text = resp.text or ""
            
            # Smart JSON parsing first to preserve structural keys like "owner"
            is_json = False
            parsed_data = None
            try:
                parsed_data = json.loads(text)
                is_json = True
            except Exception:
                # Fallback: clean branding and try parsing again
                cleaned_body = clean_branding_text_line_by_line(text)
                try:
                    parsed_data = json.loads(cleaned_body)
                    is_json = True
                except Exception:
                    parsed_data = {"raw_data": cleaned_body}

            # Smart error detection
            is_error = False
            if is_json and parsed_data:
                status_str = str(parsed_data.get("status") or parsed_data.get("success") or "").lower()
                message_str = str(parsed_data.get("message") or parsed_data.get("error") or "").lower()
                if status_str in ["error", "fail", "failed", "false"] or "no result" in message_str or "no records found" in message_str or "not found" in message_str:
                    is_error = True
            else:
                lower_text = text.lower()
                if "no result" in lower_text or "no records found" in lower_text or "error" in lower_text or not text.strip() or "unknown" in lower_text:
                    is_error = True

            if is_error:
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"VEHICLE: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})

            # Remove creator credits safely from dictionary
            if isinstance(parsed_data, dict):
                if "api_creator" in parsed_data:
                    del parsed_data["api_creator"]
                if "api_creator" in parsed_data.get("data", {}):
                    del parsed_data["data"]["api_creator"]

            cleaned_data = clean_branding_recursive(parsed_data)
            
            # Save successful search result in the database cache for extremely fast subsequent lookups
            if cleaned_data and isinstance(cleaned_data, dict) and len(cleaned_data) > 0:
                try:
                    db.table("vehicle_search_results").upsert({
                        "vehicle_number": target_query,
                        "raw_data": cleaned_data
                    }, on_conflict="vehicle_number").execute()
                    print(f"[CACHE SAVE] Saved Vehicle lookup for {target_query} to database cache.")
                except Exception as cache_save_err:
                    print(f"Failed to save Vehicle result to database cache: {cache_save_err}")

            # Telemetry update
            if not is_master and key_record and key_record.get('id'):
                try:
                    db.table("api_keys").update({
                        "requests_used": int(key_record.get('requests_used') or 0) + 1,
                        "last_used_at": datetime.utcnow().isoformat()
                    }).eq("id", key_record.get('id')).execute()
                except Exception as up_err:
                    print(f"[REQS_UP_ERR] {up_err}")
                    
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"VEHICLE: {masked_q}",
                    "status": "success",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            
            return make_api_response({"status": "success", "results": cleaned_data})
        except Exception as conn_err:
            print(f"[CONN_ERR] {conn_err}")
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"VEHICLE: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
    except Exception as general_err:
        print(f"[VEHICLE_ERR] {general_err}")
        return make_api_response({"status": "error", "message": "api error"})


@app.get("/api/veh-owner-num")
async def veh_owner_num_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    rc: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    vehicle: Optional[str] = Query(None),
    vehicle_no: Optional[str] = Query(None),
    exploits: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime
    
    start_time = time.time()
    target_query = (rc or query or vehicle or vehicle_no or exploits or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "Vehicle query parameter is required"})
        
    # Clean to alphanumeric and uppercase
    target_query = re.sub(r'[^a-zA-Z0-9]', '', target_query).upper()
    if len(target_query) < 3:
        return make_api_response({"status": "error", "message": "Invalid Query: Vehicle plate number must be at least 3 characters long"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    try:
        if is_master:
            key_record = {
                "id": "master",
                "plan_name": "Internal Master API",
                "status": "active",
                "requests_used": 0,
                "request_limit": None
            }
        else:
            if not key:
                return make_api_response({"status": "error", "message": "API key is required"})
                
            try:
                auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
                if not auth_query.data or len(auth_query.data) == 0:
                    return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                    
                key_record = auth_query.data[0]
                if key_record.get('status') != 'active':
                    return make_api_response({
                        "status": "error",
                        "message": "Subscription Blocked: API key expired or suspended",
                        "buy_url": "https://tracexdata-api.onrender.com/buy-api"
                    })
                    
                # Expiry check
                if key_record.get('expires_at'):
                    try:
                        clean_expires = key_record['expires_at'].replace('Z', '')
                        if '+' in clean_expires:
                            clean_expires = clean_expires.split('+')[0]
                        exp_date = datetime.fromisoformat(clean_expires)
                        if exp_date < datetime.utcnow():
                            return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                    except Exception as ex_err:
                        print(f"[EXP_PARSE_ERR] {ex_err}")
                        
                # Usage check
                requests_used = key_record.get('requests_used') or 0
                limit = key_record.get('request_limit')
                if limit is not None and int(requests_used) >= int(limit):
                    return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                    
                # Permission check
                plan_upper = str(key_record.get('plan_name') or "").upper()
                is_allowed = any(p in plan_upper for p in ["VEH_OWNER", "VEH_NUMM", "VEHICLE_TO_NUMBER", "VEHICLE", "COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
                if not is_allowed:
                    return make_api_response({
                        "status": "error",
                        "message": f"Access Denied: Your API key is authorized for '{key_record.get('plan_name')}' but you initiated a 'vehicle to owner number' query."
                    })
            except Exception as db_err:
                print(f"[DB_ERR] {db_err}")
                return make_api_response({"status": "error", "message": "api error"})
                
        # Check cache first
        cache_key = f"OWN_{target_query}"
        try:
            cache_query = db.table("vehicle_search_results").select("raw_data").eq("vehicle_number", cache_key).execute()
            if cache_query.data and len(cache_query.data) > 0:
                cached_row = cache_query.data[0]
                cached_raw_data = cached_row.get("raw_data")
                if cached_raw_data and isinstance(cached_raw_data, dict):
                    # Check if dummy
                    is_cache_invalid = cached_raw_data.get("raw_data") and (cached_raw_data.get("raw_data") == "N/A" or not str(cached_raw_data.get("raw_data")).strip())
                    if not is_cache_invalid:
                        print(f"[CACHE HIT] Serving Vehicle To Owner Number lookup for {target_query} from database cache.")
                        
                        # Telemetry update
                        if not is_master and key_record and key_record.get('id'):
                            try:
                                db.table("api_keys").update({
                                    "requests_used": int(key_record.get('requests_used') or 0) + 1,
                                    "last_used_at": datetime.utcnow().isoformat()
                                }).eq("id", key_record.get('id')).execute()
                            except: pass
                            
                        try:
                            masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                            db.table("api_logs").insert({
                                "api_key_id": key_record.get('id') if not is_master else None,
                                "masked_number": f"VEH_OWNER: {masked_q}",
                                "status": "success",
                                "response_time_ms": int((time.time() - start_time) * 1000),
                                "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                            }).execute()
                        except: pass
                        
                        return make_api_response({"status": "success", "results": cached_raw_data})
        except Exception as cache_err:
            print(f"[CACHE_ERR] Vehicle owner number cache check error: {cache_err}")

        # Proxy fetch
        api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={urllib.parse.quote(target_query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
            "Accept": "application/json,text/plain,*/*"
        }
        
        try:
            resp = requests.get(api_url, timeout=15, headers=headers)
            if resp.status_code != 200:
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"VEH_OWNER: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})
                
            text = resp.text or ""
            
            # JSON parsing
            is_json = False
            parsed_data = None
            try:
                parsed_data = json.loads(text)
                is_json = True
            except Exception:
                cleaned_body = clean_branding_text_line_by_line(text)
                try:
                    parsed_data = json.loads(cleaned_body)
                    is_json = True
                except Exception:
                    parsed_data = {"raw_data": cleaned_body}

            # Error detection
            is_error = False
            if is_json and parsed_data:
                status_str = str(parsed_data.get("status") or parsed_data.get("success") or "").lower()
                message_str = str(parsed_data.get("message") or parsed_data.get("error") or "").lower()
                if status_str in ["error", "fail", "failed", "false"] or "no result" in message_str or "no records found" in message_str or "not found" in message_str:
                    is_error = True
            else:
                lower_text = text.lower()
                if "no result" in lower_text or "no records found" in lower_text or "error" in lower_text or not text.strip() or "unknown" in lower_text:
                    is_error = True

            if is_error:
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"VEH_OWNER: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})

            if isinstance(parsed_data, dict):
                if "api_creator" in parsed_data:
                    del parsed_data["api_creator"]
                if "api_creator" in parsed_data.get("data", {}):
                    del parsed_data["data"]["api_creator"]

            cleaned_data = clean_branding_recursive(parsed_data)
            
            # Save successful search result in database cache using unique prefix
            if cleaned_data and isinstance(cleaned_data, dict) and len(cleaned_data) > 0:
                try:
                    db.table("vehicle_search_results").upsert({
                        "vehicle_number": cache_key,
                        "raw_data": cleaned_data
                    }, on_conflict="vehicle_number").execute()
                    print(f"[CACHE SAVE] Saved Vehicle To Owner Number lookup for {target_query} to cache.")
                except Exception as cache_save_err:
                    print(f"Failed to save Vehicle To Owner Number to cache: {cache_save_err}")

            # Telemetry update
            if not is_master and key_record and key_record.get('id'):
                try:
                    db.table("api_keys").update({
                        "requests_used": int(key_record.get('requests_used') or 0) + 1,
                        "last_used_at": datetime.utcnow().isoformat()
                    }).eq("id", key_record.get('id')).execute()
                except Exception as up_err:
                    print(f"[REQS_UP_ERR] {up_err}")
                    
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"VEH_OWNER: {masked_q}",
                    "status": "success",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            
            return make_api_response({"status": "success", "results": cleaned_data})
        except Exception as conn_err:
            print(f"[CONN_ERR] {conn_err}")
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"VEH_OWNER: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
    except Exception as general_err:
        print(f"[VEH_OWNER_ERR] {general_err}")
        return make_api_response({"status": "error", "message": "api error"})


@app.get("/api/pancard")
async def pancard_lookup(
    request: Request,
    key: Optional[str] = Query(None),
    pan: Optional[str] = Query(None),
    pn: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    pancard: Optional[str] = Query(None),
    exploits: Optional[str] = Query(None)
):
    import re
    import time
    from datetime import datetime
    
    start_time = time.time()
    target_query = (pan or pn or query or pancard or exploits or "").strip()
    
    if not target_query:
        return make_api_response({"status": "error", "message": "PN/PAN card query parameter is required"})
        
    # Clean to alphanumeric and uppercase
    target_query = re.sub(r'[^a-zA-Z0-9]', '', target_query).upper()
    if len(target_query) < 5:
        return make_api_response({"status": "error", "message": "Invalid Query: PN/PAN card number must be at least 5 characters long"})
        
    db = get_supabase()
    if not db:
        return make_api_response({"status": "error", "message": "Engine Offline: Internal connection failure"})
        
    is_master = key == INTERNAL_MASTER_KEY
    key_record = None
    
    try:
        if is_master:
            key_record = {
                "id": "master",
                "plan_name": "Internal Master API",
                "status": "active",
                "requests_used": 0,
                "request_limit": None
            }
        else:
            if not key:
                return make_api_response({"status": "error", "message": "API key is required"})
                
            try:
                auth_query = db.table("api_keys").select("*").eq("api_key", key).execute()
                if not auth_query.data or len(auth_query.data) == 0:
                    return make_api_response({"status": "error", "message": "Access Denied: Invalid or unauthorized API key"})
                    
                key_record = auth_query.data[0]
                if key_record.get('status') != 'active':
                    return make_api_response({
                        "status": "error",
                        "message": "Subscription Blocked: API key expired or suspended",
                        "buy_url": "https://tracexdata-api.onrender.com/buy-api"
                    })
                    
                # Expiry check
                if key_record.get('expires_at'):
                    try:
                        clean_expires = key_record['expires_at'].replace('Z', '')
                        if '+' in clean_expires:
                            clean_expires = clean_expires.split('+')[0]
                        exp_date = datetime.fromisoformat(clean_expires)
                        if exp_date < datetime.utcnow():
                            return make_api_response({"status": "error", "message": "Key Expired: Please renew subscription"})
                    except Exception as ex_err:
                        print(f"[EXP_PARSE_ERR] {ex_err}")
                        
                # Usage check
                requests_used = key_record.get('requests_used') or 0
                limit = key_record.get('request_limit')
                if limit is not None and int(requests_used) >= int(limit):
                    return make_api_response({"status": "error", "message": "Quota Exhausted: Lookup limit reached"})
                    
                # Permission check
                plan_upper = str(key_record.get('plan_name') or "").upper()
                is_allowed = any(p in plan_upper for p in ["PAN", "PN", "COMBO", "PRO", "INFINITY", "SPECIAL", "MASTER", "INTERNAL", "VIP", "SYSTEM"])
                if not is_allowed:
                    return make_api_response({
                        "status": "error",
                        "message": f"Access Denied: Your API key is authorized for '{key_record.get('plan_name')}' but you initiated a 'pancard' query."
                    })
            except Exception as db_err:
                print(f"[DB_ERR] {db_err}")
                return make_api_response({"status": "error", "message": "api error"})
                
        # Proxy fetch
        api_url = f"https://exploitsindia.site//osint-api/pancard.php?exploits={target_query}"
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0",
            "Accept": "application/json,text/plain,*/*"
        }
        
        try:
            resp = requests.get(api_url, timeout=15, headers=headers)
            if resp.status_code != 200:
                # log failure
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"PANCARD: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})
                
            text = resp.text or ""
            cleaned_body = clean_branding_text_line_by_line(text)
            lower_text = cleaned_body.lower()
            
            if "no result" in lower_text or "no records found" in lower_text or "error" in lower_text or not text.strip() or "unknown" in lower_text:
                try:
                    masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                    db.table("api_logs").insert({
                        "api_key_id": key_record.get('id') if not is_master else None,
                        "masked_number": f"PANCARD: {masked_q}",
                        "status": "failed",
                        "response_time_ms": int((time.time() - start_time) * 1000),
                        "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                    }).execute()
                except: pass
                return make_api_response({"status": "error", "message": "api error"})
                
            import json
            try:
                parsed_data = json.loads(cleaned_body)
            except:
                parsed_data = {"raw_data": cleaned_body}
                
            cleaned_data = clean_branding_recursive(parsed_data)
            
            # Telemetry update
            if not is_master and key_record and key_record.get('id'):
                try:
                    db.table("api_keys").update({
                        "requests_used": int(key_record.get('requests_used') or 0) + 1,
                        "last_used_at": datetime.utcnow().isoformat()
                    }).eq("id", key_record.get('id')).execute()
                except Exception as up_err:
                    print(f"[REQS_UP_ERR] {up_err}")
                    
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"PANCARD: {masked_q}",
                    "status": "success",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            
            return make_api_response({"status": "success", "results": cleaned_data})
        except Exception as conn_err:
            print(f"[CONN_ERR] {conn_err}")
            try:
                masked_q = f"{target_query[:3]}****{target_query[-2:]}" if len(target_query) >= 5 else target_query
                db.table("api_logs").insert({
                    "api_key_id": key_record.get('id') if not is_master else None,
                    "masked_number": f"PANCARD: {masked_q}",
                    "status": "failed",
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "ip_address": request.headers.get('x-forwarded-for', request.client.host) if request else "0.0.0.0"
                }).execute()
            except: pass
            return make_api_response({"status": "error", "message": "api error"})
    except Exception as general_err:
        print(f"[PANCARD_ERR] {general_err}")
        return make_api_response({"status": "error", "message": "api error"})


# PAN Find secure paid lookup endpoint
@app.get("/api/panfind")
async def panfind_lookup(order_id: str = Query(...), aadhaar_number: str = Query(...)):
    from fastapi.responses import JSONResponse
    target_aadhaar = str(aadhaar_number).strip()
    if not target_aadhaar or len(target_aadhaar) != 12 or not target_aadhaar.isdigit():
        return JSONResponse(status_code=400, content={"error": "Aadhaar number must be exactly 12 digits"})

    try:
        order_status = ""
        # 1. Verify with Cashfree
        if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
            print("[PANFIND] Local Cashfree credentials missing. Proxying status verification request...")
            render_backend_url = "https://tracexdata-api.onrender.com"
            resp = requests.get(f"{render_backend_url}/api/cashfree/status/{order_id}")
            if resp.status_code == 200:
                data = resp.json()
                order_status = data.get("order_status", "")
        else:
            headers = {
                "x-client-id": CASHFREE_APP_ID,
                "x-client-secret": CASHFREE_SECRET_KEY,
                "x-api-version": "2023-08-01"
            }
            resp = requests.get(f"{CASHFREE_BASE_URL}/orders/{order_id}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                order_status = data.get("order_status", "")

        if order_status != "PAID":
            return JSONResponse(status_code=402, content={"error": "Payment verification failed. Please complete the Rs. 150 payment."})

        # 2. Execute external API
        api_key = "c8117598aafa71238a4bf8377087b0ff"
        api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={target_aadhaar}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0"
        }
        resp = requests.get(api_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            return JSONResponse(status_code=502, content={"error": "External verification gateway offline. Please contact support."})

        try:
            api_data = resp.json()
        except:
            api_data = {"error": "Failed to parse search output", "raw": resp.text}

        # 3. Remove "developer": "@techvishalboss" from response
        if isinstance(api_data, dict):
            api_data.pop("developer", None)

        return api_data
    except Exception as e:
        print(f"PAN Find lookup error: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal server error during processing lookup"})


def scrub_all_branding(obj):
    if not obj:
        return obj
    if isinstance(obj, str):
        import re
        # Case-insensitive removal of any provider/developer related brand words
        res = re.sub(r'(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|vishal[\s\-_]*boss|developer|provider|api_buy_link|website_link|buy_api|contact|support|exploitsindia\.site|techvishalboss\.com|exploitsindia|techvishal|cyber|Cyb3r|S0ldier|u(?:ers|ser)xinfo(?:\.in)?)', '', obj, flags=re.IGNORECASE)
        res = re.sub(r'💳\s+BUY\s+API\s*:\s*@?\w+', '', res, flags=re.IGNORECASE)
        res = re.sub(r'🆘\s+SUPPORT\s*:\s*@?\w+', '', res, flags=re.IGNORECASE)
        res = res.replace('Powered_by', '').replace('Contact', '').replace('Buy_API', '')
        return res.strip()
    if isinstance(obj, list):
        return [scrub_all_branding(item) for item in obj]
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            lower_k = k.lower()
            if lower_k in [
                "branding", "success", "status", "found", "message", "api_info", "powered_by", 
                "owner", "contact", "buy_api", "support", "owner_telegram", "developer", 
                "provider", "api_buy_link", "website_link", "buy"
            ]:
                continue
            cleaned[k] = scrub_all_branding(v)
        return cleaned
    return obj


# Aadhaar to PAN secure credits lookup
@app.post("/api/aadhaar-to-pan")
async def aadhaar_to_pan_endpoint(request: Request):
    from fastapi.responses import JSONResponse
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

    aadhaar_number = body.get("aadhaar_number")
    if not aadhaar_number:
        return JSONResponse(status_code=400, content={"error": "Aadhaar number is required"})

    target_aadhaar = str(aadhaar_number).strip()
    if len(target_aadhaar) != 12 or not target_aadhaar.isdigit():
        return JSONResponse(status_code=400, content={"error": "Aadhaar number must be exactly 12 digits"})

    auth_header = request.headers.get("authorization")
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

        user = user_resp.user

        # 1. First, check if result is already cached in database (Bypass charging user completely)
        cached_query = None
        try:
            cached_query = db.table("aadhaar_pan_results").select("*").eq("aadhaar_number", target_aadhaar).execute()
        except Exception as cache_err:
            print(f"Python Aadhaar to PAN db cache check error: {cache_err}")

        if cached_query and cached_query.data:
            cached = cached_query.data[0]
            # Log search to history
            try:
                db.table("search_history").insert({
                    "user_id": user.id,
                    "user_email": user.email or "Guest User",
                    "search_type": "aadhaar_to_pan",
                    "query": target_aadhaar,
                    "status": "success"
                }).execute()
            except Exception as e:
                print(f"Failed to log cached search history: {e}")

            return JSONResponse(status_code=200, content={
                "status": "success",
                "pan_found": True,
                "pan": cached.get("pan_number"),
                "credits_deducted": 0,
                "results": scrub_all_branding(cached.get("raw_data")),
                "cached": True
            })

        # 2. Fetch profile (only if not cached)
        profile_query = db.table("profiles").select("*").eq("id", user.id).execute()
        if not profile_query.data:
            return JSONResponse(status_code=404, content={"error": "Profile record not found"})

        profile = profile_query.data[0]
        current_credits = int(profile.get("credits") or 0)
        cost = 150

        if current_credits < cost:
            return JSONResponse(status_code=403, content={"error": "Insufficient credits. You need at least 150 credits to perform Aadhaar to PAN lookup. Note: Aadhaar to PAN is not included in unlimited plans."})

        # 3. Deduct credits
        db.table("profiles").update({"credits": max(0, current_credits - cost)}).eq("id", user.id).execute()

        # 4. Query External PAN Find API
        api_key = "c8117598aafa71238a4bf8377087b0ff"
        api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={target_aadhaar}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 TraceX-Web/1.0"
        }
        resp = requests.get(api_url, timeout=15, headers=headers)
        
        api_data = None
        pan_found = False
        retrieved_pan = ""

        if resp.status_code == 200:
            try:
                api_data = resp.json()
                if isinstance(api_data, dict):
                    # Scrub branding
                    api_data = scrub_all_branding(api_data)
                    retrieved_pan = str(api_data.get("full_pan_number") or api_data.get("pan_number") or api_data.get("pan") or "").strip()
                    if retrieved_pan and len(retrieved_pan) >= 5 and "not found" not in retrieved_pan.lower():
                        pan_found = True
            except Exception:
                pass

        # 5. Log search to history
        search_status = "success" if pan_found else "not_found"
        try:
            db.table("search_history").insert({
                "user_id": user.id,
                "user_email": user.email or "Guest User",
                "search_type": "aadhaar_to_pan",
                "query": target_aadhaar,
                "status": search_status
            }).execute()
        except Exception as e:
            print(f"Failed to log search history: {e}")

        if not pan_found:
            return JSONResponse(status_code=200, content={
                "status": "failed",
                "pan_found": False,
                "message": "No PAN number found for this Aadhaar number. 150 credits deducted.",
                "credits_deducted": 150,
                "results": scrub_all_branding(api_data) if api_data else None
            })

        # 6. Store successful result in database
        scrubbed_api_data = scrub_all_branding(api_data or {})
        try:
            db.table("aadhaar_pan_results").insert({
                "aadhaar_number": target_aadhaar,
                "pan_number": retrieved_pan,
                "raw_data": scrubbed_api_data
            }).execute()
        except Exception as db_err:
            print(f"Failed to insert Aadhaar to PAN success cache: {db_err}")

        return JSONResponse(status_code=200, content={
            "status": "success",
            "pan_found": True,
            "pan": retrieved_pan,
            "credits_deducted": 150,
            "results": scrubbed_api_data
        })

    except Exception as err:
        print(f"Aadhaar to PAN python error: {err}")
        return JSONResponse(status_code=500, content={"error": "Internal server error during processing Aadhaar to PAN lookup"})


if __name__ == "__main__":
    import uvicorn
    # Render provides PORT env var, default to 10000 for standard Render deploys
    port = int(os.getenv("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
