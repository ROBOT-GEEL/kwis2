import express from "express";
import { toggleProjector, delQuestion, editQuestion, getQuestions, saveEnabledCheckBoxes, saveVisitedCheckBoxes,
    saveSettings, getSettings } from "../controllers/cmsController.js";
const router = express.Router();

router.post("/toggleProjector", toggleProjector);
router.post("/delQuestion", delQuestion);
router.post("/editQuestion", editQuestion);
router.get("/getQuestions", getQuestions);
router.post("/saveEnabledCheckBoxes", saveEnabledCheckBoxes);
router.post("/saveVisitedCheckBoxes", saveVisitedCheckBoxes);
router.post("/saveSettings", saveSettings);
router.get("/getSettings", getSettings);

export default router;
