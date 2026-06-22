// validator/index.js
const Joi = require("joi");

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "Project name is required",
    "string.min": "Project name must be at least 2 characters",
    "string.max": "Project name cannot exceed 200 characters",
  }),

  clientId: Joi.string().trim().required().messages({
    "string.empty": "Client is required",
  }),

  description: Joi.string().trim().max(2000).allow("").optional(),

  status: Joi.string()
    .valid("active", "completed", "on_hold", "cancelled")
    .default("active")
    .optional(),

  startDate: Joi.date().iso().allow(null).optional(),

  endDate: Joi.date().iso().min(Joi.ref("startDate")).allow(null).optional().messages({
    "date.min": "End date must be after start date",
  }),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "Project name must be at least 2 characters",
  }),

  clientId: Joi.string().trim().optional(),

  description: Joi.string().trim().max(2000).allow("").optional(),

  status: Joi.string()
    .valid("active", "completed", "on_hold", "cancelled")
    .optional(),

  startDate: Joi.date().iso().allow(null).optional(),

  endDate: Joi.date().iso().allow(null).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
};
