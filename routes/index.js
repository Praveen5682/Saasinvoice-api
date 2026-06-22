const express = require("express");

const router = express.Router();

// Register module routers
const clientRoutes = require("../modules/clients/v1/router/index");
const invoiceRoutes = require("../modules/invoices/v1/router/index");
const reminderRoutes = require("../modules/reminders/v1/router/index");
const authRoutes = require("../modules/auth/v1/router/index");
const dashboardRoutes = require("../modules/dashboard/v1/router/index");
const paymentRoutes = require("../modules/payments/v1/router/index");
const subscriptionRoutes = require("../modules/subscriptions/v1/router/index");
const locationRoutes = require("../modules/locations/v1/router/index");
const productRoutes = require("../modules/products/v1/router/index");
const settingsRoutes = require("../modules/settings/v1/router/index");
const projectRoutes = require("../modules/projects/v1/router/index");
const estimateRoutes = require("../modules/estimates/v1/router/index");
const reportRoutes = require("../modules/reports/v1/router/index");
// const billingRoutes = require("../modules/billing/v1/router/index");

router.use("/clients", clientRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/reminders", reminderRoutes);
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/locations", locationRoutes);
router.use("/products", productRoutes);
router.use("/settings", settingsRoutes);
router.use("/projects", projectRoutes);
router.use("/estimates", estimateRoutes);
router.use("/reports", reportRoutes);
// router.use("/billing", billingRoutes);

module.exports = router;
