import socket
import threading as th
import rclpy
from rclpy.qos import qos_profile_default
from geometry_msgs.msg import Twist
import sys
import select
import termios
import tty

settings = termios.tcgetattr(sys.stdin)

# Server settings
server_ip = '127.0.0.1'  # Replace with the server's IP address
server_port = 5100       # Port the server is listening on

# Create a socket
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Connect to the server
client_socket.connect((server_ip, server_port))
print("Connected to the server.")

# Global variables
message = ""

# Settings

MAX_SPEED = 1.5
MAX_TURN = 0.2

# More information about working 

"""
Reading from the socket  and Publishing to Twist!
---------------------------
Moving around:
   ju    ji    jo
   jj    jk    jl
   jm    j,    j.

For Holonomic mode (strafing), hold down the shift key:
---------------------------
   jU    jI    jO
   jJ    jK    jL
   jM    j<    j>

jt : up (+z)
jb : down (-z)

anything else : stop

jq/jz : increase/decrease max speeds by 10%
jw/jx : increase/decrease only linear speed by 10%
je/jc : increase/decrease only angular speed by 10%

CTRL-C to quit
"""

# moveBindings
moveBindings = {
    'ji': (1, 0, 0, 0),
    'jo': (1, 0, 0, -1),
    'jj': (0, 0, 0, 1),
    'jl': (0, 0, 0, -1),
    'ju': (1, 0, 0, 1),
    'j,': (-1, 0, 0, 0),
    'j.': (-1, 0, 0, 1),
    'jm': (-1, 0, 0, -1),
    'jO': (1, -1, 0, 0),
    'jI': (1, 0, 0, 0),
    'jJ': (0, 1, 0, 0),
    'jL': (0, -1, 0, 0),
    'jU': (1, 1, 0, 0),
    'j<': (-1, 0, 0, 0),
    'j>': (-1, -1, 0, 0),
    'jM': (-1, 1, 0, 0),
    'jt': (0, 0, 1, 0),
    'jb': (0, 0, -1, 0),
}

# speedBindings
speedBindings = {
    'jq': (1.1, 1.1),
    'jz': (.9, .9),
    'jw': (1.1, 1),
    'jx': (.9, 1),
    'je': (1, 1.1),
    'jc': (1, .9),
}

# Function to receive messages
def receive_messages():
    global message
    while True:
        try:
            msg = client_socket.recv(2).decode('utf-8')
            if not msg:
                print("Server disconnected.")
                break
            else:
                message = msg
                print(f"Received message: {message}")
        except Exception as e:
            print(f"Error receiving message: {e}")
            break


def getKey():
    return message


# Function to send messages to master system
def send_message_mastersystem(msg):
    try:
        msg = 'm' + msg
        client_socket.send(msg.encode('utf-8'))
    except Exception as e:
        print(f"Error sending message: {e}")


# Function to send messages to Raspberry Pi quiz
def send_message_RaspBerry(msg):
    try:
        msg = 'r' + msg
        client_socket.send(msg.encode('utf-8'))
    except Exception as e:
        print(f"Error sending message: {e}")


def main(args=None):
    if args is None:
        args = sys.argv

    rclpy.init(args)
    node = rclpy.create_node('teleop_twist_keyboard')
    pub = node.create_publisher(Twist, 'cmd_vel', qos_profile_default)

    speed = 0.5
    turn = 0.2
    x = 0
    y = 0
    z = 0
    th = 0
    status = 0

    # Start thread for receiving messages
    receive_thread = th.Thread(target=receive_messages)
    receive_thread.start()

    try:
        while True:
            key = getKey()
            if key in moveBindings.keys():          # See moveBindings mapping above for move information
                x = moveBindings[key][0]            
                y = moveBindings[key][1]
                z = moveBindings[key][2]
                th = moveBindings[key][3]
            elif key in speedBindings.keys():
                speed *= speedBindings[key][0]
                turn *= speedBindings[key][1]
                print(f" Current speed: {speed}, Current turn: {turn}")
                if speed > MAX_SPEED:       # Safety to make sure the robot does not exceed a certain speed
                    speed = MAX_SPEED
                if turn > MAX_TURN:         # Safety to make sure the robot does not spin to far
                    turn = MAX_TURN
                status = (status + 1) % 15
            else:
                x = 0
                y = 0
                z = 0
                th = 0
                if key == '\x03':  # Ctrl+C
                    break

            twist = Twist()
            twist.linear.x = x * speed
            twist.linear.y = y * speed
            twist.linear.z = z * speed
            twist.angular.x = 0.0
            twist.angular.y = 0.0
            twist.angular.z = th * turn
            pub.publish(twist)

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        # Stop the robot
        twist = Twist()
        twist.linear.x = 0.0
        twist.linear.y = 0.0
        twist.linear.z = 0.0
        twist.angular.x = 0.0
        twist.angular.y = 0.0
        twist.angular.z = 0.0
        pub.publish(twist)

        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, settings)

if __name__ == '__main__':
    main()
