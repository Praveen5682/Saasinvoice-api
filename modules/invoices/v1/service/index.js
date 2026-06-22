const db = require("../../../../config/db");

const parseJson = (val, fallback = null) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch (_) { return fallback; }
};

module.exports.getAllInvoices = async (userId) => {
  try {
    const invoices = await db.$queryRaw`
      SELECT
        invoices.id, invoices.invoice_no, invoices.client_id, invoices.status,
        invoices.total_amount, invoices.subtotal, invoices.issue_date, invoices.due_date,
        invoices.currency, invoices.created_at, invoices.updated_at, invoices.notes,
        invoices.amount_paid, invoices.balance_due, invoices.billing_address,
        invoices.shipping_address, invoices.client_gstin, invoices.client_pan,
        COALESCE(clients.name, invoices.client_name, invoices.billing_address::json->>'line1', 'Unknown Client') AS client_name,
        COALESCE(clients.email, invoices.client_email) AS client_email,
        COALESCE(clients.phone, invoices.client_phone) AS client_phone
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = ${userId}
      ORDER BY invoices.created_at DESC
    `;

    return invoices.map((inv) => ({
      ...inv,
      billing_address: parseJson(inv.billing_address),
      shipping_address: parseJson(inv.shipping_address),
    }));
  } catch (err) {
    console.error("Get All Invoices Error:", err);
    throw new Error("Failed to fetch invoices");
  }
};

module.exports.getInvoiceById = async (id, userId) => {
  try {
    let rows;
    if (userId) {
      rows = await db.$queryRaw`
        SELECT invoices.*,
          clients.name AS client_master_name, clients.email AS client_master_email,
          clients.phone AS client_master_phone, clients.address AS client_master_address,
          users.company_name AS user_company_name, users.company_logo AS user_company_logo,
          users.address AS user_company_address, users.phone AS user_company_phone,
          users.gst_number AS user_company_gstin
        FROM invoices
        LEFT JOIN clients ON invoices.client_id = clients.id
        LEFT JOIN users ON invoices.user_id = users.id
        WHERE invoices.id = ${id} AND invoices.user_id = ${userId}
      `;
    } else {
      rows = await db.$queryRaw`
        SELECT invoices.*,
          clients.name AS client_master_name, clients.email AS client_master_email,
          clients.phone AS client_master_phone, clients.address AS client_master_address,
          users.company_name AS user_company_name, users.company_logo AS user_company_logo,
          users.address AS user_company_address, users.phone AS user_company_phone,
          users.gst_number AS user_company_gstin
        FROM invoices
        LEFT JOIN clients ON invoices.client_id = clients.id
        LEFT JOIN users ON invoices.user_id = users.id
        WHERE invoices.id = ${id}
      `;
    }

    const invoice = rows[0];
    if (!invoice) return null;

    const items = await db.invoiceItem.findMany({ where: { invoiceId: id } });

    invoice.items = items;
    invoice.bank_details = parseJson(invoice.bank_details);
    invoice.signature = parseJson(invoice.signature);
    invoice.billing_address = parseJson(invoice.billing_address);
    invoice.shipping_address = parseJson(invoice.shipping_address);

    return invoice;
  } catch (err) {
    console.error("Get Invoice By Id Error:", err);
    throw new Error("Failed to fetch invoice");
  }
};

