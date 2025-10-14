import cv2

def list_ports(max_failed_ports=6):
    """
    Test all camera ports and return (available_ports, working_ports, non_working_ports)
    """
    non_working_ports = []
    working_ports = []
    available_ports = []
    dev_port = 0

    while len(non_working_ports) < max_failed_ports:
        camera = cv2.VideoCapture(dev_port, cv2.CAP_DSHOW)  # CAP_DSHOW voorkomt waarschuwingen op Windows

        if not camera.isOpened():
            print(f"Port {dev_port} is not working.")
            non_working_ports.append(dev_port)
        else:
            is_reading, img = camera.read()
            w = int(camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if is_reading:
                print(f"Port {dev_port} is working and reads images ({w}x{h})")
                working_ports.append(dev_port)
            else:
                print(f"Port {dev_port} is available but does not read images ({w}x{h})")
                available_ports.append(dev_port)
        camera.release()  # <-- Belangrijk! Sluit de camera
        dev_port += 1

    return available_ports, working_ports, non_working_ports


if __name__ == "__main__":
    available, working, non_working = list_ports()
    print("\nAvailable:", available)
    print("Working:", working)
    print("Non-working:", non_working)
