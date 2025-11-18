/********************************************************************
 * questions.js
 * Logica voor het tonen, bewerken en opslaan van vragen.
 ********************************************************************/

/**
 * Displays the main "Questions" page for editing questions.
 * Fetches all enabled questions and renders them with full edit controls.
 */
function displayQuestions() {
    // Update UI state
    updatePageUI("Vragen", "questionsButtonFrame");
    hideAllActionButtons();
    document.getElementById("buttonAddQuestion").style.display = "block";

    // Load questions from the database
    fetch('/cms/getQuestions')
        .then(response => response.json())
        .then(questions => {
            const questionsFrame = document.getElementById('questionsFrame');
            clearQuestionsFrame();

            questions.forEach(question => {
                // Only show enabled questions on this page
                if (!question.enabled) {
                    return;
                }

                let questionFrame = document.createElement('div');
                questionFrame.className = "questionFrame";
                questionFrame.id = question._id;
                questionFrame.innerHTML = `
                <div class="questionBorder"></div>
                <div class="questionLanguageBundle" contenteditable="false">
                    <div onclick="showAnswers(this.parentElement)" class="question" style="display: none;">${question.en.question}</div>
                    <div onclick="showAnswers(this.parentElement)" class="question" style="display: block;">${question.nl.question}</div>
                    <div onclick="showAnswers(this.parentElement)" class="question" style="display: none;">${question.fr.question}</div>
                </div>
                <div class="answers" toggleEnable="true" correctAnswer=${question.correctAnswer} style="display: none;" language="nl">
                    <div class="answerEN" style="display: none;">
                        <input type="radio" name="correctAnswerSelectEn_${question._id}" id="correctAwnserA" onclick="selectCorrectAnswer(this.parentElement,'A')" ${(question.correctAnswer === 0)? "checked" : ""} disabled>
                        <div class="answerA" contenteditable="false">${question.en.answers[0]}</div>
                        <input type="radio" name="correctAnswerSelectEn_${question._id}" id="correctAwnserB" onclick="selectCorrectAnswer(this.parentElement,'B')" ${(question.correctAnswer === 1)? "checked" : ""} disabled>
                        <div class="answerB" contenteditable="false">${question.en.answers[1]}</div>
                        <input type="radio" name="correctAnswerSelectEn_${question._id}" id="correctAwnserC" onclick="selectCorrectAnswer(this.parentElement,'C')" ${(question.correctAnswer === 2)? "checked" : ""} disabled>
                        <div class="answerC" contenteditable="false">${question.en.answers[2]}</div>
                    </div>
                    <div class="answerNL" style="display: block;">
                        <input type="radio" name="correctAnswerSelectNl_${question._id}" id="correctAwnserA" onclick="selectCorrectAnswer(this.parentElement,'A')" ${(question.correctAnswer === 0)? "checked" : ""} disabled>
                        <div class="answerA" contenteditable="false">${question.nl.answers[0]}</div>
                        <input type="radio" name="correctAnswerSelectNl_${question._id}" id="correctAwnserB" onclick="selectCorrectAnswer(this.parentElement,'B')" ${(question.correctAnswer === 1)? "checked" : ""} disabled>
                        <div class="answerB" contenteditable="false">${question.nl.answers[1]}</div>
                        <input type="radio" name="correctAnswerSelectNl_${question._id}" id="correctAwnserC" onclick="selectCorrectAnswer(this.parentElement,'C')" ${(question.correctAnswer === 2)? "checked" : ""} disabled>
                        <div class="answerC" contenteditable="false">${question.nl.answers[2]}</div>
                    </div>
                    <div class="answerFR" style="display: none;">
                        <input type="radio" name="correctAnswerSelectFr_${question._id}" id="correctAwnserA" onclick="selectCorrectAnswer(this.parentElement,'A')" ${(question.correctAnswer === 0)? "checked" : ""} disabled>
                        <div class="answerA" contenteditable="false">${question.fr.answers[0]}</div>
                        <input type="radio" name="correctAnswerSelectFr_${question._id}" id="correctAwnserB" onclick="selectCorrectAnswer(this.parentElement,'B')" ${(question.correctAnswer === 1)? "checked" : ""} disabled>
                        <div class="answerB" contenteditable="false">${question.fr.answers[1]}</div>
                        <input type="radio" name="correctAnswerSelectFr_${question._id}" id="correctAwnserC" onclick="selectCorrectAnswer(this.parentElement,'C')" ${(question.correctAnswer === 2)? "checked" : ""} disabled>
                        <div class="answerC" contenteditable="false">${question.fr.answers[2]}</div>
                    </div>
                </div>
                <div class="editframe" onclick="enableEditing(this.parentElement)">
                    <img class="editIcon" src="icons/edit.svg"/>
                </div>
                <div class="language">nl</div>
                <div class="previousLanguage" onclick="previousLanguage(this.parentElement)">
                    <img class="editIcon" src="icons/arrowLeft.svg"/>
                </div>
                <div class="nextLanguage" onclick="nextLanguage(this.parentElement)">
                    <img class="editIcon" src="icons/arrowRight.svg"/>
                </div>
            `;
                questionsFrame.appendChild(questionFrame);
            });
        })
        .catch(error => console.error(`Error getting questions: ${error}`));
}

