# order of booting files
# 1.mastersyteem.py
# 2.jetson.py
# 3.Rpi-quiz.py
#
# This is important because else the master system will relay the received message incorrectly.

import socket
import threading as th

# Server settings
server_ip = '127.0.0.1'  # Replace with the server's IP address
server_port = 5100       # Port the server is listening on

# Create a socket
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Connect to the server
client_socket.connect((server_ip, server_port))
print("Connected to the server.")

# Function to receive messages
def receive_messages():
    while True:
        try:
            message = client_socket.recv(1024).decode('utf-8')
            if not message:
                print("Server disconnected.")
                break
            match message[0:2]:
                case "dr":
                    x = int(message[2:5])
                    # Draai onder een hoek van x° rechts
                    print(f"Rotating by an angle of {x}° to the right")
                    pass
                case "dl":
                    x = int(message[2:5])
                    # Draai onder een hoek van x° naar links
                    print(f"Rotating by an angle of {x} to the left")
                case "gv":
                    x = int(message[2:5])
                    # Ga vooruit, in stappen van x (hard coded in jetson)
                    print(f"Moving forward in predefined steps by an amount of {x} (hard coded in Jetson)")
                    pass
                case "ga":
                    # Ga naar achter, zeer zeldzaam
                    print("Go backwards, this command is very rare")
                    pass
                case _:
                    print("Unknown command received.")
            print(f"Received message: {message}")
        except Exception as e:
            print(f"Error receiving message: {e}")
            break

# Function to send messages to mastersystem
def send_message_mastersystem(message):
        try:
            message = 'm' + message
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

# Function to send messages to RaspBerry-pi-quiz
def send_message_RaspBerry(message):
        try:
            message = 'r' + message
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

# Start threads for sending and receiving
receive_thread = th.Thread(target=receive_messages)

receive_thread.start()

# In this loop we can put the main functionality of the jetson while also sending data to the other systems
# Here we will send the instrucion flags to the other systems 
while True:
    send_message_mastersystem(input("Input what message you want to send to the masterystem:"))
    send_message_RaspBerry(input("Input what message you want to send to the raspberrypi:"))

receive_thread.join()
send_thread.join()

# Close the connection
client_socket.close()
