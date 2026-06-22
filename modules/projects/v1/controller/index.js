// controller/index.js
const service = require("../service/index");
const { createProjectSchema, updateProjectSchema } = require("../validator/index");

module.exports.getAllProjects = async (req, res) => {
  try {
    const projects = await service.getAllProjects(req.user.id);
    return res.status(200).json({ success: true, data: projects });
  } catch (err) {
    console.error("Project Controller Error (getAllProjects):", err);
    return res.status(500).json({ success: false, message: "Failed to fetch projects." });
  }
};

module.exports.getProjectById = async (req, res) => {
  try {
    const project = await service.getProjectById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }
    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error("Project Controller Error (getProjectById):", err);
    return res.status(500).json({ success: false, message: "Failed to fetch project." });
  }
};

module.exports.createProject = async (req, res) => {
  try {
    const { error, value } = createProjectSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.createProject(value, req.user.id);

    if (!response.status) {
      return res.status(400).json({ success: false, message: response.message });
    }

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      data: response.data,
    });
  } catch (err) {
    console.error("Project Controller Error (createProject):", err);
    return res.status(500).json({ success: false, message: "Failed to create project." });
  }
};

module.exports.updateProject = async (req, res) => {
  try {
    const { error, value } = updateProjectSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.updateProject(req.params.id, value, req.user.id);

    if (!response.status) {
      return res.status(400).json({ success: false, message: response.message });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully.",
      data: response.data,
    });
  } catch (err) {
    console.error("Project Controller Error (updateProject):", err);
    if (err.message.includes("not found") || err.message.includes("authorized")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Failed to update project." });
  }
};

module.exports.deleteProject = async (req, res) => {
  try {
    const response = await service.deleteProject(req.params.id, req.user.id);

    if (!response.status) {
      return res.status(400).json({ success: false, message: response.message });
    }

    return res.status(200).json({ success: true, message: "Project deleted successfully." });
  } catch (err) {
    console.error("Project Controller Error (deleteProject):", err);
    return res.status(500).json({ success: false, message: "Failed to delete project." });
  }
};

module.exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "completed", "on_hold", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const result = await service.updateProjectStatus(id, status, req.user.id);

    if (!result.status) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    console.error("Project Controller Error (updateProjectStatus):", err);
    return res.status(500).json({ success: false, message: "Failed to update project status." });
  }
};