/**
 * Adds a new, empty question frame to the "Questions" page.
 * @param {HTMLElement} questionsFrame - The main container to append the new question to.
 */
function buttonAddQuestion(questionsFrame) {
    let questionFrame = document.createElement('div');
    questionFrame.className = 'questionFrame';
    // The HTML for an empty questionFrame, ready to be edited
    questionFrame.innerHTML = `
    <div class="questionBorder"></div>
    <div class="questionLanguageBundle" contenteditable="false">
        <div onclick="showAnswers(this.parentElement)" class="question" placeholder="Question" style="display: none;"></div>
        <div onclick="showAnswers(this.parentElement)" class="question" placeholder="Vraag" style="display: block;"></div>
        <div onclick="showAnswers(this.parentElement)" class="question" placeholder="Question"style="display: none;"></div>
    </div>
    <div class="answers" toggleEnable="true" style="display: none;" language="nl">
        <div class="answerEN" style="display: none;">
            <input type="radio" name="correctAnswerSelectEn_new" id="correctAwnserA" disabled>
            <div class="answerA" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectEn_new" id="correctAwnserB" disabled>
            <div class="answerB" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectEn_new" id="correctAwnserC" disabled>
            <div class="answerC" contenteditable="false">&nbsp;</div>
        </div>
        <div class="answerNL" style="display: block;">
            <input type="radio" name="correctAnswerSelectNl_new" id="correctAwnserA" disabled>
            <div class="answerA" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectNl_new" id="correctAwnserB" disabled>
            <div class="answerB" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectNl_new" id="correctAwnserC" disabled>
            <div class="answerC" contenteditable="false">&nbsp;</div>
        </div>
        <div class="answerFR" style="display: none;">
            <input type="radio" name="correctAnswerSelectFr_new" id="correctAwnserA" disabled>
            <div class="answerA" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectFr_new" id="correctAwnserB" disabled>
            <div class="answerB" contenteditable="false">&nbsp;</div>
            <input type="radio" name="correctAnswerSelectFr_new" id="correctAwnserC" disabled>
            <div class="answerC" contenteditable="false">&nbsp;</div>
        </div>
    </div>
    <div class="editframe" onclick="enableEditing(this.parentElement)">
        <img class="editIcon" src="icons/edit.svg"/>
    </div>
    <div class="language">nl</div>
    <div class="previousLanguage" onclick="previousLanguage(this.parentElement)">
        <img class="editIcon" src="icons/arrowLeft.svg"/>
    </div>
    <div class="nextLanguage" onclick="nextLanguage(this.parentElement)">
        <img class="editIcon" src="icons/arrowRight.svg"/>
    </div>
`;
    questionsFrame.appendChild(questionFrame);
    // Automatically enable editing for the new question
    enableEditing(questionFrame);
}

/**
 * Toggles the visibility of the answer block for a question.
 * @param {HTMLElement} element - The question element that was clicked.
 */
function showAnswers(element) {
    // Only toggle if not in edit mode
    if (element.getAttribute("contenteditable") === "false") {
        let answerBlock = element.nextElementSibling;

        // Toggle visibility for the current question
        const isHidden = answerBlock.style.display === 'none';
        answerBlock.style.display = isHidden ? 'block' : 'none';

        // Hide all other answer blocks that are not being edited
        let allAnswers = document.querySelectorAll('.answers');
        allAnswers.forEach(function(otherAnswerBlock) {
            if (otherAnswerBlock !== answerBlock && otherAnswerBlock.getAttribute("toggleEnable") === "true") {
                otherAnswerBlock.style.display = 'none';
            }
        });
    } else {
        console.log("Cannot toggle answers while in edit mode.");
    }
}

