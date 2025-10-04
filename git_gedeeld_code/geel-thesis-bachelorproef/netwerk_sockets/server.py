# server.py
# Ebbe and Nicola

#Questions:
#1: you need to include the libaries socket and threading
#2: you get the ip adresses by using gethostname
#3:
#4: Bye using SOCK_STREAM line 37
#5: Bye using the ip adress and the port number
#6: in the handle_client function

import time, socket, sys
import threading

def handle_client(conn, addr):
    s_name = conn.recv(port).decode()
    print(s_name, "has connected to the chat room\nEnter bye to exit chat room\n")
    conn.send(name.encode())

    while True:
        message = input(str("Me : "))
        if message == "bye":
            message = "Left chat room!"
            conn.send(message.encode())
            print("\n")
            conn.close()
            break
        conn.send(message.encode())
        message = conn.recv(port).decode()
        print(s_name, ":", message)

# Main server code
print("\nWelcome to Chat Room\n")
print("Initialising....\n")
time.sleep(1)

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
host = socket.gethostname()
ip = socket.gethostbyname(host)
port = 5500
s.bind((host, port))
print(host, "(", ip, ")\n")
name = input(str("Enter your name: "))

s.listen()

while True:
    conn, addr = s.accept()
    print("Received connection from ", addr[0], "(", addr[1], ")\n")

    client_thread = threading.Thread(target=handle_client, args=(conn, addr))
    client_thread.start()
