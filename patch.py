import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

get_provider_url_func = """
def get_provider_url(service_key: str, query: str) -> str:
    norm_key = (service_key or "").strip().lower()
    alias = norm_key
    if norm_key in ["adhr", "aadhar"]: alias = "aadhaar"
    if norm_key == "aadhaar": alias = "adhr"
    if norm_key in ["bnk", "bank"]: alias = "ifsc"
    if norm_key == "ifsc": alias = "bnk"
    if norm_key == "pan": alias = "pancard"
    if norm_key == "pancard": alias = "pan"
    if norm_key in ["family", "ration"]: alias = "rasion"
    if norm_key == "rasion": alias = "family"
    if norm_key == "veh_owner_num": alias = "veh_numm"
    if norm_key == "veh_numm": alias = "veh_owner_num"

    template = (
        PROVIDER_CONFIGS.get(norm_key) or
        PROVIDER_CONFIGS.get(alias) or
        DEFAULT_PROVIDER_CONFIGS.get(norm_key) or
        DEFAULT_PROVIDER_CONFIGS.get(alias) or
        ""
    ).strip()

    if not template:
        return ""
    
    return template.replace("{query}", urllib.parse.quote(query))

"""

content = content.replace("except Exception as _e:\n    pass", "except Exception as _e:\n    pass\n\n" + get_provider_url_func)

# Now, we replace the hardcoded api urls:
# Line 1597: new_api_url = f"https://exploitsindia.site//anish-private-api//number.php?exploits={urllib.parse.quote(clean_phone)}"
content = re.sub(r'new_api_url = f"https://exploitsindia.site//anish-private-api//number.php\?exploits=\{urllib\.parse\.quote\(clean_phone\)\}"', r'new_api_url = get_provider_url("phone", clean_phone)', content)

# 1641: api_url = f"https://exploitsindia.site/anish-private-api/aadhar.php?exploits={urllib.parse.quote(clean_digits)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/anish-private-api/aadhar\.php\?exploits=\{urllib\.parse\.quote\(clean_digits\)\}"', r'api_url = get_provider_url("aadhaar", clean_digits)', content)

# 1644: api_url = f"https://exploitsindia.site/osint-api/ifsc.php?exploits={urllib.parse.quote(clean_ifsc)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/osint-api/ifsc\.php\?exploits=\{urllib\.parse\.quote\(clean_ifsc\)\}"', r'api_url = get_provider_url("ifsc", clean_ifsc)', content)

# 1647: api_url = f"https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={urllib.parse.quote(clean_rc)}"
content = re.sub(r'api_url = f"https://techvishalboss\.com/api/v1/lookup\.php\?key=TVB_SGL_BCFC1E32&service=vehicle&rc=\{urllib\.parse\.quote\(clean_rc\)\}"', r'api_url = get_provider_url("vehicle", clean_rc)', content)

# 1650: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={urllib.parse.quote(clean_rc)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=veh_numm&term=\{urllib\.parse\.quote\(clean_rc\)\}"', r'api_url = get_provider_url("veh_owner_num", clean_rc)', content)

# 1652: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=mail&term={urllib.parse.quote(cleaned_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=mail&term=\{urllib\.parse\.quote\(cleaned_query\)\}"', r'api_url = get_provider_url("email", cleaned_query)', content)

# 1655: api_url = f"https://exploitsindia.site/osint-api/pancard.php?exploits={urllib.parse.quote(clean_pan)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/osint-api/pancard\.php\?exploits=\{urllib\.parse\.quote\(clean_pan\)\}"', r'api_url = get_provider_url("pancard", clean_pan)', content)

# 1918: new_api_url = f"https://exploitsindia.site//anish-private-api//number.php?exploits={urllib.parse.quote(cleaned_query)}"
content = re.sub(r'new_api_url = f"https://exploitsindia\.site//anish-private-api//number\.php\?exploits=\{urllib\.parse\.quote\(cleaned_query\)\}"', r'new_api_url = get_provider_url("phone", cleaned_query)', content)

# 1970: api_url = f"https://exploitsindia.site/osint-api/aadhar.php?exploits={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/osint-api/aadhar\.php\?exploits=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("aadhaar", target_query)', content)

