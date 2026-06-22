const express = require("express");
const router = express.Router();
const Controller = require("../controller/index");
const authCheck = require("../../../../middleware/authCheck");
const { enforceLimit } = require("../../../../middleware/enforceLimit");

// Protected Estimate Routes
router.get("/", authCheck, Controller.getAllEstimates);
router.get("/:id", authCheck, Controller.getEstimateById);
router.post(
  "/",
  authCheck,
  enforceLimit("estimates"),
  Controller.createEstimate,
);
router.put("/:id", authCheck, Controller.updateEstimate);
router.delete("/:id", authCheck, Controller.deleteEstimate);
router.patch("/:id/status", authCheck, Controller.updateEstimateStatus);
router.post("/:id/convert", authCheck, Controller.convertEstimateToInvoice);

module.exports = router;
