/**
 * Script for the client-side of the Quiz Robot application.
 * This is the main entry point.
 *
 * Depends on:
 * - socket.io (external library)
 * - language.js (LanguageData)
 * - quiz.js (Quiz)
 * - utils.js (changeScreen)
 * - error.js (error)
 * - debug.js (Debug) - (conditionally)
 */

window.socket = io(`ws://${window.location.hostname}`);

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
 * (YES)
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
 * (NO)
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
 */
document.querySelector('#error-close').addEventListener('click', () => {
    changeScreen('start-screen');
    document.querySelector('#error').close();
});
