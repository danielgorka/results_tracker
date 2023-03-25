
import os
import datetime
import ftplib
from dotenv import load_dotenv

# Load configuration variables from .env file
load_dotenv()

# Get FTP configuration variables
hostname = os.getenv("FTP_HOSTNAME")
username = os.getenv("FTP_USERNAME")
password = os.getenv("FTP_PASSWORD")
logs_path = os.getenv("FTP_LOGS_PATH")

# Create FTP client object
ftp_client = ftplib.FTP(hostname, username, password)

# Navigate to logs path
ftp_client.cwd(logs_path)

# Get the current date
date = datetime.datetime.now().strftime("%Y-%m-%d")

# Download the log file for the current date
ftp_client.retrbinary(f"RETR {date}.log", open(f"logs/{date}.log", "wb").write)

# Close the FTP connection
ftp_client.quit()


