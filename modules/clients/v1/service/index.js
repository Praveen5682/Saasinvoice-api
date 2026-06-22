// service/index.js
const prisma = require("../../../../config/db");

module.exports.getAllClients = async (userId) => {
  try {
    const clients = await prisma.$queryRaw`
      SELECT
        c.*,
        (SELECT SUM(i.total_amount) FROM invoices i
         WHERE i.client_id = c.id AND i.user_id = ${userId} AND i.status != 'draft') AS total_revenue,
        (SELECT SUM(i.amount_paid) FROM invoices i
         WHERE i.client_id = c.id AND i.user_id = ${userId} AND i.status != 'draft') AS total_paid
      FROM clients c
      WHERE c.user_id = ${userId}
      ORDER BY c.created_at DESC
    `;
    return clients;
  } catch (err) {
    console.error("Service Error (getAllClients):", err);
    throw new Error("Failed to fetch clients from database");
  }
};

module.exports.getClientById = async (id, userId) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNo: true,
            totalAmount: true,
            amountPaid: true,
            dueDate: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) return null;

    const invoices = (client.invoices || []).map((inv) => ({
      id: inv.id,
      invoice_no: inv.invoiceNo,
      total_amount: inv.totalAmount,
      amount_paid: inv.amountPaid,
      due_date: inv.dueDate,
      status: inv.status,
      date: inv.createdAt,
    }));

    const activeInvoices = invoices.filter((inv) => inv.status !== "draft");
    const total_revenue = activeInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const [paymentStats] = await prisma.$queryRaw`
      SELECT SUM(COALESCE(amount_paid, 0)) AS total_paid
      FROM invoices
      WHERE client_id = ${id} AND user_id = ${userId} AND status != 'draft'
    `;

    const total_paid = Number(paymentStats?.total_paid || 0);

    return {
      ...client,
      invoices,
      total_revenue,
      total_paid,
      balance_due: total_revenue - total_paid,
    };
  } catch (err) {
    console.error("Service Error (getClientById):", err);
    throw new Error("Failed to fetch client with invoices");
  }
};

module.exports.createClient = async (data, userId) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { email: data.businessEmail, userId: userId },
    });
    if (existing) {
      return { status: false, message: "Client with this email already exists." };
    }

    const newClient = await prisma.client.create({
      data: {
        userId: userId,
        name: data.businessName,
        email: data.businessEmail,
        phone: data.phoneNumber || null,
        clientType: data.category || null,
        companyProfession: data.companyProfession || null,
        gstin: data.gstin || null,
        address: data.billingDetails?.address || null,
        city: data.billingDetails?.city || null,
        state: data.billingDetails?.state || null,
        country: data.billingDetails?.country || null,
        zip: data.billingDetails?.zipCode || null,
        notes: data.additionalNotes || null,
      },
    });

    return { status: true, data: newClient };
  } catch (err) {
    console.error("Service Error (createClient):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateClient = async (id, data, userId) => {
  try {
    if (!id) throw new Error("Client ID is required");

    const clientExists = await prisma.client.findFirst({ where: { id, userId: userId } });
    if (!clientExists) throw new Error("Client not found or you are not authorized");

    if (data.businessEmail) {
      const emailExists = await prisma.client.findFirst({
        where: { email: data.businessEmail, userId: userId, NOT: { id } },
      });
      if (emailExists) {
        return { status: false, message: "Another client with this email already exists." };
      }
    }

    const updatePayload = {
      name: data.businessName,
      email: data.businessEmail,
      phone: data.phoneNumber,
      clientType: data.category,
      companyProfession: data.companyProfession,
      gstin: data.gstin,
      address: data.billingDetails?.address,
      city: data.billingDetails?.city,
      state: data.billingDetails?.state,
      country: data.billingDetails?.country,
      zip: data.billingDetails?.zipCode,
      notes: data.additionalNotes,
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) delete updatePayload[key];
    });

    if (Object.keys(updatePayload).length === 0) throw new Error("No fields to update");

    const updatedClient = await prisma.client.update({ where: { id }, data: updatePayload });
    return { status: true, data: updatedClient };
  } catch (err) {
    console.error("Service Error (updateClient):", err);
    throw err;
  }
};

module.exports.deleteClient = async (id, userId) => {
  try {
    const existing = await prisma.client.findFirst({ where: { id, userId: userId } });
    if (!existing) return { status: false, message: "Client not found." };

    await prisma.client.delete({ where: { id } });
    return { status: true, message: "Client deleted successfully." };
  } catch (err) {
    console.error("Service Error (deleteClient):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.toggleClientStatus = async (id, status, userId) => {
  try {
    const existing = await prisma.client.findFirst({ where: { id, userId: userId } });
    if (!existing) return { status: false, message: "Client not found or unauthorized" };

    await prisma.client.update({ where: { id }, data: { status: Number(status) } });
    return { status: true, message: "Client status updated successfully" };
  } catch (err) {
    console.error("Service Error (toggleClientStatus):", err);
    return { status: false, message: "Internal server error" };
  }
};
