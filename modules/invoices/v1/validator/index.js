const Joi = require("joi");

const invoiceItemSchema = Joi.object({
  description: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).required(),
  unit_price: Joi.number().min(0).required(),
  tax_rate: Joi.number().min(0).max(100).default(0),
  amount: Joi.number().min(0).required(),
}).custom((value, helpers) => {
  const base = value.quantity * value.unit_price;
  const expected = base + (base * (value.tax_rate / 100));
  if (Math.abs(value.amount - expected) > 0.01) {
    return helpers.error("any.invalid", {
      message: "Amount must equal (quantity × unit_price) + tax",
    });
  }
  return value;
});

const createInvoiceSchema = Joi.object({
  invoice_no: Joi.string().trim().required(),

  // ✅ FIX: client_id is optional — user may type a new client without selecting from registry
  client_id: Joi.string().uuid().optional().allow(null, ""),

  status: Joi.string()
    .valid("paid", "pending", "overdue", "draft")
    .default("pending"),

  // Always INR — kept open string for DB column compatibility, no strict enum
  currency: Joi.string().default("INR"),

  subtotal: Joi.number().min(0).required(),
  discount_type: Joi.string().valid("pct", "flat").default("pct"),
  discount_value: Joi.number().min(0).default(0),

  shipping_charge: Joi.number().min(0).default(0),

  gst_rate: Joi.number().min(0).max(100).default(0),
  gst_amount: Joi.number().min(0).default(0),

  tds_rate: Joi.number().min(0).max(100).default(0),
  tds_amount: Joi.number().min(0).default(0),

  total_amount: Joi.number().min(0).required(),

  amount_paid: Joi.number().min(0).default(0),

  // ✅ FIX: removed .min(0) — balance_due can be negative when overpaid
  balance_due: Joi.number().required(),

  issue_date: Joi.date().iso().required(),
  due_date: Joi.date().iso().allow(null, ""),

  payment_terms: Joi.string().allow(null, ""),

  notes: Joi.string().allow(null, ""),
  terms: Joi.string().allow(null, ""),

  // ==================== OPTIONAL FIELDS ====================
  client: Joi.object({
    name: Joi.string().allow("", null),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .allow("", null),
    phone: Joi.string().allow("", null),
    website: Joi.string().allow("", null),
    gstin: Joi.string().allow("", null),
    pan: Joi.string().allow("", null),
    place_of_supply: Joi.string().allow("", null),
    billing_address: Joi.object({
      line1: Joi.string().allow("", null),
      line2: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      pincode: Joi.string().allow("", null),
      country: Joi.string().allow("", null),
    }).optional(),
    shipping_address: Joi.object({
      line1: Joi.string().allow("", null),
      line2: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      pincode: Joi.string().allow("", null),
      country: Joi.string().allow("", null),
    }).optional(),
  }).optional(),

  bank_details: Joi.object({
    bank_name: Joi.string().allow("", null),
    account_holder: Joi.string().allow("", null),
    account_number: Joi.string().allow("", null),
    ifsc: Joi.string().allow("", null),
    upi_id: Joi.string().allow("", null),
    payment_mode: Joi.string().allow("", null),
  }).optional(),

  signature: Joi.object({
    authorized_by: Joi.string().allow("", null),
    designation: Joi.string().allow("", null),
  }).optional(),

  items: Joi.array().items(invoiceItemSchema).min(1).required(),
});

const updateInvoiceSchema = Joi.object({
  invoice_no: Joi.string().trim().optional(),
  client_id: Joi.string().uuid().optional().allow(null, ""),
  status: Joi.string().valid("paid", "pending", "overdue", "draft").optional(),
  currency: Joi.string().optional(),
  subtotal: Joi.number().min(0).optional(),
  discount_type: Joi.string().valid("pct", "flat").optional(),
  discount_value: Joi.number().min(0).optional(),
  shipping_charge: Joi.number().min(0).optional(),
  gst_rate: Joi.number().min(0).max(100).optional(),
  gst_amount: Joi.number().min(0).optional(),
  tds_rate: Joi.number().min(0).max(100).optional(),
  tds_amount: Joi.number().min(0).optional(),
  total_amount: Joi.number().min(0).optional(),
  amount_paid: Joi.number().min(0).optional(),
  // ✅ FIX: balance_due can be negative when overpaid
  balance_due: Joi.number().optional(),
  issue_date: Joi.date().iso().optional(),
  due_date: Joi.date().iso().allow(null, "").optional(),
  payment_terms: Joi.string().allow(null, "").optional(),
  notes: Joi.string().allow(null, "").optional(),
  terms: Joi.string().allow(null, "").optional(),
  client: Joi.object({
    name: Joi.string().allow("", null),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .allow("", null),
    phone: Joi.string().allow("", null),
    website: Joi.string().allow("", null),
    gstin: Joi.string().allow("", null),
    pan: Joi.string().allow("", null),
    place_of_supply: Joi.string().allow("", null),
    billing_address: Joi.object({
      line1: Joi.string().allow("", null),
      line2: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      pincode: Joi.string().allow("", null),
      country: Joi.string().allow("", null),
    }).optional(),
    shipping_address: Joi.object({
      line1: Joi.string().allow("", null),
      line2: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      pincode: Joi.string().allow("", null),
      country: Joi.string().allow("", null),
    }).optional(),
  }).optional(),
  bank_details: Joi.object({
    bank_name: Joi.string().allow("", null),
    account_holder: Joi.string().allow("", null),
    account_number: Joi.string().allow("", null),
    ifsc: Joi.string().allow("", null),
    upi_id: Joi.string().allow("", null),
    payment_mode: Joi.string().allow("", null),
  }).optional(),
  signature: Joi.object({
    authorized_by: Joi.string().allow("", null),
    designation: Joi.string().allow("", null),
  }).optional(),
  items: Joi.array().items(invoiceItemSchema).min(1).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update.",
  });

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
};
