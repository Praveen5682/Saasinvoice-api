const express = require("express");
const router = express.Router();
const Controller = require("../controller/index");
const authCheck = require("../../../../middleware/authCheck");

// Protected Reports Routes
router.get("/summary", authCheck, Controller.getDashboardSummary);
router.get("/trends", authCheck, Controller.getSalesTrends);
router.get("/client-revenue", authCheck, Controller.getClientRevenue);

module.exports = router;
