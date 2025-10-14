import express from "express";
import {
    getQuestions,
    getNewId,
    getParameters,
    getInstructions,
    getTimeToStart
} from "../controllers/quizController.js";

const router = express.Router();

// Haal quizvragen op
router.post("/questions", getQuestions);

// Haal nieuw quizId op
router.get("/new-id", getNewId);

// Haal quizparameters op
router.get("/parameters", getParameters);

// Haal instructies op
router.get("/instructions", getInstructions);

// Haal tijd tot start op
router.get("/time-to-start", getTimeToStart);

export default router;
