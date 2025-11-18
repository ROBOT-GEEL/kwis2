/**
 * Script for handling global Socket.IO events.
 * Depends on:
 * - app.js (socket)
 * - utils.js (changeScreen)
 * - quiz.js (Quiz)
 */

socket.on('robot-explore', () => {
    changeScreen('robot-explore-screen');

    const interval = setInterval(() => {
        if (document.querySelector('#robot-explore-screen').style.display === 'none') {
            clearInterval(interval);
            return;
        }
        let selectedLanguageIndex = 0;
        document.querySelectorAll('.language-selector').forEach((el, index) => {
            if (el.classList.contains('selected-language')) {
                selectedLanguageIndex = index;
            }
        });
        document.querySelectorAll('.language-selector')[(selectedLanguageIndex + 1) % 3].click();
    }, 2100);
});

socket.on('robot-go-to-visitors', () => {
    changeScreen('robot-go-to-visitors-screen');

    const interval = setInterval(() => {
        if (document.querySelector('#robot-go-to-visitors-screen').style.display === 'none') {
            clearInterval(interval);
            return;
        }
        let selectedLanguageIndex = 0;
        document.querySelectorAll('.language-selector').forEach((el, index) => {
            if (el.classList.contains('selected-language')) {
                selectedLanguageIndex = index;
            }
        });
        document.querySelectorAll('.language-selector')[(selectedLanguageIndex + 1) % 3].click();
    }, 2100);
});

socket.on('robot-arrived-at-visitors', () => {
    document.querySelector('#NL-selector').click();
    changeScreen('start-screen');


    if (Quiz.timeToStartQuiz > 0) {
        console.log('Waiting for quiz to start...');
        setTimeout(() => {
            console.log(`Quiz inactive: ${document.querySelector('#start-screen').style.display === 'block'}`);
            if (document.querySelector('#start-screen').style.display === 'block') {
                socket.emit('quiz-inactive');
            }
        }, Quiz.timeToStartQuiz * 1000);
    }
});

socket.on('robot-arrived-at-quiz-location', () => {
    console.log('Robot has arrived at the quiz location!');
    Quiz.start();
});
