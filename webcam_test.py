WIDTH = 4096
HEIGHT = 2160

import cv2 as cv
import numpy as np

import os
HOME = os.getcwd()
print(HOME)

from IPython import display
display.clear_output()

# initiate polygon zone
ZONE_WIDTH = WIDTH//2
ZONE_HEIGHT = HEIGHT//2
polygon = np.array([
    [WIDTH//4, 0],
    [WIDTH//4 + ZONE_WIDTH, 0],
    [WIDTH//4 + ZONE_WIDTH, HEIGHT],
    [WIDTH//4, HEIGHT]
])


cam_port = "/dev/v4l/by-id/usb-046d_Logitech_BRIO_17E63C5B-video-index0"
cam = cv.VideoCapture("/dev/video4")

#cam = cv.VideoCapture(cam_port, cv.CAP_V4L2)
cam.set(cv.CAP_PROP_FOURCC, cv.VideoWriter_fourcc(*'MJPG'))
cam.set(cv.CAP_PROP_FRAME_WIDTH, WIDTH)
cam.set(cv.CAP_PROP_FRAME_HEIGHT, HEIGHT)

# Check if the webcam is opened correctly
if not cam.isOpened():
    raise IOError("Cannot open webcam")

stop = False
while True:
    # video feed loop
    while True:
        ret, frame = cam.read()
        frame = cv.flip(frame, 1)
        #frame = cv.resize(frame, None, fx=0.5, fy=0.5, interpolation=cv.INTER_AREA)
        frame = cv.resize(frame, (960, 540))
        cv.imshow('Input', frame)

        c = cv.waitKey(1)
        if c == 107:
            break
        if c == 27:
            stop = True
            break
    cv.destroyAllWindows()

    if stop:
        break
    # reading the input using the camera
    result, frame = cam.read()
    frame = cv.flip(frame, 1)

    if result:
        cv.imwrite("original.jpg", frame)

        # Closes all the frames
        cv.destroyAllWindows()
	# If captured image is corrupted, moving to else part
    else:
        print("No image detected. Please! try again")

cam.release()
