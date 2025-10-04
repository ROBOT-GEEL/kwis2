/************************************** Questions page *************************************/

// This function togles the awswers between visible and invisible
function showAnswers(element) {
    if (element.getAttribute("contenteditable") === "false") {
        let question = element.nextElementSibling;        
        // Toggle on answers
        if (question.style.display === 'none') {
            question.style.display = 'block';
        } else {
            question.style.display = 'none';
        }

        // Toggle off all other questions exept the ones being edited
        let allAnswers = document.querySelectorAll('.answers');
        allAnswers.forEach(function (answersnN) {
            if (answersnN !== question) {
                if(answersnN.getAttribute("toggleEnable") === "true")
                    answersnN.style.display = 'none';
            }
        });
    }
    else{
        console.log("error while togeling question");
    }
}

// This function enables the editing of the clicked question
function enableEditing(questionFrame) {
    // Disable the next and previous answer buttons
    let previousLanguage = questionFrame.querySelector('.previousLanguage');
    previousLanguage.style.display = "none";
    previousLanguage.nextElementSibling.style.display = "none";
    // Find the corresponding question and answers within the same questionFrame for the correct language
    let question = questionFrame.querySelector('.questionLanguageBundle');
    let language = questionFrame.querySelector(".answers").getAttribute("language");
    let answers = questionFrame.querySelector((language === "en") ? ".answerEN" : ((language === "nl") ? ".answerNL" : ".answerFR"));
    let langueageIndex = (language === "en") ? 0 : (language === "nl") ? 1 : 2;

    // Change the edit button to a save button
    let editFrame = questionFrame.querySelector('.editframe');
    editFrame.innerHTML = '<img class="editIcon" src="icons/save.svg">';
    editFrame.onclick = function() {
        saveChanges(this.parentElement);
    };


    // Disable the answer togle and open the question if it's not already open
    question.children[langueageIndex].onclick = null;
    question.nextElementSibling.setAttribute("toggleEnable", false);
    if (question.nextElementSibling.style.display === 'none') {
        showAnswers(question);
    }

    // Enable the radio buttons to select the correct answer (children 1,3,5 are the answers)
    answers.children[0].removeAttribute("disabled");
    answers.children[2].removeAttribute("disabled");
    answers.children[4].removeAttribute("disabled");

    // Set contenteditable attribute to true for the question and answers (children 0,2,4 are the radio buttons)
    question.contentEditable = 'true';
    answers.children[1].contentEditable = 'true';
    answers.children[3].contentEditable = 'true';
    answers.children[5].contentEditable = 'true';
}

