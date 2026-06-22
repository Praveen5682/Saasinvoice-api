// Single source of truth for plan limits/features. Tweak numbers here only.

const PLAN_LIMITS = {
  free: {
    clients: 5,
    projects: 3,
    estimates: 10,
    invoices: 10,
  },
  pro: {
    clients: null, // null = unlimited
    projects: null,
    estimates: null,
    invoices: null,
  },
};

const PLAN_FEATURES = {
  free: {
    reports: false,
    customBranding: false,
  },
  pro: {
    reports: true,
    customBranding: true,
  },
};

// Maps the "resource" name used in routes to the actual Prisma model name
const RESOURCE_MODEL_MAP = {
  clients: "client",
  projects: "project",
  estimates: "estimate",
  invoices: "invoice",
};

module.exports = { PLAN_LIMITS, PLAN_FEATURES, RESOURCE_MODEL_MAP };
