import socket
import time
from time import sleep
import hashlib

# Projector configuration
PROJECTOR_IP = "192.168.1.100"
PROJECTOR_PORT = 4352  # PJLink default port
PJLINK_PASSWORD = "1234"  # Set your PJLink password here


# Function to send PJLink command
def send_pjlink_command(command, password=PJLINK_PASSWORD):
    """
    Sends a PJLink command to the projector.
    PJLink requires a %1 prefix and ends with \r.
    Handles authentication if required.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect((PROJECTOR_IP, PROJECTOR_PORT))
            
            # Receive PJLink banner
            banner = s.recv(1024).decode()
            
            if "PJLINK" in banner:
                # Check if authentication is required
                auth_required = banner.startswith("PJLINK 1")
                
                if auth_required and password:
                    # Extract random number from banner
                    print("PJLINK1")
                    rand = banner.split(" ")[2].strip()
                    key = hashlib.md5((rand + password).encode()).hexdigest()
                    command = f"{key}{command}"

            # Send the command
            s.sendall(command.encode())
            sleep(0.5)
            
            # Receive and print response
            response = s.recv(1024).decode()
            print(f"Response: {response}")

    except Exception as e:
        print(f"Error: {e}")


# Main
if __name__ == "__main__":
    # Mute picture 
    print("Muting picture")
    send_pjlink_command("%1AVMT 31\r")  # 31 = Mute, 30 = Unmute
    sleep(5)

    # Unmute picture
    print("Unmuting picture")
    send_pjlink_command("%1AVMT 30\r")
    sleep(5)

    # Turn projector off
    print("Turning projector off")
    send_pjlink_command("%1POWR 0\r")
    sleep(5)

    # Turn projector on
    print("Turning projector on")
    send_pjlink_command("%1POWR 1\r")
