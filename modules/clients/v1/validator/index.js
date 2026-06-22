// validator/index.js
const Joi = require("joi");

const createClientSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(150).required().messages({
    "string.empty": "Business name is required",
    "string.min": "Business name must be at least 2 characters",
    "string.max": "Business name cannot exceed 150 characters",
  }),

  businessEmail: Joi.string().trim().email().required().messages({
    "string.empty": "Business email is required",
    "string.email": "Please provide a valid email address",
  }),

  phoneNumber: Joi.string().trim().pattern(/^[0-9+\s-]{10,15}$/).allow("").optional().messages({
    "string.pattern.base": "Please enter a valid phone number"
  }),
  category: Joi.string().trim().max(100).allow("").optional(),
  companyProfession: Joi.string().trim().max(100).allow("").optional(),
  gstin: Joi.string().trim().max(15).allow("").optional(),

  billingDetails: Joi.object({
    address: Joi.string().trim().max(500).allow("").optional(),
    city: Joi.string().trim().max(100).allow("").optional(),
    state: Joi.string().trim().max(100).allow("").optional(),
    country: Joi.string().trim().max(100).allow("").optional(),
    zipCode: Joi.string().trim().max(20).allow("").optional()
  }).optional(),

  additionalNotes: Joi.string().trim().max(1000).allow("").optional()
});

const updateClientSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(150).optional().messages({
    "string.min": "Business name must be at least 2 characters"
  }),
  businessEmail: Joi.string().trim().email().optional().messages({
    "string.email": "Please provide a valid email address"
  }),
  phoneNumber: Joi.string().trim().pattern(/^[0-9+\s-]{10,15}$/).allow("").optional(),
  category: Joi.string().trim().max(100).allow("").optional(),
  companyProfession: Joi.string().trim().max(100).allow("").optional(),
  gstin: Joi.string().trim().max(15).allow("").optional(),

  billingDetails: Joi.object({
    address: Joi.string().trim().max(500).allow("").optional(),
    city: Joi.string().trim().max(100).allow("").optional(),
    state: Joi.string().trim().max(100).allow("").optional(),
    country: Joi.string().trim().max(100).allow("").optional(),
    zipCode: Joi.string().trim().max(20).allow("").optional()
  }).optional(),

  additionalNotes: Joi.string().trim().max(1000).allow("").optional()
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

module.exports = {
  createClientSchema,
  updateClientSchema,
};
