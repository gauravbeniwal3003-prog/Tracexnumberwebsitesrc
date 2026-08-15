import re

with open("server.py", "r") as f:
    content = f.read()

print("is_jwt" in content)
