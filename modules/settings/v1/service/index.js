const db = require("../../../../config/db");
const bcrypt = require("bcrypt");

module.exports.getSettings = async (userId) => {
  try {
    const user = await db.user.findFirst({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        companyName: true,
        gstNumber: true,
        address: true,
        phone: true,
        companyLogo: true,
      },
    });
    if (!user) return { status: false, message: "User not found" };
    return {
      status: true,
      data: {
        name: user.name,
        email: user.email,
        company_name: user.companyName,
        gst_number: user.gstNumber,
        address: user.address,
        phone: user.phone,
        company_logo: user.companyLogo,
      },
    };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateSettings = async (userId, data) => {
  try {
    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.company_name !== undefined) updatePayload.companyName = data.company_name;
    if (data.gst_number !== undefined) updatePayload.gstNumber = data.gst_number;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.company_logo !== undefined) updatePayload.companyLogo = data.company_logo;

    await db.user.update({ where: { id: userId }, data: updatePayload });
    const updatedUser = await module.exports.getSettings(userId);
    return { status: true, data: updatedUser.data };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  try {
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) return { status: false, message: "User not found" };

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return { status: false, message: "Incorrect current password" };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: userId }, data: { password: hashed } });

    return { status: true, message: "Password updated successfully" };
  } catch (err) {
    console.error("Settings Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};
