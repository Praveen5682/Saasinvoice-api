const db = require("../../../../config/db");

module.exports.getAllEstimates = async (userId) => {
  try {
    const estimates = await db.$queryRaw`
      SELECT e.*, c.name AS client_name, p.name AS project_name
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.user_id = ${userId}
      ORDER BY e.created_at DESC
    `;
    return estimates;
  } catch (err) {
    console.error("Service Error (getAllEstimates):", err);
    throw new Error("Failed to fetch estimates");
  }
};

module.exports.getEstimateById = async (id, userId) => {
  try {
    const rows = await db.$queryRaw`
      SELECT e.*, c.name AS client_name, c.email AS client_email,
             c.phone AS client_phone, c.address AS client_address,
             p.name AS project_name
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ${id} AND e.user_id = ${userId}
    `;
    
    const estimate = rows[0];
    if (!estimate) return null;

    const items = await db.estimateItem.findMany({ where: { estimateId: id } });
    estimate.items = items;
    
    return estimate;
  } catch (err) {
    console.error("Service Error (getEstimateById):", err);
    throw new Error("Failed to fetch estimate");
  }
};

module.exports.createEstimate = async (data, userId) => {
  try {
    const existing = await db.estimate.findFirst({
      where: { estimateNo: data.estimate_no, userId },
    });
    if (existing) return { status: false, message: "Estimate number already exists" };

    const { items, ...estimateData } = data;

    const result = await db.$transaction(async (prisma) => {
      const newEstimate = await prisma.estimate.create({
        data: {
          userId,
          clientId: estimateData.client_id,
          projectId: estimateData.project_id || null,
          estimateNo: estimateData.estimate_no,
          status: estimateData.status || "draft",
          currency: estimateData.currency || "INR",
          subtotal: estimateData.subtotal,
          totalAmount: estimateData.total_amount,
          issueDate: new Date(estimateData.issue_date),
          expiryDate: estimateData.expiry_date ? new Date(estimateData.expiry_date) : null,
          notes: estimateData.notes,
        },
      });

      if (items && items.length > 0) {
        await prisma.estimateItem.createMany({
          data: items.map((item) => ({
            estimateId: newEstimate.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxRate: item.tax_rate || 0,
            amount: item.amount,
          })),
        });
      }
      return newEstimate;
    });

    const estimate = await module.exports.getEstimateById(result.id, userId);
    return { status: true, data: estimate };
  } catch (err) {
    console.error("Service Error (createEstimate):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateEstimate = async (id, data, userId) => {
  try {
    const existing = await db.estimate.findFirst({ where: { id, userId } });
    if (!existing) return { status: false, message: "Estimate not found or unauthorized" };

    if (data.estimate_no && data.estimate_no !== existing.estimateNo) {
      const duplicate = await db.estimate.findFirst({
        where: { estimateNo: data.estimate_no, userId, NOT: { id } },
      });
      if (duplicate) return { status: false, message: "Estimate number already exists" };
    }

    const { items, ...estimateData } = data;
    
    const updatePayload = {};
    if (estimateData.client_id) updatePayload.clientId = estimateData.client_id;
    if (estimateData.project_id !== undefined) updatePayload.projectId = estimateData.project_id || null;
    if (estimateData.estimate_no) updatePayload.estimateNo = estimateData.estimate_no;
    if (estimateData.status) updatePayload.status = estimateData.status;
    if (estimateData.currency) updatePayload.currency = estimateData.currency;
    if (estimateData.subtotal !== undefined) updatePayload.subtotal = estimateData.subtotal;
    if (estimateData.total_amount !== undefined) updatePayload.totalAmount = estimateData.total_amount;
    if (estimateData.issue_date) updatePayload.issueDate = new Date(estimateData.issue_date);
    if (estimateData.expiry_date !== undefined) updatePayload.expiryDate = estimateData.expiry_date ? new Date(estimateData.expiry_date) : null;
    if (estimateData.notes !== undefined) updatePayload.notes = estimateData.notes;

    await db.$transaction(async (prisma) => {
      await prisma.estimate.update({ where: { id }, data: updatePayload });
      if (items !== undefined) {
        await prisma.estimateItem.deleteMany({ where: { estimateId: id } });
        if (items.length > 0) {
          await prisma.estimateItem.createMany({
            data: items.map((item) => ({
              estimateId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              taxRate: item.tax_rate || 0,
              amount: item.amount,
            })),
          });
        }
      }
    });

    const updated = await module.exports.getEstimateById(id, userId);
    return { status: true, data: updated };
  } catch (err) {
    console.error("Service Error (updateEstimate):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.deleteEstimate = async (id, userId) => {
  try {
    const existing = await db.estimate.findFirst({ where: { id, userId } });
    if (!existing) return { status: false, message: "Estimate not found or unauthorized" };

    await db.estimate.delete({ where: { id } });
    return { status: true, message: "Estimate deleted successfully" };
  } catch (err) {
    console.error("Service Error (deleteEstimate):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateEstimateStatus = async (id, status, userId) => {
  try {
    const allowedStatuses = ["draft", "sent", "accepted", "declined"];
    if (!allowedStatuses.includes(status)) return { status: false, message: "Invalid status value" };

    const existing = await db.estimate.findFirst({ where: { id, userId } });
    if (!existing) return { status: false, message: "Estimate not found or unauthorized" };

    await db.estimate.update({ where: { id }, data: { status } });
    return { status: true, message: "Status updated successfully" };
  } catch (err) {
    console.error("Service Error (updateEstimateStatus):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.convertEstimateToInvoice = async (id, userId) => {
  try {
    const estimate = await module.exports.getEstimateById(id, userId);
    if (!estimate) return { status: false, message: "Estimate not found" };

    const count = await db.invoice.count({ where: { userId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const result = await db.$transaction(async (prisma) => {
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          clientId: estimate.client_id,
          projectId: estimate.project_id,
          invoiceNo: invoiceNo,
          status: "pending",
          currency: estimate.currency,
          subtotal: estimate.subtotal,
          totalAmount: estimate.total_amount,
          balanceDue: estimate.total_amount,
          amountPaid: 0,
          issueDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // +15 days default
          notes: estimate.notes,
        },
      });

      if (estimate.items && estimate.items.length > 0) {
        await prisma.invoiceItem.createMany({
          data: estimate.items.map((item) => ({
            invoiceId: invoice.id,
            userId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price || item.unitPrice,
            taxRate: item.tax_rate || item.taxRate || 0,
            amount: item.amount,
          })),
        });
      }
      
      // Mark estimate as accepted
      await prisma.estimate.update({
        where: { id: estimate.id },
        data: { status: "accepted" },
      });

      return invoice;
    });

    return { status: true, message: "Estimate converted to invoice", data: result };
  } catch (err) {
    console.error("Service Error (convertEstimateToInvoice):", err);
    return { status: false, message: "Internal server error" };
  }
};
