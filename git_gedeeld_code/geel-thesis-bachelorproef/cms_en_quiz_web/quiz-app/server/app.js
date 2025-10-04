const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const winston = require('winston');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process');

const path = require("path");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");

// open livereload high port and start to watch public directory for changes
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, '..', 'app'));

// ping browser on Express boot, once browser has reconnected and handshaken
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
});


const app = express();
app.use(cors());

// // Serve static files (the frontend)
// monkey patch every served HTML so they know of changes
app.use(connectLivereload());
// Static files for quiz and projector
app.use(express.static(path.join(__dirname, '..', "app")));
app.use(express.static(path.join(__dirname, '..', "app-projector")));
// DEMO FILES
app.use(express.static(path.join(__dirname, '..', 'demo')));
app.use(express.json());

// Setup logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Log to console in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const client = new MongoClient(process.env.ATLAS_URI);//ATLAS_URI
client.connect((err) => {
    if (err) {
        logger.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
    logger.info('Connected to MongoDB');
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'app', 'index.html'));
});

// Serve the projector frontend
app.get('/projector', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'app-projector', 'index.html'));
});

// DEMO
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'demo', 'index.html'))
})

// POST endpoint to log errors
app.post('/log-error', (req, res) => {
    const errorData = req.body.error;
    logger.error(errorData);
    res.sendStatus(200);
});

// Send error logs
app.get('/error-log', (req, res) => {
    res.sendFile(path.join(__dirname, 'error.log'));
});

// Send the language file to the frontend
app.get('/language', (req, res) => {
    res.sendFile(path.join(__dirname, 'languages.json'));
});

// Get questions from the database for the quiz
app.post('/quiz/questions', async (req, res) => {
    const visited = req.body.visited;
    const amount = req.body.amount;

    try {
        const db = client.db("LocalRPIdb");///////////////////////////tabloo//LocalRPIdb
        const collection = db.collection("questions");

        // Get (amount) random questions from the database
        // which are enabled and have the correct visited value
        const documents = await collection.aggregate([
            {
                $match: {
                    bezocht: visited,
                    enabled: true
                }
            },
            {
                $sample: {
                    size: amount
                }
            }
        ]).toArray();
        res.status(200).json(documents);
    } catch (e) {
        logger.error(e);
        res.sendStatus(500);
    }
});

// Get the id for the next quiz
app.get('/quiz/new-id', async (req, res) => {
    try {
        const db = client.db("LocalRPIdb");//////////////////////////////////////////
        const collection = db.collection("results");

        // Get the highest quiz id from the results collection and increment it
        const maxQuizId = await collection.find().sort({ quizId: -1 }).limit(1).next();
        res.status(200).json({ quizId: maxQuizId.quizId + 1 });
    } catch (e) {
        logger.error(e);
        res.status(500).send('Error retrieving quiz id');
    }
});

// Get the quiz parameters from the database
app.get('/quiz/parameters', async (req, res) => {
    try {
        const db = client.db("LocalRPIdb");/////////////////////////////////////////////////////////////////
        const collection = db.collection("params");

        const parameters = await collection.findOne({});
        res.status(200).json(parameters);
    } catch (e) {
        logger.error(e);
        res.status(500).send('Error retrieving quiz parameters');
    }
});

// Get the quiz instructions from the json file
app.get('/quiz/instructions', (req, res) => {
    res.sendFile(path.join(__dirname, 'instructions.json'));
});

// Get the time to start the quiz before the start screen goes away
app.get('/quiz/time-to-start', async (req, res) => {
    try {
        const db = client.db("LocalRPIdb");///////////////////////////////////////////////////////////////////////
        const collection = db.collection("params");

        const parameters = await collection.findOne({});
        res.status(200).json({ time: parameters.timeToStartQuiz });
    } catch (e) {
        logger.error(e);
        res.status(500).send('Error retrieving time to start');
    }
});


const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});

