const service = require("../service/index");
const {
  createPaymentSchema,
  updatePaymentSchema,
} = require("../validator/index");

module.exports.getAllPayments = async (req, res) => {
  try {
    const payments = await service.getAllPayments(req.user.id);
    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error("Payment Controller Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch payments." });
  }
};

module.exports.getPaymentById = async (req, res) => {
  try {
    const payment = await service.getPaymentById(req.params.id, req.user.id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }
    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    console.error("Payment Controller Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch payment." });
  }
};

module.exports.createPayment = async (req, res) => {
  try {
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const response = await service.createPayment(value, req.user.id);
    if (!response.status) {
      return res
        .status(400)
        .json({ success: false, message: response.message });
    }

    return res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      data: response.data,
    });
  } catch (err) {
    console.error("Payment Controller Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create payment." });
  }
};

module.exports.updatePayment = async (req, res) => {
  try {
    const { error, value } = updatePaymentSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const response = await service.updatePayment(req.params.id, value, req.user.id);
    if (!response.status) {
      return res
        .status(400)
        .json({ success: false, message: response.message });
    }

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully.",
      data: response.data,
    });
  } catch (err) {
    console.error("Payment Controller Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update payment." });
  }
};

module.exports.deletePayment = async (req, res) => {
  try {
    const response = await service.deletePayment(req.params.id, req.user.id);
    if (!response.status) {
      return res
        .status(400)
        .json({ success: false, message: response.message });
    }

    return res.status(200).json({
      success: true,
      message: "Payment deleted successfully.",
    });
  } catch (err) {
    console.error("Payment Controller Error (delete):", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete payment." });
  }
};

const razorpayService = require("../service/razorpay");

module.exports.createRazorpayOrder = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ success: false, message: "Invoice ID is required" });
    }

    const order = await razorpayService.createOrder(invoiceId);
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    console.error("Razorpay Controller Error (createOrder):", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create Razorpay order" });
  }
};

module.exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, amount } = req.body;
    
    // 1. Verify Signature
    await razorpayService.verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    // 2. Record Payment in DB
    const paymentRecord = {
      invoice_id: invoiceId,
      amount: amount,
      method: "online",
      status: "captured",
      transaction_id: razorpay_payment_id,
      payment_date: new Date(),
    };

    // Note: If this is a public route, req.user might be undefined. 
    // We should find the owner of the invoice.
    const invoice = await require("../../../../config/db")("invoices").where({ id: invoiceId }).first();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    const response = await service.createPayment(paymentRecord, invoice.user_id);
    
    return res.status(200).json({ success: true, message: "Payment verified and recorded", data: response.data });
  } catch (err) {
    console.error("Razorpay Controller Error (verify):", err);
    return res.status(400).json({ success: false, message: err.message || "Payment verification failed" });
  }
};