/**
 * Enables the content-editable fields for a specific question.
 * @param {HTMLElement} questionFrame - The .questionFrame element to make editable.
 */
function enableEditing(questionFrame) {
    // Hide language navigation buttons
    let previousLanguage = questionFrame.querySelector('.previousLanguage');
    previousLanguage.style.display = "none";
    previousLanguage.nextElementSibling.style.display = "none";

    // Find the relevant question and answer elements for the current language
    let questionBundle = questionFrame.querySelector('.questionLanguageBundle');
    let answersBundle = questionFrame.querySelector(".answers");
    let language = answersBundle.getAttribute("language");
    let answers = questionFrame.querySelector((language === "en") ? ".answerEN" : ((language === "nl") ? ".answerNL" : ".answerFR"));
    let languageIndex = (language === "en") ? 0 : (language === "nl") ? 1 : 2;

    // Change the "Edit" button to a "Save" button
    let editFrame = questionFrame.querySelector('.editframe');
    editFrame.innerHTML = '<img class="editIcon" src="icons/save.svg">';
    editFrame.onclick = function() {
        saveChanges(this.parentElement);
    };

    // Disable the answer toggle and ensure the answer block is visible
    questionBundle.children[languageIndex].onclick = null;
    answersBundle.setAttribute("toggleEnable", false);
    if (answersBundle.style.display === 'none') {
        answersBundle.style.display = 'block'; // Force open
    }

    // Enable radio buttons for selecting the correct answer
    // Children 0, 2, 4 are radio buttons; 1, 3, 5 are answer text divs
    answers.children[0].removeAttribute("disabled");
    answers.children[2].removeAttribute("disabled");
    answers.children[4].removeAttribute("disabled");

    // Set contenteditable=true for the question and answer text fields
    questionBundle.contentEditable = 'true'; // The bundle itself
    answers.children[1].contentEditable = 'true';
    answers.children[3].contentEditable = 'true';
    answers.children[5].contentEditable = 'true';

    // Set focus to the question field for a better user experience
    questionBundle.children[languageIndex].focus();
}

/**
 * Saves the changes from an edited question to the database.
 * @param {HTMLElement} questionFrame - The .questionFrame being saved.
 */