const prepareInvoiceData = (data, userId) => {
  const { items, client, bank_details, signature, ...invoiceData } = data;

  const prismaInvoiceData = {
    userId,
    clientId: invoiceData.client_id,
    projectId: invoiceData.project_id,
    invoiceNo: invoiceData.invoice_no,
    status: invoiceData.status,
    totalAmount: invoiceData.total_amount,
    subtotal: invoiceData.subtotal,
    amountPaid: invoiceData.amount_paid,
    balanceDue: invoiceData.balance_due,
    issueDate: invoiceData.issue_date,
    dueDate: invoiceData.due_date,
    notes: invoiceData.notes,
    currency: invoiceData.currency,
  };

  if (bank_details) prismaInvoiceData.bankDetails = JSON.stringify(bank_details);
  if (signature) prismaInvoiceData.signature = JSON.stringify(signature);

  if (client) {
    prismaInvoiceData.clientName = client.name || null;
    prismaInvoiceData.clientEmail = client.email || null;
    prismaInvoiceData.clientPhone = client.phone || null;
    prismaInvoiceData.clientGstin = client.gstin || null;
    prismaInvoiceData.clientPan = client.pan || null;
    prismaInvoiceData.clientWebsite = client.website || null;
    prismaInvoiceData.placeOfSupply = client.place_of_supply || null;
    if (client.billing_address) prismaInvoiceData.billingAddress = JSON.stringify(client.billing_address);
    if (client.shipping_address) prismaInvoiceData.shippingAddress = JSON.stringify(client.shipping_address);
  }

  return { invoiceData: prismaInvoiceData, items };
};

module.exports.createInvoice = async (data, userId) => {
  try {
    const existing = await db.invoice.findFirst({
      where: { invoiceNo: data.invoice_no, userId: userId },
    });
    if (existing) return { status: false, message: "Invoice number already exists" };

    const { invoiceData, items } = prepareInvoiceData(data, userId);

    const result = await db.$transaction(async (prisma) => {
      const newInvoice = await prisma.invoice.create({ data: invoiceData });
      if (items && items.length > 0) {
        await prisma.invoiceItem.createMany({
          data: items.map((item) => ({
            invoiceId: newInvoice.id,
            userId: userId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            taxRate: item.tax_rate || 0,
            amount: item.amount,
          })),
        });
      }
      return newInvoice;
    });

    const invoice = await module.exports.getInvoiceById(result.id, userId);
    return { status: true, data: invoice };
  } catch (err) {
    console.error("Create Invoice Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateInvoice = async (id, data, userId) => {
  try {
    const existingInvoice = await db.invoice.findFirst({ where: { id, userId: userId } });
    if (!existingInvoice) return { status: false, message: "Invoice not found or unauthorized" };

    if (data.invoice_no && data.invoice_no !== existingInvoice.invoice_no) {
      const duplicate = await db.invoice.findFirst({
        where: { invoiceNo: data.invoice_no, userId: userId, NOT: { id } },
      });
      if (duplicate) return { status: false, message: "Invoice number already exists" };
    }

    const { invoiceData, items } = prepareInvoiceData(data, userId);

    await db.$transaction(async (prisma) => {
      await prisma.invoice.update({ where: { id }, data: invoiceData });
      if (items !== undefined) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        if (items.length > 0) {
          await prisma.invoiceItem.createMany({
            data: items.map((item) => ({
              invoiceId: id,
              userId: userId,
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

    const updatedInvoice = await module.exports.getInvoiceById(id, userId);
    return { status: true, data: updatedInvoice };
  } catch (err) {
    console.error("Update Invoice Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.deleteInvoice = async (id, userId) => {
  try {
    const existing = await db.invoice.findFirst({ where: { id, userId: userId } });
    if (!existing) return { status: false, message: "Invoice not found or unauthorized" };

    await db.invoice.delete({ where: { id } });
    return { status: true, message: "Invoice deleted successfully" };
  } catch (err) {
    console.error("Delete Invoice Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateInvoiceStatus = async (id, status, userId) => {
  try {
    const allowedStatuses = ["paid", "pending", "overdue", "draft"];
    if (!allowedStatuses.includes(status)) return { status: false, message: "Invalid status value" };

    const existing = await db.invoice.findFirst({ where: { id, userId: userId } });
    if (!existing) return { status: false, message: "Invoice not found or unauthorized" };

    await db.invoice.update({ where: { id }, data: { status } });
    return { status: true, message: "Status updated successfully" };
  } catch (err) {
    console.error("Update Invoice Status Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.getPublicInvoice = async (id) => {
  try {
    const invoice = await module.exports.getInvoiceById(id, null);
    if (!invoice) return null;
    return invoice;
  } catch (err) {
    console.error("Get Public Invoice Error:", err);
    throw new Error("Failed to fetch invoice");
  }
};
