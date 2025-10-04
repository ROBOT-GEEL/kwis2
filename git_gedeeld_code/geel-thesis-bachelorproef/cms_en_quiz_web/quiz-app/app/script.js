/**
 * Script for the client-side of the Quiz Robot application.
 */

const socket = io(`ws://${window.location.hostname}`);

// Function to wait for a certain amount of time
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Change the screen to the specified screen.
 * 
 * @param {string} screen The ID of the screen to show
 */
function changeScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => {
        s.style.display = (s.id === screen) ? 'block' : 'none';
    });
}

/**
 * Display an error message with the specified language key.
 * 
 * @param {string} key The language key of the error message
 */
function error(key) {
    document.querySelector('#error-message').textContent = LanguageData.get(key);
    document.querySelector('#error').showModal();
}

/**
 * Log an error to the server.
 * 
 * @param {string} errorData The error data to log
 */
function logError(errorData) {

    /**
     * Function to resend local errors to the server.
     */
    function resendLocalErrors() {
        const errors = JSON.parse(localStorage.getItem('errors')) || [];
        localStorage.removeItem('errors');
        errors.forEach(error => {
            sendError(error);
        });
    }
    
    /**
     * Function to send an error to the server.
     * If the error cannot be sent, it will be saved to local storage.
     * 
     * @param {string} errorData The error data to send
     */
    function sendError(errorData) {
        fetch('/log-error', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: errorData })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error logging failed with status ${response.status}`);
            }
            console.log('Error logged successfully');
        })
        .catch(err => {
            console.error(err);
            // Save error to local storage if posting to server fails
            saveErrorLocally(errorData);
        });
    }

    /**
     * Function to save an error to local storage.
     * 
     * @param {string} errorData The error data to save
     */
    function saveErrorLocally(errorData) {
        const errors = JSON.parse(localStorage.getItem('errors')) || [];
        errors.push(errorData);
        localStorage.setItem('errors', JSON.stringify(errors));
    }

    resendLocalErrors();
    sendError(errorData);
}

class Debug {
    static ENABLED = true;

    static {
        // Debug overlay functionality
        if (Debug.ENABLED) {
            document.querySelector('#debug-overlay-button').style.display = 'block';
            document.querySelector('#debug-overlay-button').addEventListener('click', () => {
                // Toggle the debug overlay
                document.querySelector('#debug-overlay').style.display = document.querySelector('#debug-overlay').style.display === 'block' ? 'none' : 'block';
            });

            document.querySelector('#debug-start-btn').addEventListener('click', () => changeScreen('start-screen'));
            document.querySelector('#debug-follow-robot-btn').addEventListener('click', () => changeScreen('follow-robot-screen'));
            document.querySelector('#debug-quiz-instr-btn').addEventListener('click', () => changeScreen('quiz-instructions-screen'));
            document.querySelector('#debug-quiz-btn').addEventListener('click', () => changeScreen('quiz-screen'));
            document.querySelector('#debug-quiz-results-btn').addEventListener('click', () => changeScreen('quiz-finished-screen'));
            document.querySelector('#debug-robot-startup-screen').addEventListener('click', () => changeScreen('robot-startup-screen'));
            document.querySelector('#debug-robot-explore-screen').addEventListener('click', () => changeScreen('robot-explore-screen'));
            document.querySelector('#debug-robot-visitor-screen').addEventListener('click', () => changeScreen('robot-go-to-visitors-screen'));
            document.querySelector('#debug-count').addEventListener('click', () => {
                socket.emit('pi-count-people', { quizId: -1, questionId: -1 });
            });
            document.querySelector('#debug-hide').addEventListener('click', () => {
                document.querySelector('#debug-overlay').style.display = 'none';
                document.querySelector('#debug-overlay-button').style.display = 'block';
                document.querySelector('#debug-overlay-button').style.opacity = 0;
            });
            document.querySelector('#debug-error').addEventListener('click', () => {
                error('ERROR_QUIZ_ID_FETCH');
            });
            document.querySelector('#debug-display-on').addEventListener('click', () => {
                socket.emit('set-display', true);
            });
            document.querySelector('#debug-display-off').addEventListener('click', () => {
                socket.emit('set-display', false);
            });
        }
    }
}

/**
 * Class to handle the language data.
 * 
 * This class handles the following functionality:
 * - Loading the language data from the server
 * - Getting the text for a specific language key
 * - Adding a callback function to be called when the language changes
 * - Changing the selected language
 */
class LanguageData {
    static DEFAULT_LANGUAGE = 'NL';
    static #data = {};
    static selectedLanguage = this.DEFAULT_LANGUAGE;
    static #languageChangeCallbacks = []; // Array of functions to call when the language changes

    static {
        // Add the selected-language class to the default language
        document.querySelector(`#${this.selectedLanguage}-selector`).classList.add('selected-language');

        // Add event listeners to the language selectors
        document.querySelectorAll('.language-selector').forEach(el => {
            el.addEventListener('click', e => {
                console.log(e.target.dataset.language);
                // If the clicked selector is already selected, do nothing
                if (e.target.dataset.language === this.selectedLanguage) {
                    e.preventDefault();
                    return;
                }
                document.querySelector(`#${this.selectedLanguage}-selector`).classList.remove('selected-language');
                this.selectedLanguage = e.target.dataset.language;
                el.classList.add('selected-language');
                // Call the functions that are listening for a language change
                this.#languageChangeCallbacks.forEach(f => f());
            });
        });
    }

    /**
     * Update the language data from the server.
     */
    static async update() {
        const response = await fetch('/language');
        const data = await response.json();
        this.#data = data;
    }

    /**
     * Get the text for a specific language key.
     * 
     * @param {string} key The language key to get the text for
     */
    static get(key) {
        return this.#data[key][this.selectedLanguage];
    }

    /**
     * Add a callback function to be called when the language changes.
     * 
     * @param {Function} f The function to call when the language changes
     */
    static addLanguageChangeCallback(f) {
        this.#languageChangeCallbacks.push(f);
    }
}

