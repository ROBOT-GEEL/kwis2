// Store references to elements once.
const mainElement = document.querySelector('main');
const questionElement = document.querySelector('#question');
const answerTextElements = document.querySelectorAll('.answer-text');
const answerElements = document.querySelectorAll('.answer');
const timerSpanElement = document.querySelector('#timer span');
const timerProgressElement = document.querySelector('#timer progress');

// io() connects to the host that served the page (works with http/https and ports).
const socket = io();

async function sendProjectorCommand(action) {
  try {
    const response = await fetch("/cms/toggleProjector", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectorState: action })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const text = await response.text();
    console.log(text);
  } catch (error) {
    console.error("Error sending projector command:", error);
  }
}

sendProjectorCommand("sleep")


// Global timer variable
let countdownInterval = null;

/**
 * Constant for textFit options.
 */
const textFitOptions = {
    multiLine: true,
    reProcess: true,
    alignHoriz: true,
    alignVert: true
};

/**
 * Helper function to remove 'correct'/'wrong' classes from all answers.
 */
const clearAnswerClasses = () => {
    answerElements.forEach(e => e.classList.remove('correct-answer', 'wrong-answer'));
};

/**
 * Creates and returns the function that updates the timer UI.
 * This avoids repetitive code in the countdown handler.
 */
const createTimerUpdater = (startTimestamp, answerTime) => {
    return () => {
        const elapsed = (Date.now() - startTimestamp) / 1000;
        let remainingTime = answerTime - elapsed;

        if (remainingTime <= 0) {
            remainingTime = 0;
            clearInterval(countdownInterval); // Stop the timer
        }

        timerSpanElement.textContent = `${Math.ceil(remainingTime)}s`;

        // Calculate percentage and clamp it between 0 and 100
        const percentage = Math.max(0, Math.min(100, (remainingTime / answerTime) * 100));
        timerProgressElement.value = percentage; // .value is more efficient than setAttribute
    };
};

// --- Socket.io Event Listeners ---

socket.on('connect', () => {
    console.log('Connected to socket.io server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from socket.io server');
    // Ensure the timer stops on disconnect
    clearInterval(countdownInterval);
});

socket.on('projector-update-question', (data) => {
    sendProjectorCommand("wake")
    mainElement.classList.remove('hidden');
    questionElement.innerHTML = data.question;

    answerTextElements.forEach((element, index) => {
        element.innerHTML = data.answers[index];
    });

    // Use the cached elements and reusable options
    textFit(questionElement, textFitOptions);
    textFit(answerTextElements, textFitOptions);
});

socket.on('projector-start-countdown', (data) => {
    // Always clear any existing timer
    clearInterval(countdownInterval);

    const { startTimestamp, answerTime } = data; // ES6 destructuring

    // Create the specific update function for this countdown
    const updateTimerDisplay = createTimerUpdater(startTimestamp, answerTime);

    // Run once immediately to show the initial time
    updateTimerDisplay();

    // Calculate the delay until the *next* full second
    const offset = Date.now() - startTimestamp;
    const firstTickDelay = 1000 - (offset % 1000);

    // Use setTimeout to *start* the setInterval on the next full second.
    // This maintains the smart synchronization logic from your original code.
    setTimeout(() => {
        updateTimerDisplay(); // First "clean" tick
        // Store the ID in the *global* variable
        countdownInterval = setInterval(updateTimerDisplay, 1000);
    }, firstTickDelay);
});

socket.on('projector-display-answers', (data) => {
    // Use the cached elements
    const correctAnswerId = `answer-${data.answer}`;

    answerElements.forEach(el => {
        if (el.id === correctAnswerId) {
            el.classList.add('correct-answer');
        } else {
            el.classList.add('wrong-answer');
        }
    });
});

socket.on('projector-clear-answers', () => {
    clearAnswerClasses();
});

socket.on('projector-reset', () => {
    sendProjectorCommand('sleep');
    mainElement.classList.add('hidden');
    clearAnswerClasses();

    questionElement.innerHTML = '';
    answerTextElements.forEach(e => e.innerHTML = '');

    timerSpanElement.textContent = '';
    timerProgressElement.value = 0;

    // Stop the timer on reset
    clearInterval(countdownInterval);
});
