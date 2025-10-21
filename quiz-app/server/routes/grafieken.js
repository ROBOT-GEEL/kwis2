import express from "express";
import { getResults, getTimeseries }
    from "../controllers/grafiekenController.js";
const router = express.Router();

router.post("/get-results", getResults);
router.post("/get-timeseries", getTimeseries);

export default router;