// This function saves the edited question to the database
function saveChanges(questionFrame) {

    // Find the corresponding question and answers within the same questionFrame
    let question = questionFrame.querySelector('.questionLanguageBundle');
    let language = questionFrame.querySelector(".answers").getAttribute("language");
    let answers = questionFrame.querySelector((language === "en") ? ".answerEN" : ((language === "nl") ? ".answerNL" : ".answerFR"));
    let answersbundle = questionFrame.querySelector(".answers");
    let langueageIndex = (language === "en") ? 0 : (language === "nl") ? 1 : 2;
    // Children 0, 2 and 4 are the radio buttons the others are the answers
    correctAnswer = (answers.children[0].checked) ? 0 : (answers.children[2].checked) ? 1 : 2;

    // Check if all the awnsers are filled in (children 0,2,4 are the radio buttons)
    if(answersbundle.children[langueageIndex].children[1].textContent === "" |
            answersbundle.children[langueageIndex].children[3].textContent === "" |
            answersbundle.children[langueageIndex].children[5].textContent === ""){
        alert("Al de antwoorden dienen ingevuld te worden.");
        return;
    }

    // Check if the question is filled in
    if(question.children[langueageIndex].textContent === ""){
        alert("De vraag dient ingevuld te worden.");
        return;
    }

    // Check if a correct answer is selected
    if(answersbundle.children[langueageIndex].children[0].checked === false &
            answersbundle.children[langueageIndex].children[2].checked === false &
            answersbundle.children[langueageIndex].children[4].checked === false){
        alert("Er dient een juist antwoord gekozen te worden met behulp van de radiobuttons.");
        return;
    }

    // Keep the radio buttons for the other languages synchronized
    answersbundle.children[0].children[2 * correctAnswer].checked = true;
    answersbundle.children[1].children[2 * correctAnswer].checked = true;
    answersbundle.children[2].children[2 * correctAnswer].checked = true;

    // Disable the radio buttons to select the correct answer (children 1,3,5 are the answers)
    answers.children[0].setAttribute("disabled", "disabled");
    answers.children[2].setAttribute("disabled", "disabled");
    answers.children[4].setAttribute("disabled", "disabled");

    // Enable the next and previous answer buttons
    let previousLanguage = questionFrame.querySelector('.previousLanguage');
    previousLanguage.style.display = "flex";
    previousLanguage.nextElementSibling.style.display = "flex";

    // Set contenteditable attribute to false for the question and answers (children 0,2,4 are the radio buttons)
    question.contentEditable = 'false';
    answers.children[1].contentEditable = 'false';
    answers.children[3].contentEditable = 'false';
    answers.children[5].contentEditable = 'false';

    // Change the save button to an edit button
    questionFrame.querySelector('.editframe').innerHTML = '<img class="editIcon" src="icons/edit.svg">';
    questionFrame.querySelector('.editframe').setAttribute( "onclick", "enableEditing(this.parentElement);" );

    // Enable the answer togle
    question.children[langueageIndex].setAttribute("onclick", "showAnswers(this.parentElement)");
    question.nextElementSibling.setAttribute("toggleEnable", true);

    // Send the question to the server 
    fetch("/cms/editQuestion", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            questionId:    question.parentElement.getAttribute("id"),
            language:      language,
            newQuestion:   question.children[langueageIndex].textContent,
            // children 0,2,4 are the radio buttons
            newAnswer1:    answersbundle.children[langueageIndex].children[1].textContent.trim(),
            newAnswer2:    answersbundle.children[langueageIndex].children[3].textContent.trim(),
            newAnswer3:    answersbundle.children[langueageIndex].children[5].textContent.trim(),
            correctAnswer: correctAnswer,
        })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            console.error('Failed to add question');
            throw new Error('Failed to add question');
        }
    })
    .then(data => {
        // Log the newId if the question was a new one
        if (data.newId) {
            console.log('New question created with Id:', data.newId);
            question.parentElement.setAttribute("id", data.newId);
            // If the question is a new question make all the content the same in all the differen languages
            question.children[0].textContent = question.children[langueageIndex].textContent;
            question.children[1].textContent = question.children[langueageIndex].textContent;
            question.children[2].textContent = question.children[langueageIndex].textContent;
            answersbundle.children[0].children[1].textContent = answersbundle.children[langueageIndex].children[1].textContent.trim();
            answersbundle.children[0].children[3].textContent = answersbundle.children[langueageIndex].children[3].textContent.trim();
            answersbundle.children[0].children[5].textContent = answersbundle.children[langueageIndex].children[5].textContent.trim();
            answersbundle.children[1].children[1].textContent = answersbundle.children[langueageIndex].children[1].textContent.trim();
            answersbundle.children[1].children[3].textContent = answersbundle.children[langueageIndex].children[3].textContent.trim();
            answersbundle.children[1].children[5].textContent = answersbundle.children[langueageIndex].children[5].textContent.trim();
            answersbundle.children[2].children[1].textContent = answersbundle.children[langueageIndex].children[1].textContent.trim();
            answersbundle.children[2].children[3].textContent = answersbundle.children[langueageIndex].children[3].textContent.trim();
            answersbundle.children[2].children[5].textContent = answersbundle.children[langueageIndex].children[5].textContent.trim();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// This function adds an emty question
function buttonAddQuestion(questionsFrame){
    let questionFrame = document.createElement('div');
    questionFrame.className = 'questionFrame';

    // The HTML code of an empty questionFrame
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

    // Append the questionFrame to the questionsFrame
    questionsFrame.appendChild(questionFrame);
}

// Displays all the questions inside the data base
function displayQuestions() {
    // Change title
    document.getElementById("title").innerHTML = "Vragen";
    // Change back ground titles
    document.getElementById("questionsButtonFrame").style.background = "rgb(144 213 218)";
    document.getElementById("enabledFrame").style.background = "#80c8cc";
    document.getElementById("visitedFrame").style.background = "#80c8cc";
    document.getElementById("settingsFrame").style.background = "#80c8cc";

    // Replace buttons with addQuestionButton
    let allbuttons = document.querySelectorAll('.buttonAddQuestion');
    allbuttons.forEach(function (allbuttonsN) {
        allbuttonsN.style.display = 'none';
    });
    document.getElementById("buttonAddQuestion").style.display = "block";

    // Load questions out of the database
    fetch('/cms/getQuestions')
    .then(response => response.json())
    .then(questions  => {
        // Update the UI with the retrieved questions
        const questionsFrame = document.getElementById('questionsFrame');
        questionsFrame.innerHTML = ''; // Clear existing content

        questions.forEach(question => {
            if (!question.enabled){
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
            // Append the questionFrame to the questionsFrame
            questionsFrame.appendChild(questionFrame);
        });
    })
    .catch(error => console.error("Error getting questions: ${error}"));
}


function nextLanguage(questionFrame) {
    // Get the answers element from where this function got called and the current language
    answers = questionFrame.getElementsByClassName("answers")[0];
    language = answers.getAttribute("language");
    languageFrame = questionFrame.getElementsByClassName("language")[0];
    // Change the language atribute to the next language in the cycle
    answers.setAttribute("language", (language === "en") ? "nl" : ((language === "nl") ? "fr" : "en"));
    languageFrame.textContent = (language === "en") ? "nl" : ((language === "nl") ? "fr" : "en");
    // Change the visible answers to the ones in the selected language
    // Caution, the language needs to be te next language, not the current
    answers.children[1].style.display = (language === "en") ? "block" : "none";
    answers.children[2].style.display = (language === "nl") ? "block" : "none";
    answers.children[0].style.display = (language === "fr") ? "block" : "none";
    // Change the question to the coresponding language
    question = questionFrame.getElementsByClassName("questionLanguageBundle")[0];
    question.children[1].style.display = (language === "en") ? "block" : "none";
    question.children[2].style.display = (language === "nl") ? "block" : "none";
    question.children[0].style.display = (language === "fr") ? "block" : "none";
}

function previousLanguage(questionFrame) {
    // Get the answers element from where this function got called and the current language
    answers = questionFrame.getElementsByClassName("answers")[0];
    language = answers.getAttribute("language");
    languageFrame = questionFrame.getElementsByClassName("language")[0];
    // Change the language atribute to the previous language in the cycle
    answers.setAttribute("language", (language === "en") ? "fr" : ((language === "nl") ? "en" : "nl"));
    languageFrame.textContent = (language === "en") ? "fr" : ((language === "nl") ? "en" : "nl");
    // Change the visible answers to the ones in the selected language
    answers.children[2].style.display = (language === "en") ? "block" : "none";
    answers.children[0].style.display = (language === "nl") ? "block" : "none";
    answers.children[1].style.display = (language === "fr") ? "block" : "none";
    // Change the question to the coresponding language
    question = questionFrame.getElementsByClassName("questionLanguageBundle")[0];
    question.children[2].style.display = (language === "en") ? "block" : "none";
    question.children[0].style.display = (language === "nl") ? "block" : "none";
    question.children[1].style.display = (language === "fr") ? "block" : "none";
}


/************************************** Enable page *************************************/


function buttonEnable() {
    fetch('/cms/getQuestions')
    .then(response => response.json())
    .then(questions  => {
        // Update the UI with the retrieved questions
        const questionsFrame = document.getElementById('questionsFrame');
        questionsFrame.innerHTML = ''; // Clear existing content

        // Separate enabled and disabled questions to show all enabled question first
        let enabledQuestions = questions.filter(question => question.enabled);
        let disabledQuestions = questions.filter(question => !question.enabled);

        // Concatenate enabled and disabled questions
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
            // Append the questionFrame to the questionsFrame

            questionsFrame.appendChild(questionFrame);
        });
        // Replace buttons with buttonEnableSave and buttonEnable
        let allbuttons = document.querySelectorAll('.buttonAddQuestion');
        allbuttons.forEach(function (allbuttonsN) {
            allbuttonsN.style.display = 'none';
        });
        document.getElementById("buttonEnableSave").style.display = "block";
        document.getElementById("buttonEnable").style.display = "block";
        // Change title
        document.getElementById("title").innerHTML = "Actief";
        // Change back ground titles
        document.getElementById("questionsButtonFrame").style.background = "#80c8cc";
        document.getElementById("enabledFrame").style.background = "rgb(144 213 218)";
        document.getElementById("visitedFrame").style.background = "#80c8cc";
        document.getElementById("settingsFrame").style.background = "#80c8cc";

        // Call the function to initialize listeners when the page loads
        initializeEnabledChangeListeners();  
    })
    .catch(error => console.error("Error getting questions: ${error}"));
}



// Save the current enable status of all the questions to the database
async function buttonEnableSave(){
    document.getElementById("buttonEnableSave").textContent = "Opslaan...";
    const enableSwitches = document.querySelectorAll('.enableSwitch');
    const questionDict = {};
    // collect the visual enable status of each question and save it to a dictionary
    enableSwitches.forEach(enableSwitch => {
        const questionId = enableSwitch.parentElement.id;
        questionDict[questionId] = {
            enableSwitch: enableSwitch.firstElementChild.checked,
        };
    });
    // send the enable dictionary to the server to update the database
    const response = await fetch('/cms/saveEnabledCheckBoxes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            questionDict
        })
    });
    if (response.ok) {
        console.log("enabled flags saved successfully");
        // Give a visual indicator that the document is saved sucsesfuly
        document.getElementById("buttonEnableSave").textContent = "Opgeslagen";
        return response.json();
    } else {
        console.error('Failed to save enabled flags');
        throw new Error('Failed to save enabled flags');
    }
}


