import json
import base64

def decode_jwt(token):
    try:
        payload_part = token.split(".")[1]
        # pad to multiple of 4
        payload_part += "=" * ((4 - len(payload_part) % 4) % 4)
        decoded = base64.b64decode(payload_part)
        return json.loads(decoded)
    except Exception as e:
        print("Error", e)
        return None

# We can mock this in get_user_from_token!
