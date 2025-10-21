import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/db.js";
import logger from "./config/logger.js";
import { registerSocketHandlers } from "./sockets/socketHandler.js";

// Routes
import quizRoutes from "./routes/quiz.js";
import cmsRoutes from "./routes/cms.js";
import grafiekenRoutes from "./routes/grafieken.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ROOT_DIR = "/home/robotoo/Documents/quiz-app";

// Maak de juiste statische mappen beschikbaar
app.use(express.static(path.join(ROOT_DIR, "app")));
app.use(express.static(path.join(ROOT_DIR, "app-projector")));
app.use(express.static(path.join(ROOT_DIR, "demo")));
app.use(express.static(path.join(ROOT_DIR, "navigatie_page")));
app.use("/cms", express.static(path.join(ROOT_DIR, "Cms")));
app.use("/grafieken", express.static(path.join(ROOT_DIR, "Grafieken")));
app.use("/settings", express.static(path.join(ROOT_DIR, "Settings")));

// API routes
app.use("/quiz", quizRoutes);
app.use("/cms", cmsRoutes);
app.use("/grafieken", grafiekenRoutes);

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "app", "index.html"));
});

app.get("/projector", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "app-projector", "index.html"));
});

app.get("/demo", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "demo", "index.html"));
});

app.get("/manual-driving", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "navigatie_page", "index.html"));
});

app.get("/language", (req, res) => {
  res.sendFile(path.join(process.cwd(), "languages.json"));
});

// Logging endpoint
app.post("/log-error", (req, res) => {
  const errorData = req.body.error;
  logger.error(errorData);
  res.sendStatus(200);
});

// Error log download
app.get("/error-log", (req, res) => {
  res.sendFile(path.join(process.cwd(), "error.log"));
});

// Start server and connect DB
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Koppel Socket.IO events
registerSocketHandlers(io);

// Start pas na DB-connectie
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  logger.error("Failed to connect to DB:", err);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Server shutting down");
  process.exit(0);
});
