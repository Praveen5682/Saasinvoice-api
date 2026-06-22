// service/index.js
const prisma = require("../../../../config/db");

module.exports.getAllProjects = async (userId) => {
  try {
    const projects = await prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        p.client_id,
        c.name AS client_name,
        c.email AS client_email,
        (SELECT COUNT(*)::int FROM invoices i WHERE i.project_id = p.id) AS invoice_count
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.org_id IN (
        SELECT org_id FROM users WHERE id = ${userId}
      )
      OR p.client_id IN (
        SELECT id FROM clients WHERE user_id = ${userId}
      )
      ORDER BY p.created_at DESC
    `;
    return projects;
  } catch (err) {
    console.error("Service Error (getAllProjects):", err);
    throw new Error("Failed to fetch projects from database");
  }
};

module.exports.getProjectById = async (id, userId) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          {
            organization: {
              users: { some: { id: userId } },
            },
          },
          {
            client: { userId },
          },
        ],
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        invoices: {
          select: {
            id: true,
            invoiceNo: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        estimates: {
          select: {
            id: true,
            estimateNo: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) return null;
    return project;
  } catch (err) {
    console.error("Service Error (getProjectById):", err);
    throw new Error("Failed to fetch project");
  }
};

module.exports.createProject = async (data, userId) => {
  try {
    // Verify the client belongs to this user
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, userId },
    });

    if (!client) {
      return { status: false, message: "Client not found or unauthorized" };
    }

    // Get user orgId if available
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { orgId: true },
    });

    const newProject = await prisma.project.create({
      data: {
        orgId: user?.orgId || null,
        clientId: data.clientId,
        name: data.name,
        description: data.description || null,
        status: data.status || "active",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });

    return { status: true, data: newProject };
  } catch (err) {
    console.error("Service Error (createProject):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateProject = async (id, data, userId) => {
  try {
    if (!id) throw new Error("Project ID is required");

    // Verify project belongs to user's clients
    const existing = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { client: { userId } },
          { organization: { users: { some: { id: userId } } } },
        ],
      },
    });

    if (!existing) {
      throw new Error("Project not found or you are not authorized");
    }

    // If clientId is being changed, verify new client belongs to user
    if (data.clientId && data.clientId !== existing.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, userId },
      });
      if (!client) {
        return { status: false, message: "Client not found or unauthorized" };
      }
    }

    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.clientId !== undefined) updatePayload.clientId = data.clientId;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.startDate !== undefined) updatePayload.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updatePayload.endDate = data.endDate ? new Date(data.endDate) : null;

    if (Object.keys(updatePayload).length === 0) {
      throw new Error("No fields to update");
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updatePayload,
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });

    return { status: true, data: updatedProject };
  } catch (err) {
    console.error("Service Error (updateProject):", err);
    throw err;
  }
};

module.exports.deleteProject = async (id, userId) => {
  try {
    const existing = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { client: { userId } },
          { organization: { users: { some: { id: userId } } } },
        ],
      },
    });

    if (!existing) {
      return { status: false, message: "Project not found or unauthorized" };
    }

    await prisma.project.delete({ where: { id } });
    return { status: true, message: "Project deleted successfully" };
  } catch (err) {
    console.error("Service Error (deleteProject):", err);
    return { status: false, message: "Internal server error" };
  }
};

module.exports.updateProjectStatus = async (id, status, userId) => {
  try {
    const existing = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { client: { userId } },
          { organization: { users: { some: { id: userId } } } },
        ],
      },
    });

    if (!existing) {
      return { status: false, message: "Project not found or unauthorized" };
    }

    await prisma.project.update({ where: { id }, data: { status } });
    return { status: true, message: "Project status updated successfully" };
  } catch (err) {
    console.error("Service Error (updateProjectStatus):", err);
    return { status: false, message: "Internal server error" };
  }
};
