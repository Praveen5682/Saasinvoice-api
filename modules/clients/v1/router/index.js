// routes/clientRoutes.js  (or whatever the file name is)

const express = require("express");
const router = express.Router();
const Controller = require("../controller/index");
const authCheck = require("../../../../middleware/authCheck");
const { enforceLimit } = require("../../../../middleware/enforceLimit");

// Protected Client Routes
router.get("/get-all-clients", authCheck, Controller.getAllClients);
router.get("/:id", authCheck, Controller.getClientById);
router.post(
  "/create-client",
  authCheck,
  enforceLimit("clients"),
  Controller.createClient,
);
router.put("/:id", authCheck, Controller.updateClient);
router.delete("/:id", authCheck, Controller.deleteClient);

// ✅ FIXED: Added authCheck middleware
router.patch("/:id/status", authCheck, Controller.updateClientStatus);

module.exports = router;
