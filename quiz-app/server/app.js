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

// Use database name as constant by using ATLAS_DBNAME in .env or else default to just using "LocalRPIdb"
const DB_NAME = process.env.ATLAS_DBNAME || "LocalRPIdb"

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

///////////////////////manual ding
app.use(express.static(path.join(__dirname, '..', "navigatie_page")));


//////////////////////////voorcms etcetera
app.use('/grafieken', express.static(path.join(__dirname, '..', 'Grafieken')));////////////////kleine g
app.use('/cms', express.static(path.join(__dirname, '..', 'Cms')));
app.use('/settings', express.static(path.join(__dirname, '..', 'Settings')));

app.use('/manual', express.static(path.join(__dirname, '..', 'navigatie_page')));


//////////////////////////////:




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


// manual driving//////////////////////////////
app.get('/manual-driving', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'navigatie_page', 'index.html'))
})

//////////////////////////////

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
        const db = client.db(DB_NAME);///////////////////////////tabloo//LocalRPIdb
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
        const db = client.db(DB_NAME);//////////////////////////////////////////
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
        const db = client.db(DB_NAME);/////////////////////////////////////////////////////////////////
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
        const db = client.db(DB_NAME);///////////////////////////////////////////////////////////////////////
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
    socket.on('drive-forward', () => {
        logger.info("manual control drive forward");
        socket.broadcast.emit('drive_forward');

    });
    socket.on('drive-left', () => {
        logger.info("manual control drive left");
        socket.broadcast.emit('drive_left');

    });
    socket.on('drive-right', () => {
        logger.info("manual control drive right");
        socket.broadcast.emit('drive_right');

    });
    socket.on('drive-backward', () => {
        logger.info("manual control drive backward");
        socket.broadcast.emit('drive_backward');

    });
    socket.on('drive-stop', () => {
        logger.info("manual control driving has stoped");
        socket.broadcast.emit('drive_stop');

    });
    



   



    // Receive the answer from the Pi and save it to the database
    // and broadcast it to the frontend
    socket.on('count_people_answer', (msg) => {
        logger.info('count_people_answer', msg);
        // Save to database
        try {
            const db = client.db(DB_NAME);/////////////////////////////////////////////////////
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



////////////////////////cms ding hier ingestoken
const { ObjectId } = require('mongodb');
const bodyParser = require('body-parser');


const net = require('net');
const crypto = require('crypto');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());




// mongodb information
//const client = new MongoClient(process.env.ATLAS_URI);
const dbName = process.env.ATLAS_DBNAME;


async function main() {
  // Use connect method to connect to the MongoDB server
  await client.connect();
  console.log('Connected successfully to server');
  global.db = client.db(dbName);
  
  return 'done.';
}

/************************************** grafieken *************************************/


// ------------------Get result data from the database (pie charts)-------------------------------
app.post('/grafieken/get-results', async (req, res) => {
  console.log('Grafieken requested quiz results.');
  // Get the enable and bezocht parameters from the request body (frontend url parameters)
  const enable = req.body.config.enable;
  const bezocht = req.body.config.bezocht;

  try {

    // Define the aggregation pipeline for pie data
    const pipeline = [
      {
        $lookup: {
          from: "questions",
          localField: "questionId",
          foreignField: "questionId",
          as: "questionsData",
        },
      },
      {
        $unwind: "$questionsData",
      },
      {$match: {}}, // filter is modified in next step
      {
        $addFields: {
          nl: "$questionsData.nl",
          correctAnswer:
            "$questionsData.correctAnswer",
        },
      },
      {
        $unset: "questionsData",
      },
      {
        $group: {
          _id: "$questionId",
          totalA: {
            $sum: {
              $arrayElemAt: ["$results", 0],
            },
          },
          totalB: {
            $sum: {
              $arrayElemAt: ["$results", 1],
            },
          },
          totalC: {
            $sum: {
              $arrayElemAt: ["$results", 2],
            },
          },
          nl: {
            $first: "$nl",
          },
          correctAnswer: {
            $first: "$correctAnswer",
          },
        },
      },
      {
        $project: {
          sumResults: [
            "$totalA",
            "$totalB",
            "$totalC",
          ],
          nl: 1,
          correctAnswer: 1,
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    // Add a filter to the aggregation pipeline
    // parameters ar null if no filter is required
    if(enable !== null && bezocht !== null){
      pipeline[2].$match = {$and: [{"questionsData.enabled": enable}, {"questionsData.bezocht": bezocht}]};
    }
    else if(enable !== null){
      pipeline[2].$match = {"questionsData.enabled": enable};
    }else if(bezocht !== null){
      pipeline[2].$match = {"questionsData.bezocht": bezocht};
    }    
    
    // select db collection
    const collection_results = global.db.collection('results');

    // execute the aggregation pipeline for quiz results
    const quizAnswersResult = await collection_results.aggregate(pipeline).toArray();
    console.log('Grafieken requested quiz results, got =>', quizAnswersResult.length);

    res.json(quizAnswersResult); // send the results back to the frontend
  
    
  } catch (e) {
      console.error(e);
      res.status(500).send('Error retrieving results from the database.');
  }
});



// ---------------Get time series data from the database ----------------
app.post('/grafieken/get-timeseries', async (req, res) => {
  console.log('Grafieken requested time series from', req.body.questionId);

  try {

    // Define the aggregation pipeline for time series data
    const pipeline = [
      {
        $match: {
          questionId: parseInt(req.body.questionId),
        },
      },
      {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$timestamp",
        },
      },
      questionId: {
        $first: "$questionId",
      },
      // Preserve the first questionId within each group
      quizId: {
        $first: "$quizId",
      },
      // Preserve the first quizId within each group
      results: {
        $push: "$results",
      },
    },
  },
  {
    $project: {
      timestamp: {
        $dateFromParts: {
          year: {
            $year: {
              $toDate: "$_id",
            },
          },
          month: {
            $month: {
              $toDate: "$_id",
            },
          },
          day: {
            $dayOfMonth: {
              $toDate: "$_id",
            },
          },
          hour: 12,
          minute: 0,
        },
      },
      questionId: 1,
      // Include the preserved questionId
      quizId: 1,
      // Include the preserved quizId
      results: {
        $map: {
          input: {
            $range: [
              0,
              {
                $size: {
                  $arrayElemAt: ["$results", 0],
                },
              },
            ],
          },
          as: "index",
          in: {
            $sum: {
              $map: {
                input: "$results",
                as: "resultArray",
                in: {
                  $arrayElemAt: [
                    "$$resultArray",
                    "$$index",
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  {
    $sort: {
      timestamp: 1,
    },
  },
      {
        $unwind: {
          path: "$results",
          includeArrayIndex: "index",
        },
      },
      {
        $addFields: {
          origin: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$index", 0],
                  },
                  then: "A",
                },
                {
                  case: {
                    $eq: ["$index", 1],
                  },
                  then: "B",
                },
                {
                  case: {
                    $eq: ["$index", 2],
                  },
                  then: "C",
                },
              ],
              default: "unknown",
            },
          },
        },
      },
      {
        $addFields: {
          data: ["$timestamp", "$results"],
        },
      },
      {
        $unset: ["index", "timestamp", "results"],
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$origin", "A"],
                  },
                  then: "A",
                },
                {
                  case: {
                    $eq: ["$origin", "B"],
                  },
                  then: "B",
                },
                {
                  case: {
                    $eq: ["$origin", "C"],
                  },
                  then: "C",
                },
              ],
              default: "unknown",
            },
          },
          documents: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $addFields: {
          documents: {
            $map: {
              input: "$documents",
              as: "doc",
              in: "$$doc.data",
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          docs: {
            $push: {
              k: "$_id",
              v: "$documents",
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $arrayToObject: "$docs",
          },
        },
      },
    ];


    // execute the filter for time series results
    const collection_results = global.db.collection('results');
    const timeseriesResult = await collection_results.aggregate(pipeline).toArray();

    // execute the filter for time series question info
    const collection_questions = global.db.collection('questions');
    const query = {"questionId": parseInt(req.body.questionId)};
    const questionInfoResult = await collection_questions.find(query).toArray();
    
    console.log('Time series result got =>', timeseriesResult[0].A.length, " answers from A for question:", questionInfoResult[0].nl.question);
    
    res.json({"results": timeseriesResult[0], "info": questionInfoResult[0]}); // send the results back to the frontend
  
  } catch (e) {
      console.error(e);
      res.status(500).send('Error retrieving results from the database.');
  }
});


/*************************************** CMS side bar ******************************************/
// request to power on/off the projector
app.post('/cms/toggleProjector', (req, res) => {
  // Set projector standby mode to "Network Standby" to keep the LAN port active when powered off
  // Menu --> options(2) --> standby mode --> network standby
  // configuration of the projector is defined in the .env file
  console.log('Projector toggle requested, going to state:', req.body.projectorState);

  // Create a new TCP client
  const client = new net.Socket();

  // Connect to the projector
  client.connect(process.env.PJLINK_PORT, process.env.PROJECTOR_IP, function() {
    console.log('Connected to projector');
  });

  // Handle errors for socket connection
  client.on('error', function(err) {
    console.error('Socket error:', err.message);
    if (err.code === 'ETIMEDOUT') {
      // return timeout error but use error code 500 to prevent the client from retrying
      res.status(500).send('PJ-Link client timeout');
    } else {
      res.status(500).send('Internal server error: ' + err.message);
    }
  });

  // When we receive data back from the projector
  client.on('data', function(data) {
    console.log('Received from projector: ' + data);

    // If the data starts with 'PJLINK 1', the projector requires a password
    if (data.toString().startsWith('PJLINK 1')) {
      // The salt is the rest of the data after 'PJLINK 1'
      const salt = data.toString().replace('PJLINK 1 ', '').trim();

      // Create a new MD5 hash instance
      const hash = crypto.createHash('md5');

      // Hash the salt + password
      hash.update(salt + process.env.PJLINK_PASS, 'utf-8');

      // The hashed password
      const hashedPassword = hash.digest('hex');

      // Then, send a PJLink command
      // %1POWR 1 = Power on, %1POWR 0 = Power off
      client.write(hashedPassword + '%1POWR '+ req.body.projectorState + '\r');

      // Close the connection
      client.destroy();
    }
  });

  client.on('close', function() {
    console.log('Connection closed');
  });
});


/************************************** CMS questions page *************************************/

app.post('/cms/delQuestion', (req, res) => {
  const collection = global.db.collection('questions');
  const questionId = new ObjectId(req.body.questionId);
  const delQuestion = { _id: questionId };
  collection.deleteOne(delQuestion, (err, result) => {
    if (err) {
      res.status(500).send('Internal Server Error');
      return;
    }
    res.sendStatus(200);
  });
});


// Function to either edit or add a question to the database
app.post('/cms/editQuestion', async (req, res) => {
  // Select the questions collection out the database
  const collection = global.db.collection('questions');
  // Retrieve the parameters out of the request
  question = req.body.newQuestion,
  answers = [req.body.newAnswer1, req.body.newAnswer2, req.body.newAnswer3]
  questionKey = (req.body.language === "en") ? "en.question" : (req.body.language === "nl") ? "nl.question" : "fr.question";
  answersKey = (req.body.language === "en") ? "en.answers" : (req.body.language === "nl") ? "nl.answers" : "fr.answers";
  const questionIdObject = new ObjectId(req.body.questionId);
  try {
    // If the question does exists already it means we want to edit the question
    if (req.body.questionId != null){
      // Update the question, answers and corresponding correctAnswer where questionid = questionIdObject 
      const filter = { _id: questionIdObject };
      const updateOperation = {
        $set: {
          [questionKey]: question,
          [answersKey]: answers,
          correctAnswer: req.body.correctAnswer,
        }
      };
      collection.updateOne(filter, updateOperation);
    }
    // If the question doesnt exists already in the database a new it needs to be created
    else {
      // search for the highest question Id in the database so we know the value for the next added question
      const highestIdPipeline = [
      {
        $group: {
          _id: null,
          maxQuestionId: {
            $max: "$questionId",
          },
        },
      },
      ];
      const highestIndex = await collection.aggregate(highestIdPipeline).toArray();

      // add a new question, with new answers and corresponding correctAnswer, and set the questionId equal to the new highest
      const newQuestion = {
        correctAnswer: req.body.correctAnswer,
        en: {
          question: req.body.newQuestion,
          answers: [req.body.newAnswer1, req.body.newAnswer2, req.body.newAnswer3]
        },
        fr: {
          question: req.body.newQuestion,
          answers: [req.body.newAnswer1, req.body.newAnswer2, req.body.newAnswer3]
        },
        nl: {
          question: req.body.newQuestion,
          answers: [req.body.newAnswer1, req.body.newAnswer2, req.body.newAnswer3]
        },
        enabled: true,
        bezocht: false,
        questionId: (highestIndex[0] ? highestIndex[0].maxQuestionId + 1 : 0),
      };
      // Retrieve the result to retrieve the generated question Id to update this Id in the frontend
      const result = await collection.insertOne(newQuestion);
      const newId = result.insertedId;
      // Send the newId back to the frontend
      res.status(200).send({ newId: newId });
    }; 
  }
  catch (error) {
    console.error("An error occurred", error);
    res.status(500).send('Internal Server Error');
  }
});


// Function to retrieve all questions
app.get('/cms/getQuestions', async (req, res) => {
  try {
      const collection = global.db.collection('questions');
      // Find {} finds everything
      const questions = await collection.find({}).toArray();
      // Send quesitons from the database to the front-end
      res.json(questions);
  } catch (error) {
      console.error('Error fetching questions from MongoDB:', error);
      res.status(500).send('Internal Server Error');
  }
});


/************************************** CMS enabled page *************************************/

// Function to change enabled flags in the database
app.post('/cms/saveEnabledCheckBoxes', async (req, res) => {
  const collection = global.db.collection('questions');
  // Retrieve all the enabled flags for each question
  const { questionDict } = req.body;

  try {
    // Bundle all the questions together in one bulk operation for higher efficiency and fewer chances for errors
    const bulkOperations = [];
    for (const questionId in questionDict) {
      const questionIdObject = new ObjectId(questionId);
      const { enableSwitch } = questionDict[questionIdObject];
      const filter = { _id: questionIdObject };
      const updateOperation = { $set: { enabled: enableSwitch } };
      // Run the bulk operation to change all the enabled flags
      bulkOperations.push({
        updateOne: {
          filter,
          update: updateOperation
        }
      });
    }

    const result = await collection.bulkWrite(bulkOperations);
    console.log(`${result.modifiedCount} enabled flags changed successfully`);
    res.status(200).send(`${result.modifiedCount} enabled flags changed successfully`);
  } catch (error) {
    console.error("An error occurred", error);
    res.status(500).send('Internal Server Error');
  }
});


/************************************** CMS visiters page *************************************/

app.post('/cms/saveVisitedCheckBoxes', async (req, res) => {
  const collection = global.db.collection('questions');
  // Retrieve all the visited flags for each question
  const { questionDict } = req.body;

  try {
    // bundle all the questions together in one bulk operation for a higher bulkwrit and less chance for errors
    const bulkOperations = [];
    
    for (const questionId in questionDict) {
      const questionIdObject = new ObjectId(questionId);
      const { visitedSwitch } = questionDict[questionIdObject];
      const filter = { _id: questionIdObject };
      const updateOperation = { $set: { bezocht: visitedSwitch } };
      
      // Run the bulk operation to change all the visited flags
      bulkOperations.push({
        updateOne: {
          filter,
          update: updateOperation
        }
      });
    }
    const result = await collection.bulkWrite(bulkOperations);
    console.log(`${result.modifiedCount} visited flags changed successfully`);
    res.status(200).send(`${result.modifiedCount} visited flags changed successfully`);
  } catch (error) {
    console.error("An error occurred", error);
    res.status(500).send('Internal Server Error');
  }
});


/************************************** CMS Settings page *************************************/

// Save settings in the mongodb database
app.post('/cms/saveSettings', async (req, res) => {
  const collection = global.db.collection('params');
  // Retrieve all the question from the request from the front-end
  const { settingsDict } = req.body;
  try {
    // Update the settings in the database
    const result = await collection.updateOne({}, { $set: settingsDict });
    console.log("Settings saved successfully");
    res.status(200).send('Settings saved successfully');
  } catch (error) {
    console.error("An error occurred", error);
    res.status(500).send('Internal Server Error');
  }
});


// Retrieve settings out of the database
app.get('/cms/getSettings', async (req, res) => {
try {
  const collection = global.db.collection('params');
  const settings = await collection.findOne({});
  // Respond with a dictionary off all the parameters found in the database
  res.json(settings);
} catch (error) {
  console.error('Error fetching settings from MongoDB:', error);
  res.status(500).send('Internal Server Error');
}
});



/************************************** Other code *************************************/

main()
  .then(console.log)
  .catch(console.error)
  //.finally(() => client.close());
