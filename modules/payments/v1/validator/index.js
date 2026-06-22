const Joi = require("joi");

const createPaymentSchema = Joi.object({
  invoice_id: Joi.string().uuid().required().messages({
    "any.required": "Invoice ID is required.",
  }),
  amount: Joi.number().min(0.01).required().messages({
    "number.min": "Amount must be greater than 0.",
    "any.required": "Amount is required.",
  }),
  payment_method: Joi.string()
    .valid("upi", "card", "cash", "transfer", "UPI", "CARD", "CASH", "TRANSFER")
    .required()
    .messages({
      "any.required": "Payment method is required.",
    }),
  transaction_id: Joi.string().trim().optional().allow("", null),
  status: Joi.string()
    .valid("captured", "refunded", "failed")
    .default("captured"),
  payment_date: Joi.date().iso().required().messages({
    "any.required": "Payment date is required.",
  }),
  notes: Joi.string().trim().optional().allow("", null),
});

const updatePaymentSchema = Joi.object({
  invoice_id: Joi.string().uuid().optional().messages({
    "string.guid": "Invoice ID must be a valid UUID."
  }),
  amount: Joi.number().min(0.01).optional().messages({
    "number.min": "Amount must be greater than 0."
  }),
  payment_method: Joi.string()
    .valid("upi", "card", "cash", "transfer", "UPI", "CARD", "CASH", "TRANSFER")
    .required()
    .messages({
      "any.required": "Payment method is required.",
    }),
  transaction_id: Joi.string().trim().optional().allow("", null),
  status: Joi.string()
    .valid("captured", "refunded", "failed")
    .default("captured"),
  payment_date: Joi.date().iso().required().messages({
    "any.required": "Payment date is required.",
  }),
  notes: Joi.string().trim().optional().allow("", null),
});

module.exports = {
  createPaymentSchema,
  updatePaymentSchema,
};
