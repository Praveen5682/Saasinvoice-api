const prisma = require("../config/db");
const {
  PLAN_LIMITS,
  PLAN_FEATURES,
  RESOURCE_MODEL_MAP,
} = require("../config/limits");

const DEFAULT_PLAN = "free";

function getPlanKey(planType) {
  if (!planType) return DEFAULT_PLAN;
  const key = planType.toLowerCase();
  return PLAN_LIMITS[key] ? key : DEFAULT_PLAN;
}

async function getUserPlan(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true, planExpiry: true },
  });

  if (!user) throw new Error("User not found");

  if (user.planExpiry && new Date(user.planExpiry) < new Date()) {
    return DEFAULT_PLAN; // expired paid plan -> treat as free
  }

  return getPlanKey(user.planType);
}

module.exports.enforceLimit = (resource) => async (req, res, next) => {
  try {
    const plan = await getUserPlan(req.user.id);
    const limit = PLAN_LIMITS[plan]?.[resource];

    if (limit === null || limit === undefined) return next(); // unlimited

    const modelName = RESOURCE_MODEL_MAP[resource];
    const current = await prisma[modelName].count({
      where: { userId: req.user.id },
    });

    if (current >= limit) {
      return res.status(403).json({
        success: false,
        message: `You've reached the ${limit} ${resource} limit on the ${plan} plan. Please upgrade to add more.`,
        data: { resource, plan, limit, current },
      });
    }

    next();
  } catch (err) {
    console.error(`Plan Middleware Error (enforceLimit - ${resource}):`, err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify plan limits." });
  }
};

module.exports.enforceFeature = (feature) => async (req, res, next) => {
  try {
    const plan = await getUserPlan(req.user.id);
    const allowed = Boolean(PLAN_FEATURES[plan]?.[feature]);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `This feature isn't available on the ${plan} plan. Please upgrade to unlock it.`,
        data: { feature, plan },
      });
    }

    next();
  } catch (err) {
    console.error(`Plan Middleware Error (enforceFeature - ${feature}):`, err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify plan features." });
  }
};
