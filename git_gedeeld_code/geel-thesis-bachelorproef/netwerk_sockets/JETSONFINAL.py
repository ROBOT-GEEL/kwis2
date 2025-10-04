# Order of booting files
# 1.Mastersyteem.py
# 2.Jetson.py
# 3.Raspberry_Pi_quiz.py
#
# This is important because else the master system will relay the received message incorrectly.
# Import all necessary libraries
import socket
import threading as th

# The rclpy, geometry_msgs.msg and rclypy.qos are non standard libraries and must be installed
import os 
import sys
import select
import rclpy
import time
from geometry_msgs.msg import Twist
from rclypy.qos import QosProfile

# Import different libraries when using different operating systems
# When using windows import the msvcrt library
if os.name == 'nt':
     import msvcrt
# When using macos or linux (or in other words a unix system) install termios and tty
else:
     import termios
     import tty

# Constants
DEFAULT_SPEED = 0.2  # m/s
DEFAULT_TURN  = 1.0  # rad/s

# Function to print current velocity
def print_vels(speed, turn):
    print(f'Currently:\tspeed {speed}\tturn {turn}')

# Functions to move the robot
# Function to drive forwards
def drive_forward(pub, speed):
    twist = Twist()
    twist.linear.x = speed
    twist.angular.z = 0.0
    pub.publish(twist)

# Function to drive backwards
def drive_backward(pub, speed):
    twist = Twist()
    twist.linear.x = -speed
    twist.angular.z = 0.0
    pub.publish(twist)

# Function to turn left
def turn_left(pub, turn):
    twist = Twist()
    twist.linear.x = 0.0
    twist.angular.z = turn
    pub.publish(twist)

# Function to turn right
def turn_right(pub, turn):
    twist = Twist()
    twist.linear.x = 0.0
    twist.angular.z = -turn
    pub.publish(twist)

# Function to stop 
def stop(pub):
    twist = Twist()
    twist.linear.x = 0.0
    twist.angular.z = 0.0
    pub.publish(twist)

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
            # We make the length of the steps variable so we can decide how far we can go in one direction at once
            # We can also make it so the steps are in very small intervals for safety reasons 
            # The robot should stop according to the lidar prevention so this should not be that big of a issue 
            # Replaced the match case with if else so this script can run on older versions of python
            # (only the newest python version supports this)
            message = client_socket.recv(1024).decode('utf-8')
            if not message:
                print("Server disconnected.")
                break
            if message[0:2] == "dr":
                x = int(message[2:5])
                # Turn to the right for x amount of seconds 
                turn_right(pub, turn)
                time.sleep(x)
                stop(pub)
                print(f"Rotating by an angle of {x}° to the right")
            elif message[0:2] == "dl":
                x = int(message[2:5])
                # Turn to the left for x amount of seconds
                turn_left(pub, turn)
                time.sleep(x)
                stop(pub)
                print(f"Rotating by an angle of {x} to the left")
            elif message[0:2] == "gv":
                x = int(message[2:5])
                # Drive forward for x amount of seconds
                drive_forward(pub, speed)
                time.sleep(x)
                stop(pub)
                print(f"Moving forward in predefined steps by an amount of {x} (hard coded in Jetson)")
            elif message[0:2] ==  "ga":
                x = int(message[2:5])
                # Drive backwards for x amount of seconds, very rare
                drive_backward(pub, speed)
                time.sleep(x)
                stop(pub)
                print("Go backwards, this command is very rare")
            else:
                # When the message is none of the above do nothing and print a statement
                print("Unknown command received.")
            print(f"Received message: {message}")
        except Exception as e:
            # Exit the loop and print a statement when an exception has been caught 
            print(f"Error receiving message: {e}")
            break

# When sending messages to te two other devices we will use a prefix to determine from which device
# The message was sent so we can properly relay the message via the Mastersystem to the 
# Function to send messages to mastersystem
def send_message_mastersystem(message):
        try:
            message = 'm' + message
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

# Function to send messages to RaspBerry-pi-quiz
# Same as the above the only difference is the prefix
def send_message_RaspBerry(message):
        try:
            message = 'r' + message
            client_socket.send(message.encode('utf-8'))
        except Exception as e:
            print(f"Error sending message: {e}")

settings = None
if os.name != 'nt':
    settings = termios.tcgetattr(sys.stdin)
    
rclpy.init()
qos = QoSProfile(depth=10)
node = rclpy.create_node('wheeltec_keyboard')
pub = node.create_publisher(Twist, 'cmd_vel', qos)

# Speed and angle parameters
speed = DEFAULT_SPEED
turn = DEFAULT_TURN

# Start thread for receiving
# We will need to run both the main while loop and receiving function at the same time
# Else the main functionallity of our program will not work
receive_thread = th.Thread(target=receive_messages)

receive_thread.start()

# In this loop we can put the main functionality of the jetson while also sending data to the other systems
# Here we will send the instrucion flags to the other systems 
while True:
    # For now we will just manually send the messages to test the functionality of the flags
    # In the future you can just put the main python code that has to run on the jetson here
    # And then according to the things that will happen in the main code you can send messages to the other systems
    send_message_mastersystem(input("Input what message you want to send to the masterystem:"))
    send_message_RaspBerry(input("Input what message you want to send to the raspberrypi:"))

receive_thread.join()
send_thread.join()

# Close the connection
client_socket.close()
