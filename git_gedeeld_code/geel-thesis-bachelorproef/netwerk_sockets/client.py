import time, socket, sys

print("\nWelcome to Chat Room\n")
print("Initialising....\n")
time.sleep(1)

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
shost = socket.gethostname()
ip = socket.gethostbyname(shost)
print(shost, "(", ip, ")\n")
host = input(str("Enter server address: "))

port = 5500

print("\nTrying to connect to ", host, "(",  port, ")\n")
time.sleep(1)
s.connect((host, port))
print("Connected...\n")

s.send(name.encode())
s_name = s.recv(port)
s_name = s_name.decode()
print(s_name, "has joined the chat room\nEnter bye to exit chat room\n")
while True:
    message = s.recv(port)
    message = message.decode()
    print(s_name, ":", message)
    message = input(str("Me : "))
    if message == "bye":
        message = "Left chat room!"
        s.send(message.encode())
        print("\n")
        s.close()
        break
    s.send(message.encode())