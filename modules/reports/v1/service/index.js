const db = require("../../../../config/db");

module.exports.getDashboardSummary = async (userId) => {
  try {
    // Invoices metrics
    const invoices = await db.$queryRaw`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_outstanding,
        COUNT(id) as total_invoices_count
      FROM invoices 
      WHERE user_id = ${userId} AND status != 'draft'
    `;

    // Active clients count
    const clients = await db.$queryRaw`
      SELECT COUNT(id) as active_clients_count
      FROM clients 
      WHERE user_id = ${userId} AND status = 1
    `;

    // Recent payments (last 30 days)
    const recentPayments = await db.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as recent_payments
      FROM payments
      WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '30 days'
    `;

    // Estimates count
    const estimates = await db.$queryRaw`
      SELECT COUNT(id) as total_estimates_count
      FROM estimates
      WHERE user_id = ${userId}
    `;

    return {
      status: true,
      data: {
        total_invoiced: Number(invoices[0]?.total_invoiced || 0),
        total_paid: Number(invoices[0]?.total_paid || 0),
        total_outstanding: Number(invoices[0]?.total_outstanding || 0),
        total_invoices_count: Number(invoices[0]?.total_invoices_count || 0),
        active_clients_count: Number(clients[0]?.active_clients_count || 0),
        recent_payments_30d: Number(recentPayments[0]?.recent_payments || 0),
        total_estimates_count: Number(estimates[0]?.total_estimates_count || 0),
      }
    };
  } catch (err) {
    console.error("Service Error (getDashboardSummary):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.getSalesTrends = async (userId) => {
  try {
    const trends = await db.$queryRaw`
      SELECT 
        TO_CHAR(issue_date, 'YYYY-MM') as month,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(amount_paid), 0) as total_received
      FROM invoices
      WHERE user_id = ${userId} 
        AND issue_date >= NOW() - INTERVAL '12 months'
        AND status != 'draft'
      GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const formattedTrends = trends.map(t => ({
      month: t.month,
      total_sales: Number(t.total_sales || 0),
      total_received: Number(t.total_received || 0)
    }));

    return { status: true, data: formattedTrends };
  } catch (err) {
    console.error("Service Error (getSalesTrends):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.getClientRevenue = async (userId) => {
  try {
    const clientRevenue = await db.$queryRaw`
      SELECT 
        c.id as client_id,
        c.name as client_name,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(SUM(i.amount_paid), 0) as total_paid
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id AND i.status != 'draft' AND i.user_id = ${userId}
      WHERE c.user_id = ${userId}
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    const formattedRevenue = clientRevenue.map(c => ({
      client_id: c.client_id,
      client_name: c.client_name,
      total_revenue: Number(c.total_revenue || 0),
      total_paid: Number(c.total_paid || 0)
    }));

    return { status: true, data: formattedRevenue };
  } catch (err) {
    console.error("Service Error (getClientRevenue):", err);
    return { status: false, message: "Internal server error" };
  }
};
