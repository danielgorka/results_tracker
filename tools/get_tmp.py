# Downloads all tmp files from the server
import os
import ftplib
from dotenv import load_dotenv


# Load configuration variables from .env file
load_dotenv()

# Get FTP configuration variables
ftp_hostname = os.getenv("FTP_HOSTNAME")
ftp_username = os.getenv("FTP_USERNAME")
ftp_password = os.getenv("FTP_PASSWORD")
tmp_path = os.getenv("FTP_TMP_PATH")

# Create FTP client object
ftp_client = ftplib.FTP(ftp_hostname, ftp_username, ftp_password)

ftp_client.cwd(tmp_path)

file_list = ftp_client.nlst()

for file in file_list:
    if file == "." or file == "..":
        continue
    print(f"Downloading {file}")
    ftp_client.retrbinary(f"RETR {file}", open(f'tmp/{file}', "wb").write)

# Close the FTP connection
ftp_client.quit()
