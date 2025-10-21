import { MongoClient } from "mongodb";
import logger from "./logger.js";

let db;

export async function connectDB() {
  try {
    const uri = process.env.ATLAS_URI;
    const dbName = process.env.ATLAS_DBNAME || "LocalRPIdb";

    if (!uri) throw new Error("ATLAS_URI not found in .env");

    const client = new MongoClient(uri);
    await client.connect();

    db = client.db(dbName);
    global.db = db; // <== belangrijk, zodat controllers dit kunnen gebruiken
    logger.info(`Connected to MongoDB database: ${dbName}`);
  } catch (err) {
    logger.error("Failed to connect to MongoDB:", err);
  }
}

export function getDB() {
  if (!db) throw new Error("Database not initialized");
  return db;
}
