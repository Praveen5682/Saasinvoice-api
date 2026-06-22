const express = require("express");
const router = express.Router();
const Controller = require("../controller/index");
const authCheck = require("../../../../middleware/authCheck");
const { enforceLimit } = require("../../../../middleware/enforceLimit");

// Protected Project Routes
router.get("/get-all-projects", authCheck, Controller.getAllProjects);
router.get("/:id", authCheck, Controller.getProjectById);
router.post(
  "/create-project",
  authCheck,
  enforceLimit("projects"),
  Controller.createProject,
);
router.put("/:id", authCheck, Controller.updateProject);
router.delete("/:id", authCheck, Controller.deleteProject);
router.patch("/:id/status", authCheck, Controller.updateProjectStatus);

module.exports = router;
