import path from "path";
import { getDB } from "../config/db.js";

// Haal quizvragen op
export const getQuestions = async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection("questions");
        const visited = req.body.visited;
        const amount = req.body.amount;

        const documents = await collection.aggregate([
            { $match: { bezocht: visited, enabled: true } },
            { $sample: { size: amount } }
        ]).toArray();

        res.status(200).json(documents);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
};

// Haal nieuwe quizId op
export const getNewId = async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection("results");

        const maxQuizId = await collection.find().sort({ quizId: -1 }).limit(1).next();
        res.status(200).json({ quizId: (maxQuizId?.quizId || 0) + 1 });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error retrieving quiz id');
    }
};

// Haal quizparameters op
export const getParameters = async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection("params");
        const parameters = await collection.findOne({});
        res.status(200).json(parameters);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error retrieving quiz parameters');
    }
};

// Haal instructies op
export const getInstructions = async (req, res) => {
    try {
        res.sendFile(path.join(process.cwd(), "instructions.json"));
    } catch (e) {
        console.error(e);
        res.status(500).send('Error retrieving instructions');
    }
};

// Haal tijd tot start op
export const getTimeToStart = async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection("params");
        const parameters = await collection.findOne({});
        res.status(200).json({ time: parameters.timeToStartQuiz });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error retrieving time to start');
    }
};
