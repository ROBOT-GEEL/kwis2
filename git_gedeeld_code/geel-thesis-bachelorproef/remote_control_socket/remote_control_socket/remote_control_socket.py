import socket
import threading as tht
import rclpy
from rclpy.qos import QoSProfile, QoSReliabilityPolicy
from rclpy.qos import QoSHistoryPolicy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import sys
import select
import termios
import tty

settings = termios.tcgetattr(sys.stdin)

# Server settings
server_ip = '192.168.137.37'  # Replace with the server's IP address
server_port = 5100       # Port the server is listening on

# Create a socket
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print("hello")
# Connect to the server
client_socket.connect((server_ip, server_port))
print("Connected to the server.")

# Global variables
message = ""

# Settings

MAX_SPEED = 1.5
MAX_TURN = 0.5

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
    'z': (1, 0, 0, 0),
    'o': (1, 0, 0, -1),
    'q': (0, 0, 0, 1),
    'd': (0, 0, 0, -1),
    'u': (1, 0, 0, 1),
    's': (-1, 0, 0, 0),
    '.': (-1, 0, 0, 1),
    'm': (-1, 0, 0, -1),
    'O': (1, -1, 0, 0),
    'I': (1, 0, 0, 0),
    'J': (0, 1, 0, 0),
    'L': (0, -1, 0, 0),
    'U': (1, 1, 0, 0),
    '<': (-1, 0, 0, 0),
    '>': (-1, -1, 0, 0),
    'M': (-1, 1, 0, 0),
    't': (0, 0, 1, 0),
    'b': (0, 0, -1, 0),
}

# speedBindings
speedBindings = {
    'q': (1.1, 1.1),
    'z': (.9, .9),
    'w': (1.1, 1),
    'x': (.9, 1),
    'e': (1, 1.1),
    'c': (1, .9),
}

# Function to receive messages
def receive_messages():
    
    while True:
        try:
            msg = client_socket.recv(2).decode('utf-8')
            if not msg:
                print("Server disconnected.")
                break
            else:
                message = msg
                print(f"Received message: {message}")
                return message
        except Exception as e:
            print(f"Error receiving message: {e}")
            break


def getKey():
    message =  receive_messages()
    print(message)
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

    rclpy.init()
    qos_profile = QoSProfile(
    history=QoSHistoryPolicy.KEEP_LAST,
    depth=10,
    reliability=QoSReliabilityPolicy.RELIABLE
)
    node = Node('teleop_twist_keyboard')
    pub = node.create_publisher(Twist, 'cmd_vel', qos_profile)

    speed = 0.5
    turn = 0.5
    x = 0
    y = 0
    z = 0
    th = 0
    status = 0

    # Start thread for receiving messages
    receive_thread = tht.Thread(target=receive_messages)
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