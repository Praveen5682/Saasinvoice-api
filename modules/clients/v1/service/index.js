// service/index.js
const db = require("../../../../config/db");

module.exports.getAllClients = async (userId) => {
  try {
    const clients = await db.$queryRaw`
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
    const client = await db.clients.findFirst({
      where: { id, user_id: userId },
      include: {
        invoices: {
          select: {
            id: true,
            invoice_no: true,
            total_amount: true,
            amount_paid: true,
            due_date: true,
            status: true,
            created_at: true,
          },
        },
      },
    });

    if (!client) return null;

    const invoices = (client.invoices || []).map((inv) => ({
      id: inv.id,
      invoice_no: inv.invoice_no,
      total_amount: inv.total_amount,
      amount_paid: inv.amount_paid,
      due_date: inv.due_date,
      status: inv.status,
      date: inv.created_at,
    }));

    const activeInvoices = invoices.filter((inv) => inv.status !== "draft");
    const total_revenue = activeInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const [paymentStats] = await db.$queryRaw`
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
    const existing = await db.clients.findFirst({
      where: { email: data.email, user_id: userId },
    });
    if (existing) {
      return { status: false, message: "Client with this email already exists." };
    }

    const newClient = await db.clients.create({
      data: {
        user_id: userId,
        name: data.name,
        client_type: data.clientType,
        contact_person: data.contactPerson || null,
        email: data.email,
        phone: data.phone || null,
        gstin: data.gstin || null,
        pan: data.pan || null,
        place_of_supply: data.placeOfSupply || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        payment_terms: data.paymentTerms,
        notes: data.notes || null,
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

    const clientExists = await db.clients.findFirst({ where: { id, user_id: userId } });
    if (!clientExists) throw new Error("Client not found or you are not authorized");

    if (data.email) {
      const emailExists = await db.clients.findFirst({
        where: { email: data.email, user_id: userId, NOT: { id } },
      });
      if (emailExists) {
        return { status: false, message: "Another client with this email already exists." };
      }
    }

    const updatePayload = {
      name: data.name,
      client_type: data.clientType,
      contact_person: data.contactPerson,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin,
      pan: data.pan,
      place_of_supply: data.placeOfSupply,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      payment_terms: data.paymentTerms,
      notes: data.notes,
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) delete updatePayload[key];
    });

    if (Object.keys(updatePayload).length === 0) throw new Error("No fields to update");

    const updatedClient = await db.clients.update({ where: { id }, data: updatePayload });
    return { status: true, data: updatedClient };
  } catch (err) {
    console.error("Service Error (updateClient):", err);
    throw err;
  }
};

module.exports.deleteClient = async (id, userId) => {
  try {
    const existing = await db.clients.findFirst({ where: { id, user_id: userId } });
    if (!existing) return { status: false, message: "Client not found." };

    await db.clients.delete({ where: { id } });
    return { status: true, message: "Client deleted successfully." };
  } catch (err) {
    console.error("Service Error (deleteClient):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.toggleClientStatus = async (id, status, userId) => {
  try {
    const existing = await db.clients.findFirst({ where: { id, user_id: userId } });
    if (!existing) return { status: false, message: "Client not found or unauthorized" };

    await db.clients.update({ where: { id }, data: { status: Number(status) } });
    return { status: true, message: "Client status updated successfully" };
  } catch (err) {
    console.error("Service Error (toggleClientStatus):", err);
    return { status: false, message: "Internal server error" };
  }
};