/************************************** Visited page *************************************/


function buttonVisited() {
    fetch('/cms/getQuestions')
    .then(response => response.json())
    .then(questions  => {
        // Update the UI with the retrieved questions
        const questionsFrame = document.getElementById('questionsFrame');
        questionsFrame.innerHTML = ''; // Clear existing content

        // Separate visited and not visited questions to show all visited question first
        let visitedQuestions = questions.filter(question => question.bezocht);
        let notVisitedQuestions = questions.filter(question => !question.bezocht);

        // Concatenate visited and not visited questions
        let sortedQuestions = visitedQuestions.concat(notVisitedQuestions);

        sortedQuestions.forEach(question => {
            if (!question.enabled){
                return;
            }
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
            // Append the questionFrame to the questionsFrame
            questionsFrame.appendChild(questionFrame);
        });
        
        // Replace buttons with buttonVisitedSave and buttonVisited
        let allbuttons = document.querySelectorAll('.buttonAddQuestion');
        allbuttons.forEach(function (allbuttonsN) {
            allbuttonsN.style.display = 'none';
        });
        document.getElementById("buttonVisitedSave").style.display = "block";
        document.getElementById("buttonVisited").style.display = "block";

        // Change title
        document.getElementById("title").innerHTML = "Bezocht";

        // Change back ground titles
        document.getElementById("questionsButtonFrame").style.background = "#80c8cc";
        document.getElementById("enabledFrame").style.background = "#80c8cc";
        document.getElementById("visitedFrame").style.background = "rgb(144 213 218)";
        document.getElementById("settingsFrame").style.background = "#80c8cc";
        
        // Call the function to initialize listeners when the page loads
        // Call the function to initialize listeners when the page loads
        initializeVisitersChangeListeners();  
    })
    .catch(error => console.error("Error getting questions: ${error}"));
}


