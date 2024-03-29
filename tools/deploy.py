import os
import time
import paramiko
import requests
from dotenv import load_dotenv

# Load configuration variables from .env file
load_dotenv()

# Get SSH configuration variables
hostname = os.getenv("SSH_HOSTNAME")
username = os.getenv("SSH_USERNAME")
password = os.getenv("SSH_PASSWORD")
tracker_url = os.getenv("TRACKER_URL")

# GIT push
os.system('git checkout stable')
os.system('git merge main')
os.system('git push')
os.system('git checkout main')

# Create SSH client object
ssh_client = paramiko.SSHClient()

# Automatically add the server's host key
ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Connect to SSH server
ssh_client.connect(hostname, username=username, password=password)

channel = ssh_client.invoke_shell()


def run_command(command):
    print(f"Running command: {command}")
    channel.send(command + '\n')


run_command("cd results_tracker")
run_command("pwd")

run_command("git pull")
run_command("git status")
run_command("npm install")
run_command("npm run build")
run_command("nodecli restart")

run_command("exit")


while not channel.exit_status_ready():
    if channel.recv_ready():
        output = channel.recv(1024).decode('utf-8')
        print(output, end='')


# Close the SSH connection
ssh_client.close()

print("Waiting 5 seconds...")
time.sleep(5)

# Send get request
resp = requests.get(tracker_url)
print(resp.status_code)
print(resp.text)
