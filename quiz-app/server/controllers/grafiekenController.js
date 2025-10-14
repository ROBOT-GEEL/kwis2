import { getDB } from "../config/db.js";
import logger from "../config/logger.js";

export const getResults = async (req, res, next) => {
  console.log("Grafieken requested quiz results.");

  const enable = req.body?.config?.enable ?? null;
  const bezocht = req.body?.config?.bezocht ?? null;

  try {
    const db = getDB();
    const collection_results = db.collection("results");

    // Aggregatiepipeline voor quizresultaten
    const pipeline = [
      {
        $lookup: {
          from: "questions",
          localField: "questionId",
          foreignField: "questionId",
          as: "questionsData",
        },
      },
      { $unwind: "$questionsData" },
      { $match: {} }, // wordt aangepast hieronder
      {
        $addFields: {
          nl: "$questionsData.nl",
          correctAnswer: "$questionsData.correctAnswer",
        },
      },
      { $unset: "questionsData" },
      {
        $group: {
          _id: "$questionId",
          totalA: { $sum: { $arrayElemAt: ["$results", 0] } },
          totalB: { $sum: { $arrayElemAt: ["$results", 1] } },
          totalC: { $sum: { $arrayElemAt: ["$results", 2] } },
          nl: { $first: "$nl" },
          correctAnswer: { $first: "$correctAnswer" },
        },
      },
      {
        $project: {
          sumResults: ["$totalA", "$totalB", "$totalC"],
          nl: 1,
          correctAnswer: 1,
        },
      },
      { $sort: { _id: 1 } },
    ];

    // Filter toevoegen op basis van frontendconfig
    if (enable !== null && bezocht !== null) {
      pipeline[2].$match = {
        $and: [{ "questionsData.enabled": enable }, { "questionsData.bezocht": bezocht }],
      };
    } else if (enable !== null) {
      pipeline[2].$match = { "questionsData.enabled": enable };
    } else if (bezocht !== null) {
      pipeline[2].$match = { "questionsData.bezocht": bezocht };
    }

    // Pipeline uitvoeren
    const quizAnswersResult = await collection_results.aggregate(pipeline).toArray();
    console.log(`Grafieken requested quiz results, got => ${quizAnswersResult.length}`);

    res.json(quizAnswersResult);
  } catch (e) {
    logger.error("Error retrieving quiz results:", e);
    res.status(500).send("Error retrieving results from the database.");
  }
};

export const getTimeseries = async (req, res, next) => {
  console.log("Grafieken requested time series from", req.body.questionId);

  try {
    const db = getDB();
    const collection_results = db.collection("results");
    const collection_questions = db.collection("questions");
    const questionId = parseInt(req.body.questionId);

    if (isNaN(questionId)) {
      return res.status(400).send("Invalid question ID");
    }

    // Aggregatiepipeline voor tijdreeksanalyse
    const pipeline = [
      { $match: { questionId: questionId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp",
            },
          },
          questionId: { $first: "$questionId" },
          quizId: { $first: "$quizId" },
          results: { $push: "$results" },
        },
      },
      {
        $project: {
          timestamp: {
            $dateFromParts: {
              year: { $year: { $toDate: "$_id" } },
              month: { $month: { $toDate: "$_id" } },
              day: { $dayOfMonth: { $toDate: "$_id" } },
              hour: 12,
              minute: 0,
            },
          },
          questionId: 1,
          quizId: 1,
          results: {
            $map: {
              input: { $range: [0, { $size: { $arrayElemAt: ["$results", 0] } }] },
              as: "index",
              in: {
                $sum: {
                  $map: {
                    input: "$results",
                    as: "resultArray",
                    in: { $arrayElemAt: ["$$resultArray", "$$index"] },
                  },
                },
              },
            },
          },
        },
      },
      { $sort: { timestamp: 1 } },
      { $unwind: { path: "$results", includeArrayIndex: "index" } },
      {
        $addFields: {
          origin: {
            $switch: {
              branches: [
                { case: { $eq: ["$index", 0] }, then: "A" },
                { case: { $eq: ["$index", 1] }, then: "B" },
                { case: { $eq: ["$index", 2] }, then: "C" },
              ],
              default: "unknown",
            },
          },
        },
      },
      { $addFields: { data: ["$timestamp", "$results"] } },
      { $unset: ["index", "timestamp", "results"] },
      {
        $group: {
          _id: "$origin",
          documents: { $push: "$data" },
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
      { $replaceRoot: { newRoot: { $arrayToObject: "$docs" } } },
    ];

    // Tijdreeksdata ophalen
    const timeseriesResult = await collection_results.aggregate(pipeline).toArray();

    // Vraaginfo ophalen
    const questionInfoResult = await collection_questions.findOne({ questionId });

    if (!timeseriesResult.length || !questionInfoResult) {
      return res.status(404).send("No data found for this question ID");
    }

    console.log(
      `Time series result got => ${timeseriesResult[0].A?.length ?? 0} answers from A for question:`,
      questionInfoResult.nl.question
    );

    res.json({ results: timeseriesResult[0], info: questionInfoResult });
  } catch (e) {
    logger.error("Error retrieving time series data:", e);
    res.status(500).send("Error retrieving results from the database.");
  }
};
