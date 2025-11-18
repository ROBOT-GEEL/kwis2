/********************************************************************
 * common.js
 * Gemeenschappelijke hulpfuncties
 ********************************************************************/

/**
 * Updates the page title and highlights the active navigation button.
 * @param {string} title - The new text for the main title.
 * @param {string} activeNavId - The ID of the nav button to highlight.
 */
function updatePageUI(title, activeNavId) {
    // Set the main title
    document.getElementById("title").innerHTML = title;

    // Reset background color for all nav buttons
    const navFrames = ["questionsButtonFrame", "enabledFrame", "visitedFrame", "settingsFrame"];
    navFrames.forEach(frameId => {
        const el = document.getElementById(frameId);
        if (el) {
            el.style.background = "#80c8cc"; // Default color
        }
    });

    // Set active background color
    const activeNav = document.getElementById(activeNavId);
    if (activeNav) {
        activeNav.style.background = "rgb(144 213 218)"; // Active color
    }
}

/**
 * Hides all buttons with the class '.buttonAddQuestion'.
 * Used to manage which primary action buttons are visible.
 */
function hideAllActionButtons() {
    let allButtons = document.querySelectorAll('.buttonAddQuestion');
    allButtons.forEach(function(button) {
        button.style.display = 'none';
    });
}

/**
 * Clears the main content frame where questions are displayed.
 */
function clearQuestionsFrame() {
    document.getElementById('questionsFrame').innerHTML = '';
}

/**
 * Generic function to save the state of all checkboxes on a page (Enable/Visited).
 * @param {string} endpoint - The API endpoint to send the data to.
 * @param {string} buttonId - The ID of the save button (e.g., "buttonEnableSave").
 * @param {string} propertyName - The key to use in the JSON object (e.g., "enableSwitch").
 */
async function saveCheckboxState(endpoint, buttonId, propertyName) {
    const saveButton = document.getElementById(buttonId);
    saveButton.textContent = "Opslaan...";

    const switches = document.querySelectorAll('.enableSwitch'); // Class is always .enableSwitch
    const questionDict = {};

    // Collect the state of each checkbox
    switches.forEach(enableSwitch => {
        const questionId = enableSwitch.parentElement.id;
        questionDict[questionId] = {
            [propertyName]: enableSwitch.firstElementChild.checked,
        };
    });

    // Send the dictionary to the server
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                questionDict
            })
        });

        if (response.ok) {
            console.log(`Flags saved successfully to ${endpoint}`);
            saveButton.textContent = "Opgeslagen";
            return response.json();
        } else {
            console.error(`Failed to save flags to ${endpoint}`);
            throw new Error(`Failed to save flags to ${endpoint}`);
        }
    } catch (error) {
        console.error('Error saving checkbox state:', error);
        saveButton.textContent = "Fout! Opnieuw proberen.";
    }
}

/**
 * Sends a command to toggle the projector on or off.
 * @param {string} state - The desired state (e.g., "on" or "off").
 */
function toggleProjector(state) {
    console.log('Projector toggle requested, going to state:', state);
    fetch('/cms/toggleProjector', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectorState: state
            })
        })
        .then(response => {
            if (response.ok) {
                console.log("Projector toggled successfully");
                return response.json();
            } else {
                throw new Error('Failed to toggle projector');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Navigates the browser back to the main quiz page.
 */
function buttonBackToQuiz() {
    window.location.href = "../";
}

/**
 * Adds 'change' event listeners to all checkboxes on the page.
 * When a checkbox changes, it updates the "Save" button text.
 * @param {string} buttonId - The ID of the save button to update (e.g., "buttonEnableSave").
 */
function initializeCheckboxChangeListeners(buttonId) {
    const inputElements = document.querySelectorAll('input[type="checkbox"]');
    const saveButton = document.getElementById(buttonId);

    inputElements.forEach(input => {
        input.addEventListener('change', () => {
            console.log("Change detected");
            if (saveButton) {
                saveButton.textContent = "Opslaan";
            }
        });
    });
}
