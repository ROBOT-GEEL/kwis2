# order of booting files
# 1.mastersyteem.py
# 2.jetson.py
# 3.Rpi-quiz.py
#
# This is important because else the master system will relay the received message incorrectly.

import socket
import threading as th
import socketio#imposter library
import time
imposter_sio = socketio.Client()######################"

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
            match message:


                case "ex":
                    print("robot is exploring")
                    imposter_sio.emit("robot-explore")
                case "pr":
                    # Pad gemaakt, robot is aan het rijden(toon de scan animatie op het scherm)
                    print("Path has been created, robot will be driving")

                    imposter_sio.emit("robot-go-to-visitors")
                    time.sleep(5)
                    imposter_sio.emit("robot-arrived-at-visitors")
                    #emit this to webapp
                    #to change screen

                    pass

                case "aq":
                    # Aangekomen op quiz locatie, start de quiz
                    print("Arrived at quiz location, start the quiz")

                    imposter_sio.emit("robot-arrived-at-quiz-location")

                    # emit this to webapp
                    # to change screen

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

# Function to send messages to jetson

def send_message_jetson(message):
        try:
            message = 'j' + message
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

# Start threads for sending and receiving
receive_thread = th.Thread(target=receive_messages)

receive_thread.start()

# In this loop we can put the main functionality of the RaspBerry-pi-quiz while also sending data to the other systems
# Here we will send the instrucion flags to the other systems



@imposter_sio.event
# Print a message when connected to the server
def connect():
    print('Connection established')
@imposter_sio.event
# Print a message when disconnected from the server
def disconnect():
    print('Disconnected from server')
@imposter_sio.event
# is there an event from the web-app
# what is emmitted by the webapp?
def connect():
    print('Connection established')
    # the webapp is on and connected
    send_message_mastersystem('ra')

@imposter_sio.event
def disconnect():
    print('Disconnected from server')
    # the webapp is no longer connected
    # hier moet er nog een vlag voor komen

@imposter_sio.event
def quiz_finished():
    print("quiz is klaar")
    send_message_mastersystem('av')


@imposter_sio.event
def quiz_inactive():
    print("quiz is inactief")
    #send_message_mastersystem('av')


@imposter_sio.event
def drive_to_quiz_location():
    print("make path to quiz location")
    send_message_mastersystem('gq')



#

print('Attempting to connect to the Socket.IO server')
imposter_sio.connect('http://robotoo-interface.local/',
                         retry=True)  # http://robotoo-interface.local/#'http://192.168.81.183'
print('Connected to the Socket.IO server')
while True:
    #print('oof\n')
    pass
    #send_message_mastersystem(input("Input what message you want to send to the masterystem:"))
    #send_message_jetson(input("Input what message you want to send to the jetson:"))




#if __name__ == '__main__':

# Close the connection
receive_thread.join()
send_thread.join()
client_socket.close()
