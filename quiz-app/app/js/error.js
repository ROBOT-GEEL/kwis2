/**
 * Script for error handling and logging.
 * Depends on: language.js (LanguageData)
 */

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
