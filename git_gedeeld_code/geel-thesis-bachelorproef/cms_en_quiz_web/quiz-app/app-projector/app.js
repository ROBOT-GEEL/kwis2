const socket = io(`ws://${window.location.hostname}`);

socket.on('connect', () => {
    console.log('Connected to socket.io server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from socket.io server');
});

socket.on('projector-update-question', (data) => {
    document.querySelector('main').classList.remove('hidden');
    document.querySelector('#question').innerHTML = data.question;
    document.querySelectorAll('.answer-text').forEach((element, index) => {
        element.innerHTML = data.answers[index];
    });

    textFit(document.querySelector('#question'),
        {
            multiLine: true,
            reProcess: true,
            alignHoriz: true,
            alignVert: true
        }
    );

    textFit(document.querySelectorAll('.answer-text'),
        {
            multiLine: true,
            reProcess: true,
            alignHoriz: true,
            alignVert: true
        }
    );
});

socket.on('projector-start-countdown', (data) => {
    const startTimestamp = data.startTimestamp;
    const offset = Date.now() - startTimestamp;
    const answerTime = data.answerTime;
    let remainingTime = answerTime - (Date.now() - startTimestamp) / 1000;

    document.querySelector('#timer span').textContent = `${Math.ceil(remainingTime)}s`;
    document.querySelector('#timer progress').setAttribute('value', Math.floor(remainingTime * 100 / answerTime));

    setTimeout(() => {
        remainingTime = answerTime - (Date.now() - startTimestamp) / 1000;
        document.querySelector('#timer span').textContent = `${Math.ceil(remainingTime)}s`;
        document.querySelector('#timer progress').setAttribute('value', Math.floor(remainingTime * 100 / answerTime));
        const interval = setInterval(() => {
            remainingTime = answerTime - (Date.now() - startTimestamp) / 1000;
            document.querySelector('#timer span').textContent = `${Math.ceil(remainingTime)}s`;
            document.querySelector('#timer progress').setAttribute('value', Math.floor(remainingTime * 100 / answerTime));
            if (remainingTime <= 0) {
                clearInterval(interval);
            }
        }, 1000);
    }, 1000 - (offset % 1000));
});

socket.on('projector-display-answers', (data) => {
    document.querySelector(`#answer-${data.answer}`).classList.add('correct-answer');
    // Add wrong-answer class to all other answers
    document.querySelectorAll(`.answer:not(#answer-${data.answer})`).forEach(e => e.classList.add('wrong-answer'));
});

socket.on('projector-clear-answers', () => {
    document.querySelectorAll('.answer').forEach(e => e.classList.remove('correct-answer', 'wrong-answer'));
});

socket.on('projector-reset', () => {
    document.querySelector('main').classList.add('hidden');
    document.querySelectorAll('.answer').forEach(e => e.classList.remove('correct-answer', 'wrong-answer'));
    document.querySelector('#question').innerHTML = '';
    document.querySelectorAll('.answer-text').forEach(e => e.innerHTML = '');
    document.querySelector('#timer span').textContent = '';
});