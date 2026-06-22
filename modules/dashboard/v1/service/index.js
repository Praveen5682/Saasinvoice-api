const db = require("../../../../config/db");

module.exports.getStats = async (userId) => {
  try {
    const [revenueResult] = await db.$queryRaw`
      SELECT SUM(amount_paid) AS sum FROM invoices WHERE user_id = ${userId}
    `;
    const [pendingResult] = await db.$queryRaw`
      SELECT SUM(total_amount - COALESCE(amount_paid, 0)) AS sum
      FROM invoices WHERE user_id = ${userId}
      AND total_amount > COALESCE(amount_paid, 0)
    `;
    const today = new Date().toISOString().split("T")[0];
    const [overdueResult] = await db.$queryRaw`
      SELECT SUM(total_amount - COALESCE(amount_paid, 0)) AS sum
      FROM invoices WHERE user_id = ${userId}
      AND total_amount > COALESCE(amount_paid, 0)
      AND due_date < ${today}::date
    `;
    const [invoicesCount] = await db.$queryRaw`
      SELECT COUNT(id) AS count FROM invoices WHERE user_id = ${userId}
    `;
    const [clientsCount] = await db.$queryRaw`
      SELECT COUNT(id) AS count FROM clients WHERE user_id = ${userId}
    `;

    return {
      total_invoices: Number(invoicesCount?.count || 0),
      total_revenue: Number(revenueResult?.sum || 0),
      pending_amount: Number(pendingResult?.sum || 0),
      overdue_amount: Number(overdueResult?.sum || 0),
      total_clients: Number(clientsCount?.count || 0),
    };
  } catch (err) {
    console.error("Dashboard Service Error (getStats):", err);
    throw err;
  }
};

module.exports.getChartData = async (userId) => {
  try {
    const data = await db.$queryRaw`
      SELECT
        TO_CHAR(issue_date, 'Mon') AS month,
        SUM(COALESCE(amount_paid, 0)) AS revenue,
        SUM(total_amount - COALESCE(amount_paid, 0)) AS pending
      FROM invoices
      WHERE user_id = ${userId}
      GROUP BY TO_CHAR(issue_date, 'Mon')
      ORDER BY MIN(issue_date) ASC
      LIMIT 6
    `;
    return data;
  } catch (err) {
    console.error("Dashboard Service Error (getChartData):", err);
    return [];
  }
};

module.exports.getOverdueReminders = async (userId) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const reminders = await db.$queryRaw`
      SELECT
        invoices.id,
        COALESCE(clients.name, invoices.client_name) AS name,
        (invoices.total_amount - COALESCE(invoices.amount_paid, 0)) AS total_amount,
        invoices.due_date AS reminder_date,
        invoices.id AS invoice_id
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = ${userId}
        AND invoices.due_date < ${today}::date
        AND invoices.total_amount > COALESCE(invoices.amount_paid, 0)
      ORDER BY invoices.due_date ASC
      LIMIT 5
    `;
    return reminders;
  } catch (err) {
    console.error("Dashboard Service Error (getOverdueReminders):", err);
    return [];
  }
};
module.exports.getRecentInvoices = async (userId) => {
  try {
    const invoices = await db.$queryRaw`
      SELECT
        invoices.id,
        invoices.invoice_no,
        invoices.total_amount,
        invoices.amount_paid,
        invoices.due_date,
        invoices.issue_date,
        invoices.created_at,
        invoices.status,
        COALESCE(clients.name, invoices.client_name, 'Unknown Client') AS client_name
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = ${userId}
      ORDER BY COALESCE(invoices.issue_date, invoices.created_at) DESC
      LIMIT 5`;
    return invoices;
  } catch (err) {
    console.error("Dashboard Service Error (getRecentInvoices):", err);
    return [];
  }
};

module.exports.getMonthlyReports = async (userId) => {
  try {
    return await db.$queryRaw`
      SELECT
        TO_CHAR(COALESCE(issue_date, created_at), 'FMMonth YYYY') AS period,
        COUNT(id) AS invoice_count,
        SUM(total_amount) AS total_amount,
        SUM(COALESCE(amount_paid, 0)) AS paid_amount,
        SUM(total_amount - COALESCE(amount_paid, 0)) AS pending_amount
      FROM invoices
      WHERE user_id = ${userId}
      GROUP BY TO_CHAR(COALESCE(issue_date, created_at), 'FMMonth YYYY')
      ORDER BY MIN(COALESCE(issue_date, created_at)) DESC
    `;
  } catch (err) {
    console.error("Dashboard Service Error (getMonthlyReports):", err);
    return [];
  }
};

module.exports.getQuarterlyReports = async (userId) => {
  try {
    return await db.$queryRaw`
      SELECT
        'Q' || EXTRACT(QUARTER FROM COALESCE(issue_date, created_at)) || ' ' ||
        EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) AS period,
        COUNT(id) AS invoice_count,
        SUM(total_amount) AS total_amount,
        SUM(COALESCE(amount_paid, 0)) AS paid_amount,
        SUM(total_amount - COALESCE(amount_paid, 0)) AS pending_amount
      FROM invoices
      WHERE user_id = ${userId}
      GROUP BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at)),
               EXTRACT(QUARTER FROM COALESCE(issue_date, created_at))
      ORDER BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) DESC,
               EXTRACT(QUARTER FROM COALESCE(issue_date, created_at)) DESC
    `;
  } catch (err) {
    console.error("Dashboard Service Error (getQuarterlyReports):", err);
    return [];
  }
};

module.exports.getYearlyReports = async (userId) => {
  try {
    return await db.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) AS period,
        COUNT(id) AS invoice_count,
        SUM(total_amount) AS total_amount,
        SUM(COALESCE(amount_paid, 0)) AS paid_amount,
        SUM(total_amount - COALESCE(amount_paid, 0)) AS pending_amount
      FROM invoices
      WHERE user_id = ${userId}
      GROUP BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at))
      ORDER BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) DESC
    `;
  } catch (err) {
    console.error("Dashboard Service Error (getYearlyReports):", err);
    return [];
  }
};

module.exports.getWeeklyReports = async (userId) => {
  try {
    return await db.$queryRaw`
      SELECT
        'Week ' || EXTRACT(WEEK FROM COALESCE(issue_date, created_at)) || ', ' ||
        EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) AS period,
        COUNT(id) AS invoice_count,
        SUM(total_amount) AS total_amount,
        SUM(COALESCE(amount_paid, 0)) AS paid_amount,
        SUM(total_amount - COALESCE(amount_paid, 0)) AS pending_amount
      FROM invoices
      WHERE user_id = ${userId}
      GROUP BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at)),
               EXTRACT(WEEK FROM COALESCE(issue_date, created_at))
      ORDER BY EXTRACT(YEAR FROM COALESCE(issue_date, created_at)) DESC,
               EXTRACT(WEEK FROM COALESCE(issue_date, created_at)) DESC
      LIMIT 12
    `;
  } catch (err) {
    console.error("Dashboard Service Error (getWeeklyReports):", err);
    return [];
  }
};
