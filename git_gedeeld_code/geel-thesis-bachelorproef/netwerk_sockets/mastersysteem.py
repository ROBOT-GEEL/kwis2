# order of booting files
# 1.mastersyteem.py
# 2.jetson.py
# 3.Rpi-quiz.py
#
# This is important because else the master system will relay the received message incorrectly.

import socket
import threading as th

# Server settings
host = '127.0.0.1'   # Listen on localhost
port = 5100          # Port to listen on

# Create a socket
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Bind the socket to the address and port
server_socket.bind((host, port))

# Listen for 2 incoming connections
server_socket.listen(2)
print(f"Server listening on port {port}...")

# Accept the first connection
client_socket1, client_address1 = server_socket.accept()
print(f"Connection established with {client_address1}")

# Accept the second connection
client_socket2, client_address2 = server_socket.accept()
print(f"Connection established with {client_address2}")

# Function to receive messages
def receive_messages(client_socket):
    while True:
        try:
            message = client_socket.recv(1024).decode('utf-8')
            if not message:
                print("Client disconnected.")
                break
            print(f"Received message: {message}")
            # If the message is intended for the mastersystem
            if message [0] == 'm':
                # Switch case for handling commands
                match message[1:]:
                    case "ra":
                        # Raspberry pi staat aan, maak een pad
                        print("Raspberry Pi is on, creating a path...")
                        send_message(client_socket2, "ex")  # message for quiz emit exploring screen
                    case "gq":
                        # Bezoeker geeft input voor quiz te starten, maak pad naar de quiz locatie
                        print("Heading to the quiz location for quiz to start...")
                    case "av":
                        # Quiz is afgelopen, ga maar terug naar de verkenzone
                        print("Quiz ended, returning to the exploration zone...")
                        send_message(client_socket2, "ex")#message for quiz emit exploring screen

                    case "ns":
                        # Noodstop, bezoeker/object te dicht bij robot
                        print("Emergency stop, obstacle too close!")
                    case _:
                        print("Unknown command received.")
            # If the message is intended for the jetson
            if message[0] == 'j':
                send_message(client_socket1,message[1:])
            # If the message is intended for the RaspBerry-pi-quiz
            if message[0] == 'r':
                print('to the raspberry pi')
                send_message(client_socket2,message[1:])
        except Exception as e:
            print(f"Error receiving message: {e}")
            break

# Function to send messages
# We can decide if we want to send to te jetson or the other raspberry pi by using the client_socket
def send_message(client_socket, message):
        try:
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

# Start threads for sending and receiving for each client
receive_thread1 = th.Thread(target=receive_messages, args=(client_socket1,))
receive_thread2 = th.Thread(target=receive_messages, args=(client_socket2,))

receive_thread1.start()
receive_thread2.start()

# In this loop we can put the main functionality of the Mastersystem while also sending data to the other systems
while True:
    send_message(client_socket1,input("Input what message you want to send to jetson:"))
    send_message(client_socket2,input("Input what message you want to send to Rpi-quiz:"))

receive_thread1.join()
receive_thread2.join()

# Close the connection
client_socket1.close()
client_socket2.close()
server_socket.close()