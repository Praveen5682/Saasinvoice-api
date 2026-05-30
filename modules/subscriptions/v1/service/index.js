const db = require("../../../../config/db");

module.exports.getAllSubscriptions = async (userId) => {
  try {
    const subscriptions = await db.subscriptions.findMany({
      where: { user_id: userId },
      include: { client: { select: { name: true, email: true } } },
      orderBy: { created_at: "desc" },
    });

    return subscriptions.map((s) => ({
      ...s,
      client_name: s.client?.name || null,
      client_email: s.client?.email || null,
      client: undefined,
    }));
  } catch (err) {
    console.error("Service Error:", err);
    throw new Error("Failed to fetch subscriptions");
  }
};

module.exports.getSubscriptionById = async (id, userId) => {
  try {
    const s = await db.subscriptions.findFirst({
      where: { id, user_id: userId },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!s) return null;
    return { ...s, client_name: s.client?.name || null, client_email: s.client?.email || null, client: undefined };
  } catch (err) {
    console.error("Service Error:", err);
    throw new Error("Failed to fetch subscription");
  }
};

module.exports.createSubscription = async (data, userId) => {
  try {
    const created = await db.subscriptions.create({ data: { ...data, user_id: userId } });
    const newSub = await module.exports.getSubscriptionById(created.id, userId);
    return { status: true, data: newSub };
  } catch (err) {
    console.error("Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateSubscription = async (id, data, userId) => {
  try {
    const existing = await db.subscriptions.findFirst({ where: { id, user_id: userId } });
    if (!existing) return { status: false, message: "Subscription not found" };

    await db.subscriptions.update({ where: { id }, data });
    const updated = await module.exports.getSubscriptionById(id, userId);
    return { status: true, data: updated };
  } catch (err) {
    console.error("Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.deleteSubscription = async (id, userId) => {
  try {
    const existing = await db.subscriptions.findFirst({ where: { id, user_id: userId } });
    if (!existing) return { status: false, message: "Subscription not found" };

    await db.subscriptions.delete({ where: { id } });
    return { status: true, message: "Subscription deleted successfully" };
  } catch (err) {
    console.error("Service Error:", err);
    return { status: false, message: "Internal server error" };
  }
};
