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

const database = "LocalRPIdb"; // name of the database

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

///////////////////////manual ding
app.use(express.static(path.join(__dirname, '..', "navigatie_page")));


//////////////////////////voorcms etcetera
app.use('/grafieken', express.static(path.join(__dirname, '..', 'Grafieken')));////////////////kleine g
app.use('/cms', express.static(path.join(__dirname, '..', 'Cms')));
app.use('/settings', express.static(path.join(__dirname, '..', 'Settings')));

app.use('/manual', express.static(path.join(__dirname, '..', 'navigatie_page')));

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



async function main() {
  // Use connect method to connect to the MongoDB server
  await client.connect();
  console.log('Connected successfully to server');
  global.db = client.db(dbName);
  
  return 'done.';
}

/************************************** Other code *************************************/

main()
  .then(console.log)
  .catch(console.error)
  //.finally(() => client.close());
