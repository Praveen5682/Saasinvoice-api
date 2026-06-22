const service = require("../service/index");

module.exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await service.getStats(userId);
    const chart = await service.getChartData(userId);
    const reminders = await service.getOverdueReminders(userId);

    const recentInvoices = await service.getRecentInvoices(userId);
    return res.status(200).json({
      success: true,
      data: { stats, chart, reminders, recentInvoices },
    });
  } catch (error) {
    console.error("Dashboard Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data.",
    });
  }
};

module.exports.getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;
    let data;

    if (type === "Weekly") {
      data = await service.getWeeklyReports(userId);
    } else if (type === "Quarterly") {
      data = await service.getQuarterlyReports(userId);
    } else if (type === "Yearly") {
      data = await service.getYearlyReports(userId);
    } else {
      data = await service.getMonthlyReports(userId);
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Dashboard Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load reports data.",
    });
  }
};
