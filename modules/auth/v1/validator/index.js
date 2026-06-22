const Joi = require("joi");

// 🔹 Signup
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Name is required.",
    "string.min": "Name must be at least 2 characters.",
    "string.max": "Name must not exceed 100 characters.",
    "any.required": "Name is required.",
  }),

  email: Joi.string().trim().email().lowercase().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email address.",
    "any.required": "Email is required.",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required.",
      "string.pattern.base": "Phone number must be exactly 10 digits.",
      "any.required": "Phone number is required.",
    }),

  password: Joi.string().min(6).max(50).required().messages({
    "string.empty": "Password is required.",
    "string.min": "Password must be at least 6 characters.",
    "string.max": "Password must not exceed 50 characters.",
    "any.required": "Password is required.",
  }),

  companyName: Joi.string().trim().max(200).optional().allow("").messages({
    "string.max": "Company name must not exceed 200 characters.",
  }),
});

// 🔹 Login
const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email address.",
    "any.required": "Email is required.",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required.",
    "any.required": "Password is required.",
  }),
});

// 🔹 Verify OTP
const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email.",
    "any.required": "Email is required.",
  }),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "OTP is required.",
      "string.length": "OTP must be exactly 6 digits.",
      "string.pattern.base": "OTP must contain only numbers.",
      "any.required": "OTP is required.",
    }),
});

// 🔹 Resend OTP
const resendOtpSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email.",
    "any.required": "Email is required.",
  }),
});

// ✅ 🔹 Forgot Password (ADD THIS)
const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email.",
    "any.required": "Email is required.",
  }),
});

// ✅ 🔹 Reset Password (ADD THIS)
const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email.",
    "any.required": "Email is required.",
  }),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.empty": "OTP is required.",
      "string.length": "OTP must be exactly 6 digits.",
      "string.pattern.base": "OTP must contain only numbers.",
      "any.required": "OTP is required.",
    }),

  newPassword: Joi.string().min(6).max(50).required().messages({
    "string.empty": "New password is required.",
    "string.min": "Password must be at least 6 characters.",
    "string.max": "Password must not exceed 50 characters.",
    "any.required": "New password is required.",
  }),
});

// 🔥 EXPORT EVERYTHING
module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
