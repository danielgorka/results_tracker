
import os
import datetime
import ftplib
import paramiko
import sys
from dotenv import load_dotenv

# Type of log to download:
# node - logs from the node server
# passenger - logs from the passenger
type = sys.argv[1] if len(sys.argv) > 1 else "node"

# Load configuration variables from .env file
load_dotenv()

# Get FTP configuration variables
ftp_hostname = os.getenv("FTP_HOSTNAME")
ftp_username = os.getenv("FTP_USERNAME")
ftp_password = os.getenv("FTP_PASSWORD")

ssh_hostname = os.getenv("SSH_HOSTNAME")
ssh_username = os.getenv("SSH_USERNAME")
ssh_password = os.getenv("SSH_PASSWORD")

if type == "node":
    date = datetime.datetime.now().strftime("%Y-%m-%d")
    file_path = os.getenv("FTP_NODE_LOGS_PATH") + date + ".log"
    dest_path = f"logs/{date}.log"
elif type == "passenger":
    file_path = "passenger.log"
    dest_path = "logs/passenger.log"
else:
    print("Invalid log type")
    exit(1)

if type == "passenger":
    # Copy logs using SSH
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh_client.connect(ssh_hostname, username=ssh_username, password=ssh_password)
    channel = ssh_client.invoke_shell()

    def run_command(command):
        print(f"Running command: {command}")
        channel.send(command + '\n')

    ssh_file_path = os.getenv("FTP_PASSENGER_PATH")
    run_command(f"cp {ssh_file_path} passenger.log")


# Create FTP client object
ftp_client = ftplib.FTP(ftp_hostname, ftp_username, ftp_password)

# Download the log file for the current date
ftp_client.retrbinary(f"RETR {file_path}", open(dest_path, "wb").write)

# Close the FTP connection
ftp_client.quit()

