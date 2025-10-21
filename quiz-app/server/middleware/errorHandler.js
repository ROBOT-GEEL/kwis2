import logger from "../config/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error(err.stack);
  res.status(500).json({ message: err.message });
}
