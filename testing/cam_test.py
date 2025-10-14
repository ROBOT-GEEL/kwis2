import cv2

cap = cv2.VideoCapture(0)  # probeer evt. 1 of 2 als 0 niet werkt

if not cap.isOpened():
    print("Kon geen camera openen")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("Geen beeld ontvangen")
        break

    cv2.imshow("Camera", frame)

    # Druk op q om te stoppen
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
