async function buttonSaveSettings() {
    document.getElementById("buttonSaveSettings").textContent = "Opslaan...";
    try {
        // Store all the settings in a dictionary
        var settingsDict = {};
        settingsDict.answerTime = parseInt(document.getElementById("answerTime").value);
        settingsDict.maxQuestions = parseInt(document.getElementById("maxQuestions").value);
        settingsDict.nextQuestionDelay = parseInt(document.getElementById("nextQuestionDelay").value);
        settingsDict.instructionsScreenTime = parseInt(document.getElementById("instructionsScreenTime").value);
        settingsDict.finishedScreenTime = parseInt(document.getElementById("finishedScreenTime").value);
        settingsDict.timeToStartQuiz = parseInt(document.getElementById("timeToStartQuiz").value);

        // Retrieve boolean inputs
        settingsDict.cancelInactiveQuiz = document.getElementById("cancelInactiveQuizCheckbox").checked;

        // Send the settings dictionary to the server to update the database
        const response = await fetch('/cms/saveSettings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                settingsDict
            })
        });
        if (response.ok) {
            console.log("Settings saved successfully");
            // Give a visual indicator that the document is saved sucsesfuly
            document.getElementById("buttonSaveSettings").textContent = "Opgeslagen";
            return response.json();
        } else {
            console.error('Failed to save settings');
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}



function retrieveSettings() {
    fetch('/cms/getSettings')
    .then(response => response.json())
    .then(Settings  => {
        // Update the UI with the retrieved settings
        document.getElementById("answerTime").value = Settings.answerTime;
        document.getElementById("maxQuestions").value = Settings.maxQuestions;
        document.getElementById("nextQuestionDelay").value = Settings.nextQuestionDelay;
        document.getElementById("cancelInactiveQuizCheckbox").checked = Settings.cancelInactiveQuiz;
        document.getElementById("instructionsScreenTime").value = Settings.instructionsScreenTime;
        document.getElementById("finishedScreenTime").value = Settings.finishedScreenTime;
        document.getElementById("timeToStartQuiz").value = Settings.timeToStartQuiz;
    })
    .catch(error => console.error(`Error getting Settings: ${error}`));
}


// Function to change button text to "Save" when any setting changes
function initializeSettingsChangeListeners() {
    const inputElements = document.querySelectorAll('input[type="number"], input[type="checkbox"]');
    inputElements.forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById("buttonSaveSettings").textContent = "Opslaan";
        });
    });
}

// Function to control projector
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

// Call the function to initialize listeners when the page loads
document.addEventListener('DOMContentLoaded', initializeSettingsChangeListeners);
// When the page gets loaded the current settings show directly
retrieveSettings();