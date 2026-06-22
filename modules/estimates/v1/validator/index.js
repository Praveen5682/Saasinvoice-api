const Joi = require("joi");

const estimateItemSchema = Joi.object({
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

const createEstimateSchema = Joi.object({
  estimate_no: Joi.string().trim().required(),
  client_id: Joi.string().uuid().required(),
  project_id: Joi.string().uuid().optional().allow(null, ""),

  status: Joi.string()
    .valid("draft", "sent", "accepted", "declined")
    .default("draft"),

  currency: Joi.string().default("INR"),

  subtotal: Joi.number().min(0).required(),
  total_amount: Joi.number().min(0).required(),

  issue_date: Joi.date().iso().required(),
  expiry_date: Joi.date().iso().allow(null, ""),

  notes: Joi.string().allow(null, ""),

  items: Joi.array().items(estimateItemSchema).min(1).required(),
});

const updateEstimateSchema = Joi.object({
  estimate_no: Joi.string().trim().optional(),
  client_id: Joi.string().uuid().optional().allow(null),
  project_id: Joi.string().uuid().optional().allow(null, ""),
  status: Joi.string().valid("draft", "sent", "accepted", "declined").optional(),
  currency: Joi.string().optional(),
  subtotal: Joi.number().min(0).optional(),
  total_amount: Joi.number().min(0).optional(),
  issue_date: Joi.date().iso().optional(),
  expiry_date: Joi.date().iso().allow(null, "").optional(),
  notes: Joi.string().allow(null, "").optional(),
  items: Joi.array().items(estimateItemSchema).min(1).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update.",
  });

module.exports = {
  createEstimateSchema,
  updateEstimateSchema,
};
