/**
 * Class to handle the quiz functionality.
 * Depends on:
 * - app.js (socket)
 * - language.js (LanguageData)
 * - utils.js (wait, changeScreen)
 * - error.js (logError)
 * - textFit.js (external library)
 */
class Quiz {
    static #answerTime = 10;
    static #maxQuestions = 3;
    static #questions = [];
    static #currentQuestionIndex = 0;
    static #remainingAnswerTime;
    static #quizId = null;
    static visited = false;     // Whether the participants have visited the Expoo
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
            logError("[Quiz Interface] Network error while fetching a new quiz ID");
            throw "ERROR_QUIZ_ID_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Error fetching new quiz ID: " + response.status);
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
            logError("[Quiz Interface] Network error while fetching quiz parameters");
            throw "ERROR_PARAMETERS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Error fetching quiz parameters: " + response.status);
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
            logError("[Quiz Interface] Network error while fetching quiz questions");
            throw "ERROR_QUESTIONS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Error fetching quiz questions: " + response.status);
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
            logError("[Quiz Interface] Network error while fetching quiz instructions");
            throw "ERROR_INSTRUCTIONS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Error fetching quiz instructions: " + response.status);
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
            logError("[Quiz Interface] Network error while fetching time to start quiz");
            throw "ERROR_PARAMETERS_FETCH";
        }
        if (!response.ok) {
            logError("[Quiz Interface] Error fetching time to start quiz: " + response.status);
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