/**
 * Class to handle the quiz functionality.
 */
class Quiz {
    static #answerTime = 10;
    static #maxQuestions = 3;
    static #questions = [];
    static #currentQuestionIndex = 0;
    static #remainingAnswerTime;
    static #quizId = null;
    static visited = false;        // Whether the participants have visited the Expoo
    static #nextQuestionDelay = 3;   // The delay between the end of the answer and the start of the next question
    static #cancelInactiveQuiz = true;  // Whether to cancel the quiz if there are no people in the answer zones
    static #inactiveQuizCounter = 0;
    static #instructionsScreenTime = 5; // The time to show the instructions screen
    static #finishedScreenTime = 5; // The time to show the finished screen
    static #cancelled = false;
    static #active = false;
    static #isInitialized = false;
    static #instructions = [];
    static #currentInstructionsIndex = 0;
    static #showingInstructions = false;
    static timeToStartQuiz = 0;

    static {
        // Add a language change callback to update the quiz screen
        LanguageData.addLanguageChangeCallback(() => this.onLanguageChange());

        // Add event listener for the people count from the Pi
        // This is used to cancel the quiz if there are no people in the answer zones twice in a row
        socket.on('pi-count-people-answer', async (data) => {
            // Check if the current quiz is the same as the one that was counted
            if (this.#quizId === data.quizId) {
                // Increment the inactive quiz counter if there are no people in the answer zones
                if (Array.isArray(data.results) && data.results.reduce((a, b) => a + b, 0) === 0) {
                    this.#inactiveQuizCounter++;
                } else {
                    this.#inactiveQuizCounter = 0;
                }
            } else {
                this.#inactiveQuizCounter = 0;
            }
            // If there are no people in the answer zones twice in a row and the quiz is allowed to be cancelled, cancel the quiz
            if (this.#inactiveQuizCounter >= 2 && this.#cancelInactiveQuiz) {
                this.#cancelled = true;
                this.#currentQuestionIndex = this.#questions.length;
                socket.emit('projector-reset');
                changeScreen('quiz-finished-screen');
                await wait(this.#finishedScreenTime * 1000);
                socket.emit('quiz-finished');
            }
        });
    }

    /**
     * Initialize a new quiz.
     * 
     * This function does the following:
     * - Get a new quiz ID from the server
     * - Update the quiz parameters from the server
     * - Get the questions from the server
     * - Get the instructions from the server
     */
    static async initializeNewQuiz() {
        this.#isInitialized = false;
        this.#quizId = await this.#getNewId();
        await this.#updateParameters();
        this.#questions = await this.#getQuestions();
        this.#instructions = await this.#getInstructions();
        await this.updateTimeToStartQuiz();
        this.#isInitialized = true;
    }

    /**
     * Get a new quiz ID from the server.
     * 
     * @returns {string} The new quiz ID
     * @throws If there was an error fetching the quiz ID
     * @throws If the response status was not OK
     */
    static async #getNewId() {
        let response;
        try {
            response = await fetch('/quiz/new-id');
        } catch {
            logError("[Quiz Interface] Netwerkfout bij het ophalen van een nieuw quiz ID");
            throw "ERROR_QUIZ_ID_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Fout bij het ophalen van een nieuw quiz ID: " + response.status);
            throw "ERROR_QUIZ_ID_STATUS";
        }
        const data = await response.json();
        return data.quizId;
    }

    /**
     * Update the quiz parameters from the server.
     * 
     * @throws If there was an error fetching the parameters
     * @throws If the response status was not OK
     */
    static async #updateParameters() {
        let response;
        try {
            response = await fetch('/quiz/parameters');
        } catch {
            logError("[Quiz Interface] Netwerkfout bij het ophalen van de quiz parameters");
            throw "ERROR_PARAMETERS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Fout bij het ophalen van de quiz parameters: " + response.status);
            throw "ERROR_PARAMETERS_STATUS";
        }
        const data = await response.json();
        this.#answerTime = data.answerTime;
        this.#maxQuestions = data.maxQuestions;
        this.#nextQuestionDelay = data.nextQuestionDelay;
        this.#cancelInactiveQuiz = data.cancelInactiveQuiz;
        this.#instructionsScreenTime = data.instructionsScreenTime;
        this.#finishedScreenTime = data.finishedScreenTime;
    }

    /**
     * Get questions from the server.
     * 
     * @returns {Array} An array of questions
     * @throws If there was an error fetching the questions
     * @throws If the response status was not OK
     */
    static async #getQuestions() {
        let response;
        try {
            response = await fetch('/quiz/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visited: this.visited,
                    amount: this.#maxQuestions
                })
            });
        } catch {
            logError("[Quiz Interface] Netwerkfout bij het ophalen van de quizvragen");
            throw "ERROR_QUESTIONS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Fout bij het ophalen van de quizvragen: " + response.status);
            throw "ERROR_QUESTIONS_STATUS";
        }
        const data = await response.json();
        return data;
    }

    /**
     * Get the instructions from the server.
     * 
     * @returns {Array} An array of instructions
     * @throws If there was an error fetching the instructions
     * @throws If the response status was not OK
     */
    static async #getInstructions() {
        let response;
        try {
            response = await fetch('/quiz/instructions');
        } catch {
            logError("[Quiz Interface] Netwerkfout bij het ophalen van de quiz instructies");
            throw "ERROR_INSTRUCTIONS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Fout bij het ophalen van de quiz instructies: " + response.status);
            throw "ERROR_INSTRUCTIONS_STATUS";
        }
        const data = await response.json();
        return data;
    }

    static async #getTimeToStartQuiz() {
        let response;
        try {
            response = await fetch('/quiz/time-to-start');
        } catch {
            logError("[Quiz Interface] Netwerkfout bij het ophalen van de tijd tot het begin van de quiz");
            throw "ERROR_PARAMETERS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Fout bij het ophalen van de tijd tot het begin van de quiz: " + response.status);
            throw "ERROR_PARAMETERS_STATUS";
        }
        const data = await response.json();
        return data.time;
    }

    static async updateTimeToStartQuiz() {
        this.timeToStartQuiz = await this.#getTimeToStartQuiz();
    }

    static async start() {
        // If the quiz is not initialized, wait for it to be initialized
        while (!this.#isInitialized) {
            await wait(100);
        }

        socket.emit('projector-reset');
        // Reset the cancelled flag
        this.#cancelled = false;

        // Show the instructions
        await this.#showInstructions();

        // Change the screen to the quiz screen after the instructions
        changeScreen('quiz-screen'); 
        document.querySelector('#instructions-header').classList.add('instruction-header-big');
        document.querySelector('#instruction-container').classList.add('instruction-container-invisible');
        document.querySelector('#instruction-text').textContent = '';
        document.querySelector('#instruction-image').src = './assets/transparent.png';
        // Set the quiz as active for the language change callback
        this.#active = true;

        // Loop through the questions
        for (this.#currentQuestionIndex = 0; this.#currentQuestionIndex < this.#questions.length; this.#currentQuestionIndex++) {
            this.#showQuestion();
            await this.#answerCountdown();
            // Notify the Pi to count the people in the answer zones
            socket.emit('pi-count-people', { quizId: this.#quizId, questionId: this.#questions[this.#currentQuestionIndex].questionId });
            this.#showCorrectAnswer();
            // Wait until showing the next question
            await wait(this.#nextQuestionDelay * 1000);
            // Clear the answers on the projector
            socket.emit('projector-clear-answers');
            // Reset the correct/wrong answer classes
            document.querySelectorAll('.answer-container').forEach(e => e.classList.remove('wrong-answer-container', 'correct-answer-container'));
            document.querySelectorAll('.answer-label').forEach(e => e.classList.remove('correct-answer-label', 'wrong-answer-label'));
        }

        // Set the quiz as inactive for the language change callback
        this.#active = false;
        // Clear the questions array
        this.#questions = [];

        // Finish the quiz if it was not cancelled
        if (!this.#cancelled) {
            socket.emit('projector-reset');
            changeScreen('quiz-finished-screen');
            await wait(this.#finishedScreenTime * 1000);
            socket.emit('quiz-finished');
        }
    }

    /**
     * Show the instructions.
     */
    static async #showInstructions() {
        changeScreen("quiz-instructions-screen");

        // Show that the instructions are starting in big before showing the instructions
        await wait(this.#instructionsScreenTime * 1000);
        document.querySelector('#instructions-header').classList.remove('instruction-header-big');
        document.querySelector('#instruction-container').classList.remove('instruction-container-invisible');
        await wait(1500);

        this.#showingInstructions = true;
        for (this.#currentInstructionsIndex = 0; this.#currentInstructionsIndex < this.#instructions.length; this.#currentInstructionsIndex++) {
            document.querySelector('#instruction-text').textContent = `${this.#currentInstructionsIndex + 1}) ${this.#instructions[this.#currentInstructionsIndex]['text'][LanguageData.selectedLanguage]}`;
            textFit(document.querySelector('#instruction-text'), {
                alignHoriz: true,
                alignVert: true,
                reprocess: true
            });
            document.querySelector('#instruction-image').src = `./assets/instructions/${this.#instructions[this.#currentInstructionsIndex].image}`;
            await wait(this.#instructions[this.#currentInstructionsIndex].milliseconds);
        }
        this.#showingInstructions = false;
    }

    /**
     * Show the current question.
     * 
     * This function does the following:
     * - Emit the question data to the projector
     * - Show the question and answers on the quiz screen
     * - Update the remaining questions
     */
    static #showQuestion() {
        const question = this.#questions[this.#currentQuestionIndex][LanguageData.selectedLanguage.toLowerCase()].question;
        const answers = this.#questions[this.#currentQuestionIndex][LanguageData.selectedLanguage.toLowerCase()].answers;

        // Emit the question data to the projector
        socket.emit('projector-update-question', {
            question: question,
            answers: answers
        });

        // Show the question
        document.querySelector('[data-lang-key=QUIZ_SCREEN_QUESTION]').innerHTML = LanguageData.get("QUIZ_SCREEN_QUESTION").replace('%question%', question);
        textFit(document.querySelector('#quiz-question'), {
            minFontSize: 4,
            maxFontSize: 200,
            multiLine: true,
            reProcess: true,
            alignHoriz: true,
            alignVert: true
        });

        // Show the answers
        document.querySelectorAll('.answer').forEach(e => e.style.fontSize = '1px');
        answers.forEach((answer, index) => {
            document.querySelector(`#quiz-answer-${index}`).innerHTML = answer;
        });
        textFit(document.querySelectorAll('.answer'), {
            minFontSize: 4,
            maxFontSize: 80,
            multiLine: true,
            reProcess: true
        });

        // Update the remaining questions
        document.querySelector('[data-lang-key=QUIZ_REMAINING_QUESTIONS]').textContent = LanguageData.get("QUIZ_REMAINING_QUESTIONS") + ` ${this.#currentQuestionIndex + 1}/${this.#questions.length}`;
    }

    /**
     * Start the answer countdown.
     * 
     * This function does the following:
     * - Emit the start countdown data to the projector
     * - Update the timer on the quiz screen
     * - Wait for the answer countdown to finish
     */
    static async #answerCountdown() {
        // Emit the start countdown data to the projector
        socket.emit('projector-start-countdown', {
            startTimestamp: Date.now(),
            answerTime: this.#answerTime
        });

        this.#remainingAnswerTime = this.#answerTime;

        // Update the timer on the quiz screen
        document.querySelector('[data-lang-key=QUIZ_SCREEN_TIMER]').innerHTML = LanguageData.get("QUIZ_SCREEN_TIMER").replace('%time%', this.#remainingAnswerTime);
        document.querySelector('#timer-progress-bar').setAttribute('value', this.#remainingAnswerTime * 100 / this.#answerTime);

        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                this.#remainingAnswerTime--;
                document.querySelector('[data-lang-key=QUIZ_SCREEN_TIMER]').innerHTML = LanguageData.get("QUIZ_SCREEN_TIMER").replace('%time%', this.#remainingAnswerTime);
                document.querySelector('#timer-progress-bar').setAttribute('value', this.#remainingAnswerTime * 100 / this.#answerTime);
                if (this.#remainingAnswerTime <= 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    /**
     * Show the correct answer.
     * 
     * This function does the following:
     * - Show the correct answer on the quiz screen
     * - Emit the correct answer to the projector
     */
    static #showCorrectAnswer() {
        const correctAnswer = this.#questions[this.#currentQuestionIndex].correctAnswer;

        // Add the correct/wrong answer classes to the answers
        document.querySelectorAll('.answer-container').forEach((e, index) => {
            if (index === correctAnswer) {
                e.classList.add('correct-answer-container');
            } else {
                e.classList.add('wrong-answer-container');
            }
        });
        document.querySelectorAll('.answer-label').forEach((e, index) => {
            if (index === correctAnswer) {
                e.classList.add('correct-answer-label');
            } else {
                e.classList.add('wrong-answer-label');
            }
        });

        // Emit the correct answer to the projector
        socket.emit('projector-display-answers', {
            answer: correctAnswer
        });
    }

    /**
     * Callback function to call when the language changes.
     * 
     * It updates the question, answers, and the timer if the quiz is active.
     * It also updates the instructions if the instructions are showing.
     */
    static onLanguageChange() {
        if (this.#active) {
            this.#showQuestion();

            if (this.#remainingAnswerTime > 0) {
                document.querySelector('[data-lang-key=QUIZ_SCREEN_TIMER]').innerHTML = LanguageData.get("QUIZ_SCREEN_TIMER").replace('%time%', this.#remainingAnswerTime);
            }
        }

        if (this.#showingInstructions) {
            document.querySelector('#instruction-text').textContent = `${this.#currentInstructionsIndex + 1}) ${this.#instructions[this.#currentInstructionsIndex]['text'][LanguageData.selectedLanguage]}`;
            textFit(document.querySelector('#instruction-text'), {
                alignHoriz: true,
                alignVert: true,
                reprocess: true
            });
        }
    }

    static getQuestionAmount() {
        return this.#maxQuestions;
    }

    static getAnswerTime() {
        return this.#answerTime;
    }
}

/**
 * Callback function to call when the language changes.
 * 
 * It updates most of the content of the frontend.
 */
function onLanguageChange() {
    document.querySelector('[data-lang-key=START_SCREEN_CARD_DESCRIPTION]').innerHTML = LanguageData.get("START_SCREEN_CARD_DESCRIPTION");
    document.querySelector('[data-lang-key=START_SCREEN_START_BUTTON]').innerHTML = LanguageData.get("START_SCREEN_START_BUTTON");
    document.querySelector('[data-lang-key=FOLLOW_SCREEN_TEXT]').innerHTML = LanguageData.get("FOLLOW_SCREEN_TEXT");

    // Update the quiz finished screen
    document.querySelector('[data-lang-key=QUIZ_FINISHED_HEADER]').innerHTML = LanguageData.get("QUIZ_FINISHED_HEADER");
    document.querySelector('[data-lang-key=QUIZ_FINISHED_DESCRIPTION]').innerHTML = LanguageData.get("QUIZ_FINISHED_DESCRIPTION");

    // Visited Expoo modal
    document.querySelector('[data-lang-key=VISITED_EXPOO_MODAL_HEADER]').innerHTML = LanguageData.get("VISITED_EXPOO_MODAL_HEADER");
    document.querySelector('[data-lang-key=VISITED_EXPOO_MODAL_YES]').innerHTML = LanguageData.get("VISITED_EXPOO_MODAL_YES");
    document.querySelector('[data-lang-key=VISITED_EXPOO_MODAL_NO]').innerHTML = LanguageData.get("VISITED_EXPOO_MODAL_NO");

    // Instructions
    document.querySelector('[data-lang-key=INSTRUCTIONS_HEADER]').innerHTML = LanguageData.get("INSTRUCTIONS_HEADER");

    // Exploring
    document.querySelector('[data-lang-key=EXPLORING]').innerHTML = LanguageData.get("EXPLORING");

    // Go to visitors
    document.querySelector('[data-lang-key=GO_TO_VISITOR_HEADER]').innerHTML = LanguageData.get("GO_TO_VISITOR_HEADER");
    document.querySelector('[data-lang-key=GO_TO_VISITOR_DESCRIPTION]').innerHTML = LanguageData.get("GO_TO_VISITOR_DESCRIPTION");
}
// Register the callback function for the language change
LanguageData.addLanguageChangeCallback(() => onLanguageChange());

/////////////////////
// EVENT LISTENERS //
/////////////////////
/**
 * Event listener for the document's DOMContentLoaded event.
 * 
 * This event listener does the following:
 * - Update the language data
 * - Call the onLanguageChange function
 * - Update the time to start the quiz
 * - Change the screen to the start screen
 */
document.addEventListener('DOMContentLoaded', async () => {
    await LanguageData.update();
    onLanguageChange();

    try {
        Quiz.updateTimeToStartQuiz();
    } catch (e) {
        error(e);
        return;
    }

    changeScreen('robot-startup-screen');
    // if (Debug.ENABLED) {
    //     changeScreen('start-screen');
    //     socket.off('robot-explore');
    //     socket.off('robot-go-to-visitors');
    //     socket.off('robot-arrived-at-visitors');
    // } else {
    //     changeScreen('robot-startup-screen');
    // }
});

/**
 * Event listener for the start button on the start screen.
 * 
 * This event listener shows the modal to ask if the participants have visited the Expoo.
 */
document.querySelector('#play-quiz-button').addEventListener('click', async () => {
    document.querySelector('#visited-expoo-modal').style.display = 'block';
});

/**
 * Event listener for the close button on the visited Expoo modal.
 * 
 * This event listener closes the modal.
 */
document.querySelector('#close-modal-btn').addEventListener('click', () => {
    document.querySelector('#visited-expoo-modal').style.display = 'none';
});

/**
 * Event listener for the visited Expoo modal buttons.
 * 
 * This event listener does the following:
 * - Update the Quiz.visited variable
 * - Change the screen to the follow robot screen
 * - Initialize a new quiz
 * - Wait for the robot to go to the start position
 * - Start the quiz
 */
document.querySelector('#visited-expoo-yes').addEventListener('click', async () => {
    document.querySelector('#visited-expoo-modal').style.display = 'none';
    Quiz.visited = true;
    changeScreen('follow-robot-screen');
    socket.emit('drive-to-quiz-location');
    try {
        await Quiz.initializeNewQuiz();
    } catch (e) {
        error(e);
        return;
    }
});

/**
 * Event listener for the visited Expoo modal buttons.
 * 
 * This event listener does the following:
 * - Update the Quiz.visited variable
 * - Change the screen to the follow robot screen
 * - Initialize a new quiz
 * - Wait for the robot to go to the start position
 * - Start the quiz
 */
document.querySelector('#visited-expoo-no').addEventListener('click', async () => {
    document.querySelector('#visited-expoo-modal').style.display = 'none';
    Quiz.visited = false;
    changeScreen('follow-robot-screen');
    socket.emit('drive-to-quiz-location');
    try {
        await Quiz.initializeNewQuiz();
    } catch (e) {
        error(e);
        return;
    }
});

/**
 * Event listener for the error close button.
 * 
 * This event listener closes the error modal and changes the screen to the start screen.
 */
document.querySelector('#error-close').addEventListener('click', () => {
    changeScreen('start-screen');
    document.querySelector('#error').close();
});


//////////////////////////
// COMMUNICATION EVENTS //
//////////////////////////
socket.on('robot-explore', () => {
    changeScreen('robot-explore-screen');

    const interval = setInterval(() => {
        if (document.querySelector('#robot-explore-screen').style.display === 'none') {
            clearInterval(interval);
            return;
        }
        let selectedLanguageIndex = 0;
        document.querySelectorAll('.language-selector').forEach((el, index) => {
            if (el.classList.contains('selected-language')) {
                selectedLanguageIndex = index;
            }
        });
        document.querySelectorAll('.language-selector')[(selectedLanguageIndex + 1) % 3].click();
    }, 2100);
});

socket.on('robot-go-to-visitors', () => {
    changeScreen('robot-go-to-visitors-screen');

    const interval = setInterval(() => {
        if (document.querySelector('#robot-go-to-visitors-screen').style.display === 'none') {
            clearInterval(interval);
            return;
        }
        let selectedLanguageIndex = 0;
        document.querySelectorAll('.language-selector').forEach((el, index) => {
            if (el.classList.contains('selected-language')) {
                selectedLanguageIndex = index;
            }
        });
        document.querySelectorAll('.language-selector')[(selectedLanguageIndex + 1) % 3].click();
    }, 2100);
});

socket.on('robot-arrived-at-visitors', () => {
    document.querySelector('#NL-selector').click();
    changeScreen('start-screen');

    
    if (Quiz.timeToStartQuiz > 0) {
        console.log('Waiting for quiz to start...');
        setTimeout(() => {
            console.log(`Quiz inactive: ${document.querySelector('#start-screen').style.display === 'block'}`);
            if (document.querySelector('#start-screen').style.display === 'block') {
                socket.emit('quiz-inactive');
            }
        }, Quiz.timeToStartQuiz * 1000);
    }
});

socket.on('robot-arrived-at-quiz-location', () => {
    console.log('Robot has arrived at the quiz location!');
    Quiz.start();
});
