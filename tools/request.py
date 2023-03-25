import os
import sys
import requests
from dotenv import load_dotenv

# Path to send POST request, e.g.:
# "" - get server status
# atm - force ATM
path = sys.argv[1] if len(sys.argv) > 1 else ""

# Load configuration variables from .env file
load_dotenv()

tracker_url = os.getenv("TRACKER_URL")

# Send get request
url = tracker_url + "/" + path
print(url)
resp = requests.post(url)
print(resp.status_code)
print(resp.text)

