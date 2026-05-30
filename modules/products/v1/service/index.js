const db = require("../../../../config/db");

module.exports.createProduct = async (data, userId) => {
  try {
    const existing = await db.products.findFirst({
      where: { name: data.name, user_id: userId },
    });
    if (existing) throw new Error("A product with this name already exists");

    const product = await db.products.create({
      data: {
        user_id: userId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        category: data.category || null,
        type: data.type || "service",
        status: data.status ?? 1,
      },
    });
    return product;
  } catch (err) {
    console.error("Service Error (createProduct):", err);
    throw err;
  }
};

module.exports.getProducts = async (userId) => {
  try {
    return await db.products.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  } catch (err) {
    console.error("Service Error (getProducts):", err);
    throw new Error("Failed to fetch products");
  }
};

module.exports.getProductById = async (id, userId) => {
  try {
    const product = await db.products.findFirst({ where: { id, user_id: userId } });
    if (!product) throw new Error("Product not found or unauthorized");
    return product;
  } catch (err) {
    console.error("Service Error (getProductById):", err);
    throw err;
  }
};

module.exports.updateProduct = async (id, data, userId) => {
  try {
    if (!id) throw new Error("Product ID is required");

    const existing = await db.products.findFirst({ where: { id, user_id: userId } });
    if (!existing) throw new Error("Product not found or unauthorized");

    const updated = await db.products.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        type: data.type,
        status: data.status,
      },
    });
    return updated;
  } catch (err) {
    console.error("Service Error (updateProduct):", err);
    throw err;
  }
};

module.exports.deleteProduct = async (id, userId) => {
  try {
    const existing = await db.products.findFirst({ where: { id, user_id: userId } });
    if (!existing) throw new Error("Product not found or unauthorized");

    await db.products.delete({ where: { id } });
    return true;
  } catch (err) {
    console.error("Service Error (deleteProduct):", err);
    throw err;
  }
};

module.exports.toggleStatus = async (id, status, userId) => {
  try {
    const existing = await db.products.findFirst({ where: { id, user_id: userId } });
    if (!existing) throw new Error("Product not found or unauthorized");

    await db.products.update({ where: { id }, data: { status: Number(status) } });
    return true;
  } catch (err) {
    console.error("Service Error (toggleStatus):", err);
    throw err;
  }
};