// Save the current enable status of all the questions to the database
async function buttonVisitedSave(){
    document.getElementById("buttonVisitedSave").textContent = "Opslaan...";
    const visitedSwitches = document.querySelectorAll('.enableSwitch');
    const questionDict = {};
    // collect the visual enable status of each question and save it to a dictionary
    visitedSwitches.forEach(visitedSwitch => {
        const questionId = visitedSwitch.parentElement.id
        questionDict[questionId] = {
            visitedSwitch: visitedSwitch.firstElementChild.checked,
        };
    });
    // send the enable dictionary to the server to update the database
    const response = await fetch('/cms/saveVisitedCheckBoxes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            questionDict
        })
    });
    if (response.ok) {
        console.log("Settings saved successfully");
        // Give a visual indicator that the document is saved sucsesfuly
        document.getElementById("buttonVisitedSave").textContent = "Opgeslagen";
        return response.json();
    } else {
        console.error('Failed to save visited flags');
        throw new Error('Failed to save visited flags');
    }
}


/************************************** Other Code *************************************/
// Function to change button text to "Save" when any flag changes
function initializeVisitersChangeListeners() {
    const inputElements = document.querySelectorAll('input[type="checkbox"]');
    inputElements.forEach(input => {
        input.addEventListener('change', () => {
            console.log("change detected")
            document.getElementById("buttonVisitedSave").textContent = "Opslaan";
        });
    });
}
// Function to change button text to "Save" when any flag changes
function initializeEnabledChangeListeners() {
    const inputElements = document.querySelectorAll('input[type="checkbox"]');
    inputElements.forEach(input => {
        input.addEventListener('change', () => {
            console.log("change detected")
            document.getElementById("buttonEnableSave").textContent = "Opslaan";
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

displayQuestions();