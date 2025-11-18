/**
 * Script for the Manual overlay functionality.
 * Depends on: app.js (socket), utils.js (changeScreen), error.js (error)
 */
class Manual {
    static ENABLED = true;
    static {
        // Debug overlay functionality
        if (Manual.ENABLED) {
            document.querySelector('#manual-overlay-button').style.display = 'block';
            document.querySelector('#manual-overlay-button').addEventListener('click', () => {
                // Toggle the debug overlay
                document.querySelector('#manual-overlay').style.display = document.querySelector('#manual-overlay').style.display === 'block' ? 'none' : 'block';
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
