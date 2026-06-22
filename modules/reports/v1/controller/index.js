const service = require("../service/index");

module.exports.getDashboardSummary = async (req, res) => {
  try {
    const response = await service.getDashboardSummary(req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("Reports Controller Error (getDashboardSummary):", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard summary." });
  }
};

module.exports.getSalesTrends = async (req, res) => {
  try {
    const response = await service.getSalesTrends(req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("Reports Controller Error (getSalesTrends):", err);
    return res.status(500).json({ success: false, message: "Failed to fetch sales trends." });
  }
};

module.exports.getClientRevenue = async (req, res) => {
  try {
    const response = await service.getClientRevenue(req.user.id);
    if (!response.status) return res.status(400).json({ success: false, message: response.message });

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("Reports Controller Error (getClientRevenue):", err);
    return res.status(500).json({ success: false, message: "Failed to fetch client revenue." });
  }
};
