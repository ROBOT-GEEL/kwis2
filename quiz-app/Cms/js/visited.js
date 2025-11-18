/********************************************************************
 * visited.js
 * Logica voor de "Bezocht" pagina (vragen als bezocht markeren).
 ********************************************************************/

/**
 * Displays the "Visited" page.
 * Fetches all *enabled* questions and renders them with a visited/not-visited toggle.
 * Sorts to show visited questions first.
 */
function buttonVisited() {
    // Update UI
    updatePageUI("Bezocht", "visitedFrame");
    hideAllActionButtons();
    document.getElementById("buttonVisitedSave").style.display = "block";
    document.getElementById("buttonVisited").style.display = "block";

    fetch('/cms/getQuestions')
        .then(response => response.json())
        .then(questions => {
            const questionsFrame = document.getElementById('questionsFrame');
            clearQuestionsFrame();

            // Filter out disabled questions first
            let enabledQuestions = questions.filter(question => question.enabled);

            // Separate visited and not-visited questions
            let visitedQuestions = enabledQuestions.filter(question => question.bezocht);
            let notVisitedQuestions = enabledQuestions.filter(question => !question.bezocht);
            let sortedQuestions = visitedQuestions.concat(notVisitedQuestions);

            sortedQuestions.forEach(question => {
                let questionFrame = document.createElement('div');
                questionFrame.className = "questionFrame";
                questionFrame.id = question._id;
                questionFrame.innerHTML = `
                <div class="questionBorder"></div>
                <div onclick="enableQuestion(this.previousElementSibling)" class="question" contenteditable="false">${question.nl.question}</div>
                <label class="enableSwitch">
                    <input type="checkbox" ${question.bezocht ? 'checked' : ''}>
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
            initializeCheckboxChangeListeners("buttonVisitedSave");
        })
        .catch(error => console.error(`Error getting questions: ${error}`));
}

/**
 * Saves the current "visited" status of all questions.
 * This calls the generic saveCheckboxState function from common.js
 */
function buttonVisitedSave() {
    saveCheckboxState('/cms/saveVisitedCheckBoxes', 'buttonVisitedSave', 'visitedSwitch');
}
