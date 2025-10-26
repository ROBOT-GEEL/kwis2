import cv2


# Definieer je symlinks
cameras = {
    "1": "/dev/camerazonea",
    "2": "/dev/camerazoneb",
    "3": "/dev/camerazonec"
}

# Start met camera 1
current_key = "1"
cap = cv2.VideoCapture(cameras[current_key], cv2.CAP_V4L2)

print("Druk op 1, 2 of 3 om van camera te wisselen. Druk op q om te stoppen.")

while True:
    ret, frame = cap.read()
    if not ret:
        frame = None

    if frame is not None:
        cv2.imshow("Camera " + current_key, frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('q'):
        break
    elif chr(key) in cameras.keys():
        # Sluit huidige camera
        cap.release()
        cv2.destroyWindow("Camera " + current_key)

        # Wissel naar nieuwe camera
        current_key = chr(key)
        cap = cv2.VideoCapture(cameras[current_key], cv2.CAP_V4L2)
        print(f"--> Gewisseld naar camera {current_key}")

cap.release()
cv2.destroyAllWindows()
