const db = require("../../../../config/db");
const bcrypt = require("bcrypt");
const { sendOtpEmail } = require("../../../../utils/mailer");
const jwt = require("jsonwebtoken");

// 🔹 Generate & Send OTP
const issueOtp = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await db.email_otps.deleteMany({ where: { email } });

  await db.email_otps.create({
    data: {
      email,
      otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendOtpEmail(email, otp);
};

// 🔹 Register
module.exports.Registration = async ({ name, email, password }) => {
  try {
    const existing = await db.users.findFirst({ where: { email } });

    if (existing) {
      if (!existing.is_email_verified) {
        await issueOtp(email);
        return { status: true, message: "OTP sent again" };
      }
      return { status: false, message: "Email already registered" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "1",
        is_email_verified: false,
      },
    });

    await issueOtp(email);

    return { status: true, userId: result.id, message: "OTP sent" };
  } catch (err) {
    console.error(err);
    return { status: false, message: "Internal server error" };
  }
};

// 🔹 Verify OTP
module.exports.VerifyOtp = async ({ email, otp }) => {
  try {
    const user = await db.users.findFirst({ where: { email } });
    if (!user) return { status: false, message: "User not found" };

    if (user.is_email_verified)
      return { status: false, message: "Already verified" };

    const record = await db.email_otps.findFirst({ where: { email, otp } });
    if (!record) return { status: false, message: "Invalid OTP" };

    if (new Date() > new Date(record.expires_at))
      return { status: false, message: "OTP expired" };

    await db.users.updateMany({ where: { email }, data: { is_email_verified: true } });
    await db.email_otps.deleteMany({ where: { email } });

    return { status: true, message: "Email verified successfully" };
  } catch (err) {
    return { status: false, message: "Internal server error" };
  }
};

// 🔹 Login
module.exports.Login = async ({ email, password }) => {
  try {
    const user = await db.users.findFirst({ where: { email } });

    if (!user) {
      return { success: false, code: 401, message: "Invalid credentials" };
    }

    if (!user.is_email_verified) {
      return { success: false, code: 403, message: "Please verify your email first" };
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return { success: false, code: 401, message: "Invalid credentials" };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return {
      success: true,
      code: 200,
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  } catch (err) {
    console.error("Service Error:", err);
    return { success: false, code: 500, message: "Internal server error" };
  }
};

// 🔹 Resend OTP
module.exports.ResendOtp = async ({ email }) => {
  try {
    const user = await db.users.findFirst({ where: { email } });
    if (!user) return { status: false, message: "User not found" };
    if (user.is_email_verified) return { status: false, message: "Already verified" };

    await issueOtp(email);
    return { status: true, message: "OTP resent" };
  } catch (err) {
    return { status: false, message: "Internal server error" };
  }
};

// 🔹 Forgot Password
module.exports.ForgotPassword = async ({ email }) => {
  try {
    const user = await db.users.findFirst({ where: { email } });
    if (user && user.is_email_verified) {
      await issueOtp(email);
    }
    return { status: true, message: "If email exists, OTP sent" };
  } catch (err) {
    return { status: false, message: "Internal server error" };
  }
};

// 🔹 Reset Password
module.exports.ResetPassword = async ({ email, otp, newPassword }) => {
  try {
    const record = await db.email_otps.findFirst({ where: { email, otp } });
    if (!record) return { status: false, message: "Invalid OTP" };
    if (new Date() > new Date(record.expires_at))
      return { status: false, message: "OTP expired" };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.users.updateMany({ where: { email }, data: { password: hashed } });
    await db.email_otps.deleteMany({ where: { email } });

    return { status: true, message: "Password reset successful" };
  } catch (err) {
    return { status: false, message: "Internal server error" };
  }
};
