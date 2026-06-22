const prisma = require("../../../../config/db");
const { sendReminderEmail } = require("../../../../utils/mailer");

module.exports.getAllReminders = async (userId) => {
  try {
    const invoices = await prisma.$queryRaw`
      SELECT
        invoices.id AS invoice_id, invoices.invoice_no,
        invoices.total_amount, invoices.amount_paid, invoices.due_date,
        reminders.id AS reminder_id, reminders.status AS sent_status, reminders.last_sent,
        COALESCE(clients.name, invoices.client_name) AS client_name,
        COALESCE(clients.email, invoices.client_email) AS client_email
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      LEFT JOIN reminders ON invoices.id = reminders.invoice_id
      WHERE invoices.user_id = ${userId}
        AND invoices.status != 'draft'
        AND invoices.total_amount > COALESCE(invoices.amount_paid, 0)
      ORDER BY invoices.due_date ASC
    `;

    const today = new Date();
    return invoices.map((inv) => {
      const dueDate = new Date(inv.due_date);
      const isOverdue = dueDate < today;
      let displayStatus = "upcoming";
      if (inv.sent_status === "sent") displayStatus = "sent";
      else if (isOverdue) displayStatus = "overdue";

      return {
        id: inv.reminder_id || `inv_${inv.invoice_id}`,
        invoice_id: inv.invoice_id,
        invoice_no: inv.invoice_no,
        client_name: inv.client_name,
        client_email: inv.client_email,
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        status: displayStatus,
        last_sent: inv.last_sent,
      };
    });
  } catch (err) {
    console.error("Service Error:", err);
    throw new Error("Failed to fetch reminders");
  }
};

module.exports.triggerReminder = async (id, userId) => {
  try {
    let invoiceId = id;
    if (typeof id === "string" && id.startsWith("inv_")) {
      invoiceId = Number(id.replace("inv_", ""));
    }

    const rows = await prisma.$queryRaw`
      SELECT invoices.*, clients.name AS client_name, clients.email AS client_email
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = ${invoiceId} AND invoices.user_id = ${userId}
    `;
    const invoice = rows[0];
    if (!invoice || !invoice.client_email) {
      return { status: false, message: "Invoice or client email not found" };
    }

    const emailSent = await sendReminderEmail(
      invoice.client_email, invoice.client_name,
      invoice.invoice_no, invoice.total_amount, invoice.due_date
    );

    if (emailSent) {
      const existing = await prisma.reminder.findFirst({ where: { invoiceId: invoiceId } });
      if (existing) {
        await prisma.reminder.update({ where: { id: existing.id }, data: { status: "sent", lastSent: new Date() } });
      } else {
        await prisma.reminder.create({
          data: {
            invoiceId: invoiceId, userId: userId, type: "email",
            status: "sent", lastSent: new Date(), reminderDate: new Date(),
          },
        });
      }
      return { status: true, message: "Reminder sent successfully" };
    }
    return { status: false, message: "Failed to send email" };
  } catch (err) {
    console.error("Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.processReminders = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    await prisma.reminder.updateMany({
      where: { status: "pending", reminderDate: { lt: new Date(today) } },
      data: { status: "overdue" },
    });

    const remindersToSend = await prisma.$queryRaw`
      SELECT reminders.*, invoices.invoice_no, invoices.total_amount, invoices.due_date,
             clients.name AS client_name, clients.email AS client_email
      FROM reminders
      LEFT JOIN invoices ON reminders.invoice_id = invoices.id
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE reminders.status = 'pending' AND reminders.reminder_date <= ${today}::date
    `;

    const results = [];
    for (const reminder of remindersToSend) {
      if (reminder.type === "email" && reminder.client_email) {
        const emailSent = await sendReminderEmail(
          reminder.client_email, reminder.client_name,
          reminder.invoice_no, reminder.total_amount, reminder.due_date
        );
        const newStatus = emailSent ? "sent" : "failed";
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: newStatus, lastSent: emailSent ? new Date() : undefined },
        });
        results.push({ id: reminder.id, status: newStatus });
      }
    }

    return { success: true, processed: results.length, details: results };
  } catch (err) {
    console.error("Process Reminders Error:", err);
    throw err;
  }
};
