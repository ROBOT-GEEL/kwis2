/**
 * Script with utility functions for the Quiz Robot application.
 */

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
