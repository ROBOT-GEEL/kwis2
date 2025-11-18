/********************************************************************
 * enable.js
 * Logica voor de "Actief" pagina (vragen activeren/deactiveren).
 ********************************************************************/

/**
 * Displays the "Enabled" page.
 * Fetches all questions and renders them with an enable/disable toggle.
 * Sorts to show enabled questions first.
 */
function buttonEnable() {
    // Update UI
    updatePageUI("Actief", "enabledFrame");
    hideAllActionButtons();
    document.getElementById("buttonEnableSave").style.display = "block";
    document.getElementById("buttonEnable").style.display = "block";

    fetch('/cms/getQuestions')
        .then(response => response.json())
        .then(questions => {
            const questionsFrame = document.getElementById('questionsFrame');
            clearQuestionsFrame();

            // Separate enabled and disabled questions
            let enabledQuestions = questions.filter(question => question.enabled);
            let disabledQuestions = questions.filter(question => !question.enabled);
            let sortedQuestions = enabledQuestions.concat(disabledQuestions);

            sortedQuestions.forEach(question => {
                let questionFrame = document.createElement('div');
                questionFrame.className = "questionFrame";
                questionFrame.id = question._id;
                questionFrame.innerHTML = `
                <div class="questionBorder"></div>
                <div onclick="enableQuestion(this.previousElementSibling)" class="question" contenteditable="false">${question.nl.question}</div>
                <label class="enableSwitch">
                    <input type="checkbox" ${question.enabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <div class="answers" toggleEnable="true" style="display: none;">
                    <div class="answerA" contenteditable="false">${question.en.answers[0]}</div>
                    <div class="answerB" contenteditable="false">${question.en.answers[1]}</div>
                    <div class="answerC" contenteditable="false">${question.en.answers[2]}</div>
                </div>
            `;
                questionsFrame.appendChild(questionFrame);
            });

            // Add listeners to the new checkboxes
            initializeCheckboxChangeListeners("buttonEnableSave");
        })
        .catch(error => console.error(`Error getting questions: ${error}`));
}

/**
 * Saves the current "enabled" status of all questions.
 * This calls the generic saveCheckboxState function from common.js
 */
function buttonEnableSave() {
    saveCheckboxState('/cms/saveEnabledCheckBoxes', 'buttonEnableSave', 'enableSwitch');
}