function saveChanges(questionFrame) {
    // Get all necessary elements
    let questionBundle = questionFrame.querySelector('.questionLanguageBundle');
    let answersBundle = questionFrame.querySelector(".answers");
    let language = answersBundle.getAttribute("language");
    let answers = questionFrame.querySelector((language === "en") ? ".answerEN" : ((language === "nl") ? ".answerNL" : ".answerFR"));
    let languageIndex = (language === "en") ? 0 : (language === "nl") ? 1 : 2;

    // Determine the selected correct answer (0, 1, or 2)
    let correctAnswer = (answers.children[0].checked) ? 0 : (answers.children[2].checked) ? 1 : 2;

    // --- Validation ---
    // Children 1, 3, 5 are the answer text fields
    if (answers.children[1].textContent.trim() === "" ||
        answers.children[3].textContent.trim() === "" ||
        answers.children[5].textContent.trim() === "") {
        alert("Al de antwoorden dienen ingevuld te worden.");
        return;
    }

    if (questionBundle.children[languageIndex].textContent.trim() === "") {
        alert("De vraag dient ingevuld te worden.");
        return;
    }

    if (!answers.children[0].checked && !answers.children[2].checked && !answers.children[4].checked) {
        alert("Er dient een juist antwoord gekozen te worden met behulp van de radiobuttons.");
        return;
    }

    // --- Post-Validation UI Updates ---

    // Sync radio buttons across all languages
    // 2 * correctAnswer gives the index of the radio button (0, 2, or 4)
    for (let i = 0; i < 3; i++) { // 0=en, 1=nl, 2=fr
        answersBundle.children[i].children[2 * correctAnswer].checked = true;
    }

    // Disable radio buttons
    answers.children[0].setAttribute("disabled", "disabled");
    answers.children[2].setAttribute("disabled", "disabled");
    answers.children[4].setAttribute("disabled", "disabled");

    // Show language navigation buttons
    let previousLanguage = questionFrame.querySelector('.previousLanguage');
    previousLanguage.style.display = "flex";
    previousLanguage.nextElementSibling.style.display = "flex";

    // Disable content editing
    questionBundle.contentEditable = 'false';
    answers.children[1].contentEditable = 'false';
    answers.children[3].contentEditable = 'false';
    answers.children[5].contentEditable = 'false';

    // Change "Save" button back to "Edit"
    let editFrame = questionFrame.querySelector('.editframe');
    editFrame.innerHTML = '<img class="editIcon" src="icons/edit.svg">';
    editFrame.setAttribute("onclick", "enableEditing(this.parentElement);");

    // Re-enable answer toggling
    questionBundle.children[languageIndex].setAttribute("onclick", "showAnswers(this.parentElement)");
    answersBundle.setAttribute("toggleEnable", true);

    // --- Send data to server ---
    fetch("/cms/editQuestion", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Use parentElement's ID (which is the questionFrame)
                questionId: questionBundle.parentElement.getAttribute("id"),
                language: language,
                newQuestion: questionBundle.children[languageIndex].textContent.trim(),
                newAnswer1: answersBundle.children[languageIndex].children[1].textContent.trim(),
                newAnswer2: answersBundle.children[languageIndex].children[3].textContent.trim(),
                newAnswer3: answersBundle.children[languageIndex].children[5].textContent.trim(),
                correctAnswer: correctAnswer,
            })
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.error('Failed to save question');
                throw new Error('Failed to save question');
            }
        })
        .then(data => {
            if (data.newId) {
                // This was a new question; server returned the new _id
                console.log('New question created with Id:', data.newId);
                questionBundle.parentElement.setAttribute("id", data.newId);

                // For a new question, copy the content from the language just edited
                // to all other languages to prevent empty fields.
                const newQuestionText = questionBundle.children[languageIndex].textContent.trim();
                const newAnswer1Text = answersBundle.children[languageIndex].children[1].textContent.trim();
                const newAnswer2Text = answersBundle.children[languageIndex].children[3].textContent.trim();
                const newAnswer3Text = answersBundle.children[languageIndex].children[5].textContent.trim();

                for (let i = 0; i < 3; i++) {
                    questionBundle.children[i].textContent = newQuestionText;
                    answersBundle.children[i].children[1].textContent = newAnswer1Text;
                    answersBundle.children[i].children[3].textContent = newAnswer2Text;
                    answersBundle.children[i].children[5].textContent = newAnswer3Text;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Sets the visible language for a given question frame.
 * Hides all language-specific elements and shows only the one for the new language.
 * @param {HTMLElement} questionFrame - The .questionFrame element.
 * @param {string} newLanguage - The language to switch to ("en", "nl", or "fr").
 */
function setLanguage(questionFrame, newLanguage) {
    const languageMap = { 'en': 0, 'nl': 1, 'fr': 2 };
    const newIndex = languageMap[newLanguage];

    const answersBundle = questionFrame.querySelector(".answers");
    const questionBundle = questionFrame.querySelector(".questionLanguageBundle");
    const languageFrame = questionFrame.querySelector(".language");

    // Update attributes and text display
    answersBundle.setAttribute("language", newLanguage);
    languageFrame.textContent = newLanguage;

    // Loop through all 3 language child elements (en, nl, fr)
    for (let i = 0; i < 3; i++) {
        // Show/hide the correct answer block
        answersBundle.children[i].style.display = (i === newIndex) ? "block" : "none";
        // Show/hide the correct question text
        questionBundle.children[i].style.display = (i === newIndex) ? "block" : "none";
    }
}

/**
 * Switches the question to display the next language (en -> nl -> fr -> en).
 * @param {HTMLElement} questionFrame - The .questionFrame element.
 */
function nextLanguage(questionFrame) {
    const answers = questionFrame.querySelector(".answers");
    const currentLanguage = answers.getAttribute("language");
    const nextLang = (currentLanguage === "en") ? "nl" : ((currentLanguage === "nl") ? "fr" : "en");
    setLanguage(questionFrame, nextLang);
}

/**
 * Switches the question to display the previous language (en -> fr -> nl -> en).
 * @param {HTMLElement} questionFrame - The .questionFrame element.
 */
function previousLanguage(questionFrame) {
    const answers = questionFrame.querySelector(".answers");
    const currentLanguage = answers.getAttribute("language");
    const prevLang = (currentLanguage === "en") ? "fr" : ((currentLanguage === "nl") ? "en" : "nl");
    setLanguage(questionFrame, prevLang);
}