# 1973: api_url = f"https://exploitsindia.site/osint-api/ifsc.php?exploits={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/osint-api/ifsc\.php\?exploits=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("ifsc", target_query)', content)

# 1976: api_url = f"https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"https://techvishalboss\.com/api/v1/lookup\.php\?key=TVB_SGL_BCFC1E32&service=vehicle&rc=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("vehicle", target_query)', content)

# 1979: api_url = f"https://exploitsindia.site/osint-api/pancard.php?exploits={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/osint-api/pancard\.php\?exploits=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("pancard", target_query)', content)

# 1983: api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={urllib.parse.quote(target_query)}"
# Wait, this one uses {api_key}, but the configuration file in get_provider_url handles it with a hardcoded api key usually.
# Let's replace it anyway with get_provider_url("aadhaar_to_pan", target_query)
content = re.sub(r'api_url = f"https://techvishalboss\.com/panfind/api\.php\?api_key=[^&]+&aadhaar_number=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("aadhaar_to_pan", target_query)', content)

# 1986: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=uers&term={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=uers&term=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("telegram", target_query)', content)

# 1988: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=mail&term={urllib.parse.quote(cleaned_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=mail&term=\{urllib\.parse\.quote\(cleaned_query\)\}"', r'api_url = get_provider_url("email", cleaned_query)', content)

# 1991: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=veh_numm&term=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("veh_owner_num", target_query)', content)

# 2399: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=uers&term={urllib.parse.quote(target_username)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=uers&term=\{urllib\.parse\.quote\(target_username\)\}"', r'api_url = get_provider_url("telegram", target_username)', content)

# 2811: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=uers&term={urllib.parse.quote(target_username)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=uers&term=\{urllib\.parse\.quote\(target_username\)\}"', r'api_url = get_provider_url("telegram", target_username)', content)

# 3154: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=mail&term={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=mail&term=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("email", target_query)', content)

# 3330: api_url = f"https://exploitsindia.site/anish-private-api/aadhar.php?exploits={target_query}"
content = re.sub(r'api_url = f"https://exploitsindia\.site/anish-private-api/aadhar\.php\?exploits=\{target_query\}"', r'api_url = get_provider_url("aadhaar", target_query)', content)

# 3516: api_url = f"https://exploitsindia.site//osint-api/ifsc.php?exploits={target_query}"
content = re.sub(r'api_url = f"https://exploitsindia\.site//osint-api/ifsc\.php\?exploits=\{target_query\}"', r'api_url = get_provider_url("ifsc", target_query)', content)

# 3740: api_url = f"https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={target_query}"
content = re.sub(r'api_url = f"https://techvishalboss\.com/api/v1/lookup\.php\?key=TVB_SGL_BCFC1E32&service=vehicle&rc=\{target_query\}"', r'api_url = get_provider_url("vehicle", target_query)', content)

# 3984: api_url = f"http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={urllib.parse.quote(target_query)}"
content = re.sub(r'api_url = f"http://uersxinfo\.in/api\?key=498wlpajf&type=veh_numm&term=\{urllib\.parse\.quote\(target_query\)\}"', r'api_url = get_provider_url("veh_owner_num", target_query)', content)

# 4188: api_url = f"https://exploitsindia.site//osint-api/pancard.php?exploits={target_query}"
content = re.sub(r'api_url = f"https://exploitsindia\.site//osint-api/pancard\.php\?exploits=\{target_query\}"', r'api_url = get_provider_url("pancard", target_query)', content)

# 4309: api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={target_aadhaar}"
content = re.sub(r'api_url = f"https://techvishalboss\.com/panfind/api\.php\?api_key=[^&]+&aadhaar_number=\{target_aadhaar\}"', r'api_url = get_provider_url("aadhaar_to_pan", target_aadhaar)', content)

# 4445: api_url = f"https://techvishalboss.com/panfind/api.php?api_key={api_key}&aadhaar_number={target_aadhaar}"
content = re.sub(r'api_url = f"https://techvishalboss\.com/panfind/api\.php\?api_key=[^&]+&aadhaar_number=\{target_aadhaar\}"', r'api_url = get_provider_url("aadhaar_to_pan", target_aadhaar)', content)


with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