// Socket.IO server
io.on('connection', (socket) => {
    logger.info('New client connected with socket id:', socket.id);

    // Send question data to the projector
    socket.on('projector-update-question', (data) => {
        logger.info('update-question', data);
        socket.broadcast.emit('projector-update-question', data);
    });

    // Notify the projector to start the countdown
    socket.on('projector-start-countdown', (data) => {
        socket.broadcast.emit('projector-start-countdown', data);
    });

    // Send the correct answer to the projector
    socket.on('projector-display-answers', (data) => {
        socket.broadcast.emit('projector-display-answers', data);
    });

    // Reset the quiz on the projector
    socket.on('projector-reset', () => {
        socket.broadcast.emit('projector-reset');
    });

    // Clear the answers on the projector
    socket.on('projector-clear-answers', () => {
        socket.broadcast.emit('projector-clear-answers');
    });

    socket.on('disconnect', () => {
        logger.info('a user disconnected');
    });

    // Notify the Pi to count people in the answer zones
    socket.on('pi-count-people', (msg) => {
        logger.info('pi-count-people', msg);
        socket.broadcast.emit('count_people_event', msg);
    });


    //zou op eigen ding moeten reageren
///////////////////////////////////////////////////////////////////////////////////////
    socket.on('testinputvalue', ()=>{
        logger.info("Robot platform is exploring");
        socket.broadcast.emit('robot-explore');
    });
        socket.on('quiz-finished', () => {
        logger.info("Quiz is finished");
        socket.broadcast.emit('quiz_finished');

    });
    // Sent from quiz interface if there is no interaction with the start screen
    socket.on('quiz-inactive', () => {
        logger.info("Quiz is inactive");
        socket.broadcast.emit('quiz_inactive');

    });



    ////////////////////////////////////////////////////////////////////



    // Receive the answer from the Pi and save it to the database
    // and broadcast it to the frontend
    socket.on('count_people_answer', (msg) => {
        logger.info('count_people_answer', msg);
        // Save to database
        try {
            const db = client.db("LocalRPIdb");/////////////////////////////////////////////////////
            const collection = db.collection("results");

            // Add timestamp in UTC to msg as a Date object
            msg.timestamp = new Date();
            collection.insertOne(msg);

            socket.broadcast.emit('pi-count-people-answer', msg);
        } catch (e) {
            logger.error(e);
        }
    });

    // 
    // Events related to communication with robot platform
    //
    // Received when robot platform is exploring
    socket.on('robot-explore', () => {
        logger.info("Robot platform is exploring");
        socket.broadcast.emit('robot-explore');
    });
    // Received when robot platform is going to visitors
    socket.on('robot-go-to-visitors', () => {
        logger.info("Robot platform is going to visitors");
        socket.broadcast.emit('robot-go-to-visitors');
    });
    // Received when robot platform has arrived at visitors
    socket.on('robot-arrived-at-visitors', () => {
        logger.info("Robot platform has arrived at visitors");
        socket.broadcast.emit('robot-arrived-at-visitors');
    });
    // Sent from quiz interface when the quiz is finished
    socket.on('quiz-finished', () => {
        logger.info("Quiz is finished");
        socket.broadcast.emit('quiz-finished');

    });
    // Sent from quiz interface if there is no interaction with the start screen
    socket.on('quiz-inactive', () => {
        logger.info("Quiz is inactive");
        socket.broadcast.emit('quiz-inactive');

    });
    // Sent from quiz interface to robot platform to drive to the quiz location
    socket.on('drive-to-quiz-location', () => {
        logger.info("Robot platform should drive to the quiz location");
        socket.broadcast.emit('drive-to-quiz-location');
        socket.broadcast.emit('drive_to_quiz_location');//for python socket
    });
    // Received when robot platform has arrived at the quiz location
    socket.on('robot-arrived-at-quiz-location', () => {
        logger.info("Robot platform has arrived at the quiz location");
        socket.broadcast.emit('robot-arrived-at-quiz-location');
    });
    // Battery percentage of the robot platform
    socket.on('robot-battery', (data) => {
        logger.info("Battery percentage:", data);
        socket.broadcast.emit('robot-battery', data);
    });
    

    //
    // Events related to communication with people detection system
    //
    // Received when there are people detected
    socket.on('system-people-detected', () => {
        logger.info("People detected");
        socket.broadcast.emit('system-people-detected');
    });
    // Received when the visitors are leaving the robot platform
    // so the robot platform can continue exploring and the quiz should not start
    socket.on('system-visitors-left-platform', () => {
        logger.info("Visitors left the platform");
        socket.broadcast.emit('system-visitors-left-platform');
    });

    // Turn touchscreen display on or off
    socket.on('set-display', (data) => {
        logger.info(`Turning display ${data ? 'on' : 'off'}`);

        // if (data) {
        //     exec(`sh ${path.join(__dirname, 'display_on.sh')}`, (error, stdout, stderr) => {
        //         if (error) {
        //             logger.error(`Error turning display on: `, error);
        //             return;
        //         }
        //         if (stderr) {
        //             logger.error(`Error turning display on: `, stderr);
        //             return;
        //         }
        //         logger.info('Display turned on: ', stdout);
        //     });
        // } else {
        //     exec(`sh ${path.join(__dirname, 'display_off.sh')}`, (error, stdout, stderr) => {
        //         if (error) {
        //             logger.error(`Error turning display off: `, error);
        //             return;
        //         }
        //         if (stderr) {
        //             logger.error(`Error turning display off: `, stderr);
        //             return;
        //         }
        //         logger.info('Display turned off: ', stdout);
        //     });
        // }
    });

});

// Start the server
http.listen(80, () => {
    logger.info('Server is listening on port 80');
});

// Close the MongoDB connection when the server is stopped
process.on('SIGINT', () => {
    logger.info('Closing MongoDB connection');
    client.close();
    process.exit(0);
});
