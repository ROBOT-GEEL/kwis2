const socket = io(`ws://${window.location.hostname}`);

function exploring() {
    socket.emit("robot-explore");
}

function toVisitor() {
    socket.emit("robot-go-to-visitors");
}

function atVisitor() {
    socket.emit("robot-arrived-at-visitors");
}

function atQuizLocation() {
    socket.emit("robot-arrived-at-quiz-location");
}