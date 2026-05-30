const db = require("../../../../config/db");

module.exports.getAllPayments = async (userId) => {
  try {
    const payments = await db.$queryRaw`
      SELECT payments.*, invoices.invoice_no, clients.name AS client_name
      FROM payments
      LEFT JOIN invoices ON payments.invoice_id = invoices.id
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE payments.user_id = ${userId}
      ORDER BY payments.created_at DESC
    `;
    return payments;
  } catch (err) {
    console.error("Service Error:", err);
    throw new Error("Failed to fetch payments");
  }
};

module.exports.getPaymentById = async (id, userId) => {
  try {
    const rows = await db.$queryRaw`
      SELECT payments.*, invoices.invoice_no, clients.name AS client_name
      FROM payments
      LEFT JOIN invoices ON payments.invoice_id = invoices.id
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE payments.id = ${id} AND payments.user_id = ${userId}
    `;
    return rows[0] || null;
  } catch (err) {
    console.error("Service Error:", err);
    throw new Error("Failed to fetch payment");
  }
};

const syncInvoicePayments = async (invoiceId, userId, prisma) => {
  const handle = prisma || db;
  const [result] = await handle.$queryRaw`
    SELECT SUM(amount) AS total_paid FROM payments
    WHERE invoice_id = ${invoiceId} AND user_id = ${userId} AND status = 'captured'
  `;
  const totalPaid = Number(result?.total_paid || 0);
  const invoice = await handle.invoices.findFirst({
    where: { id: invoiceId, user_id: userId },
    select: { total_amount: true },
  });
  if (!invoice) return;
  const balanceDue = Number(invoice.total_amount || 0) - totalPaid;
  await handle.invoices.update({
    where: { id: invoiceId },
    data: { amount_paid: totalPaid, balance_due: balanceDue },
  });
};

module.exports.createPayment = async (data, userId) => {
  try {
    const insertData = { ...data, user_id: userId };
    if (!insertData.transaction_id || insertData.transaction_id.trim() === "") {
      delete insertData.transaction_id;
    }
    const result = await db.$transaction(async (prisma) => {
      const payment = await prisma.payments.create({ data: insertData });
      if (insertData.invoice_id) await syncInvoicePayments(insertData.invoice_id, userId, prisma);
      return payment;
    });
    const newPayment = await module.exports.getPaymentById(result.id, userId);
    return { status: true, data: newPayment };
  } catch (err) {
    console.error("Service Error:", err);
    if (err.code === "P2002" && err.meta?.target?.includes("transaction_id")) {
      return { status: false, message: "Transaction ID already exists." };
    }
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updatePayment = async (id, data, userId) => {
  try {
    const updateData = { ...data };
    if (updateData.transaction_id !== undefined && updateData.transaction_id.trim() === "") {
      updateData.transaction_id = null;
    }
    const result = await db.$transaction(async (prisma) => {
      const before = await prisma.payments.findFirst({ where: { id, user_id: userId } });
      if (!before) throw new Error("NOT_FOUND");
      await prisma.payments.update({ where: { id }, data: updateData });
      await syncInvoicePayments(before.invoice_id, userId, prisma);
      return before;
    });
    const updated = await module.exports.getPaymentById(id, userId);
    return { status: true, data: updated };
  } catch (err) {
    if (err.message === "NOT_FOUND") return { status: false, message: "Payment not found" };
    console.error("Service Error:", err);
    if (err.code === "P2002" && err.meta?.target?.includes("transaction_id")) {
      return { status: false, message: "Transaction ID already exists." };
    }
    return { status: false, message: "Internal server error" };
  }
};
