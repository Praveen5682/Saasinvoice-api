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
  const invoice = await handle.invoice.findFirst({
    where: { id: invoiceId, userId: userId },
    select: { totalAmount: true },
  });
  if (!invoice) return;
  const balanceDue = Number(invoice.totalAmount || 0) - totalPaid;
  await handle.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: totalPaid, balanceDue: balanceDue },
  });
};

module.exports.createPayment = async (data, userId) => {
  try {
    const txId = data.transaction_id && data.transaction_id.trim() !== "" ? data.transaction_id : undefined;
    const result = await db.$transaction(async (prisma) => {
      const payment = await prisma.payment.create({
        data: {
          userId,
          invoiceId: data.invoice_id || null,
          amount: data.amount,
          method: data.payment_method,
          status: data.status || "captured",
          paymentDate: new Date(data.payment_date),
          ...(txId ? { transactionId: txId } : {}),
        },
      });
      if (data.invoice_id) await syncInvoicePayments(data.invoice_id, userId, prisma);
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
    const result = await db.$transaction(async (prisma) => {
      const before = await prisma.payment.findFirst({ where: { id, userId } });
      if (!before) throw new Error("NOT_FOUND");

      const updateFields = {};
      if (data.invoice_id !== undefined) updateFields.invoiceId = data.invoice_id || null;
      if (data.amount !== undefined) updateFields.amount = data.amount;
      if (data.method !== undefined) updateFields.method = data.method;
      if (data.status !== undefined) updateFields.status = data.status;
      if (data.payment_date !== undefined) updateFields.paymentDate = new Date(data.payment_date);
      if (data.transaction_id !== undefined) {
        updateFields.transactionId = data.transaction_id && data.transaction_id.trim() !== "" ? data.transaction_id : null;
      }

      await prisma.payment.update({ where: { id }, data: updateFields });
      await syncInvoicePayments(before.invoiceId, userId, prisma);
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

module.exports.deletePayment = async (id, userId) => {
  try {
    const result = await db.$transaction(async (prisma) => {
      const payment = await prisma.payment.findFirst({ where: { id, userId: userId } });
      if (!payment) throw new Error("NOT_FOUND");
      
      await prisma.payment.delete({ where: { id } });
      
      if (payment.invoiceId) {
        await syncInvoicePayments(payment.invoiceId, userId, prisma);
      }
      return payment;
    });
    
    return { status: true, message: "Payment deleted successfully" };
  } catch (err) {
    if (err.message === "NOT_FOUND") return { status: false, message: "Payment not found or unauthorized" };
    console.error("Service Error (deletePayment):", err);
    return { status: false, message: "Internal server error" };
  }
};
