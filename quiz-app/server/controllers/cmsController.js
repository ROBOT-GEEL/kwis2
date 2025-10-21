import net from "net";
import crypto from "crypto";
import { ObjectId } from "mongodb";

export const toggleProjector = async (req, res, next) => {
  console.log("Projector toggle requested, going to state:", req.body.projectorState);

  const client = new net.Socket();

  client.connect(process.env.PJLINK_PORT, process.env.PROJECTOR_IP, function () {
    console.log("Connected to projector");
  });

  client.on("error", function (err) {
    console.error("Socket error:", err.message);
    if (err.code === "ETIMEDOUT") {
      res.status(500).send("PJ-Link client timeout");
    } else {
      res.status(500).send("Internal server error: " + err.message);
    }
  });

  client.on("data", function (data) {
    console.log("Received from projector: " + data);

    if (data.toString().startsWith("PJLINK 1")) {
      const salt = data.toString().replace("PJLINK 1 ", "").trim();

      const hash = crypto.createHash("md5");
      hash.update(salt + process.env.PJLINK_PASS, "utf-8");
      const hashedPassword = hash.digest("hex");

      // Send power command
      const command = `${hashedPassword}%1POWR ${req.body.projectorState}\r`;
      client.write(command);
}     else if (data.toString().startsWith("PJLINK 0")) {
      // Handle without authentication
      const command = `%1POWR ${req.body.projectorState}\r`;
      client.write(command);
}

      // Wait a bit to ensure command is sent before closing
      setTimeout(() => client.destroy(), 200);
  });

  client.on("close", function () {
    console.log("Connection closed");
  });
};

export const delQuestion = async (req, res, next) => {
  try {
    const collection = global.db.collection("questions");
    const questionId = new ObjectId(req.body.questionId);
    await collection.deleteOne({ _id: questionId });
    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).send("Internal Server Error");
  }
};

export const editQuestion = async (req, res, next) => {
  try {
    const collection = global.db.collection("questions");

    const question = req.body.newQuestion;
    const answers = [req.body.newAnswer1, req.body.newAnswer2, req.body.newAnswer3];

    const questionKey =
      req.body.language === "en"
        ? "en.question"
        : req.body.language === "nl"
        ? "nl.question"
        : "fr.question";
    const answersKey =
      req.body.language === "en"
        ? "en.answers"
        : req.body.language === "nl"
        ? "nl.answers"
        : "fr.answers";

    // If editing an existing question
    if (req.body.questionId) {
      const questionIdObject = new ObjectId(req.body.questionId);
      const filter = { _id: questionIdObject };
      const updateOperation = {
        $set: {
          [questionKey]: question,
          [answersKey]: answers,
          correctAnswer: req.body.correctAnswer,
        },
      };
      await collection.updateOne(filter, updateOperation);
      res.status(200).send({ updated: true });
    } else {
      // Create a new question
      const highestIdPipeline = [
        { $group: { _id: null, maxQuestionId: { $max: "$questionId" } } },
      ];
      const highestIndex = await collection.aggregate(highestIdPipeline).toArray();
      const newId = highestIndex[0] ? highestIndex[0].maxQuestionId + 1 : 0;

      const newQuestion = {
        correctAnswer: req.body.correctAnswer,
        en: { question, answers },
        fr: { question, answers },
        nl: { question, answers },
        enabled: true,
        bezocht: false,
        questionId: newId,
      };

      const result = await collection.insertOne(newQuestion);
      res.status(200).send({ newId: result.insertedId });
    }
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getQuestions = async (req, res, next) => {
  try {
    const collection = global.db.collection("questions");
    const questions = await collection.find({}).toArray();
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const saveEnabledCheckBoxes = async (req, res, next) => {
  const collection = global.db.collection("questions");
  const { questionDict } = req.body;

  try {
    const bulkOperations = [];

    for (const questionId in questionDict) {
      const questionIdObject = new ObjectId(questionId);
      const { enableSwitch } = questionDict[questionId];
      bulkOperations.push({
        updateOne: {
          filter: { _id: questionIdObject },
          update: { $set: { enabled: enableSwitch } },
        },
      });
    }

    const result = await collection.bulkWrite(bulkOperations);
    console.log(`${result.modifiedCount} enabled flags changed successfully`);
    res.status(200).send(`${result.modifiedCount} enabled flags changed successfully`);
  } catch (error) {
    console.error("Error saving enabled flags:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const saveVisitedCheckBoxes = async (req, res, next) => {
  const collection = global.db.collection("questions");
  const { questionDict } = req.body;

  try {
    const bulkOperations = [];

    for (const questionId in questionDict) {
      const questionIdObject = new ObjectId(questionId);
      const { visitedSwitch } = questionDict[questionId];
      bulkOperations.push({
        updateOne: {
          filter: { _id: questionIdObject },
          update: { $set: { bezocht: visitedSwitch } },
        },
      });
    }

    const result = await collection.bulkWrite(bulkOperations);
    console.log(`${result.modifiedCount} visited flags changed successfully`);
    res.status(200).send(`${result.modifiedCount} visited flags changed successfully`);
  } catch (error) {
    console.error("Error saving visited flags:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const saveSettings = async (req, res, next) => {
  try {
    const collection = global.db.collection("params");
    const { settingsDict } = req.body;

    await collection.updateOne(
      { name: "settings" },
      { $set: settingsDict },
      { upsert: true }
    );

    console.log("Settings saved successfully");
    res.status(200).send("Settings saved successfully");
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const collection = global.db.collection("params");
    const settings = await collection.findOne({});
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).send("Internal Server Error");
  }
};
