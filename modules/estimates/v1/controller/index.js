const service = require("../service/index");
const { createEstimateSchema, updateEstimateSchema } = require("../validator/index");

module.exports.getAllEstimates = async (req, res) => {
  try {
    const estimates = await service.getAllEstimates(req.user.id);
    return res.status(200).json({ success: true, data: estimates });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch estimates." });
  }
};

module.exports.getEstimateById = async (req, res) => {
  try {
    const estimate = await service.getEstimateById(req.params.id, req.user.id);
    if (!estimate) return res.status(404).json({ success: false, message: "Estimate not found." });
    return res.status(200).json({ success: true, data: estimate });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch estimate." });
  }
};

module.exports.createEstimate = async (req, res) => {
  try {
    const { error, value } = createEstimateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const response = await service.createEstimate(value, req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(201).json({ success: true, message: "Estimate created successfully.", data: response.data });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to create estimate." });
  }
};

module.exports.updateEstimate = async (req, res) => {
  try {
    const { error, value } = updateEstimateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const response = await service.updateEstimate(req.params.id, value, req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, message: "Estimate updated successfully.", data: response.data });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update estimate." });
  }
};

module.exports.deleteEstimate = async (req, res) => {
  try {
    const response = await service.deleteEstimate(req.params.id, req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, message: response.message });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete estimate." });
  }
};

module.exports.updateEstimateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status is required." });

    const response = await service.updateEstimateStatus(req.params.id, status, req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, message: response.message });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to update estimate status." });
  }
};

module.exports.convertEstimateToInvoice = async (req, res) => {
  try {
    const response = await service.convertEstimateToInvoice(req.params.id, req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, message: response.message, data: response.data });
  } catch (err) {
    console.error("Estimate Controller Error:", err);
    return res.status(500).json({ success: false, message: "Failed to convert estimate." });
  }
};
