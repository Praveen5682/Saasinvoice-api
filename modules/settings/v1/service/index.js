const db = require("../../../../config/db");
const bcrypt = require("bcrypt");

module.exports.getSettings = async (userId) => {
  try {
    const user = await db.users.findFirst({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        company_name: true,
        gst_number: true,
        address: true,
        phone: true,
        company_logo: true,
      },
    });
    return { status: true, data: user };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateSettings = async (userId, data) => {
  try {
    await db.users.update({ where: { id: userId }, data });
    const updatedUser = await module.exports.getSettings(userId);
    return { status: true, data: updatedUser.data };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  try {
    const user = await db.users.findFirst({ where: { id: userId } });
    if (!user) return { status: false, message: "User not found" };

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return { status: false, message: "Incorrect current password" };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.users.update({ where: { id: userId }, data: { password: hashed } });

    return { status: true, message: "Password updated successfully" };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};
