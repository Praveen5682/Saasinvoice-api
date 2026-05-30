const db = require("../config/db");

let isDbConnected = false;

const dbCheck = async (req, res, next) => {
  try {
    if (!isDbConnected) {
      await db.$queryRaw`SELECT 1`;
      isDbConnected = true;
    }

    next();
  } catch (err) {
    console.error("Database connection check failed:", err);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};

module.exports = dbCheck;

