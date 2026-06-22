const service = require("../service/index");
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validator/index");

// 🔹 Register
module.exports.register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.Registration(value);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: response.message,
      userId: response.userId || null,
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// 🔹 Verify OTP
module.exports.verifyOtp = async (req, res) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.VerifyOtp(value);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

// 🔹 Login
module.exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.Login(value);

    return res.status(response.code).json({
      success: response.success,
      message: response.message,
      token: response.token || null,
      user: response.user || null,
    });
  } catch (err) {
    console.error("Controller Error:", err);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// 🔹 Resend OTP
module.exports.resendOtp = async (req, res) => {
  try {
    const { error, value } = resendOtpSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.ResendOtp(value);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// 🔹 Forgot Password
module.exports.forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.ForgotPassword(value);

    return res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// 🔹 Reset Password
module.exports.resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const response = await service.ResetPassword(value);

    if (!response.status) {
      return res.status(400).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};
module.exports.getMe = async (req, res) => {
  try {
    const prisma = require("../../../../config/db");
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Don't send password
    const { password, ...safeUser } = user;

    return res.status(200).json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Get Me Controller Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
