import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;

// GET /api/users/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                labId: true,
                createdAt: true,
                department: { select: { name: true } },
                lab: { select: { name: true } }
            }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT /api/users/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Allow update if target user is self OR if user is ADMIN/DEAN
        const isSelf = session.user.id === id;
        const isAdmin = ["ADMIN", "DEAN"].includes(session.user.role);

        if (!isSelf && !isAdmin) {
            return NextResponse.json({ error: "Forbidden: You can only update your own profile" }, { status: 403 });
        }

        const body = await req.json();
        
        // Whitelist fields
        const { name, email, image, role, departmentId, password } = body;
        
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (image !== undefined) updateData.image = image;

        if (role !== undefined || departmentId !== undefined) {
            if (!isAdmin) {
                return NextResponse.json({ error: "Forbidden: Only ADMIN or DEAN can update role or departmentId" }, { status: 403 });
            }
            if (role !== undefined) updateData.role = role;
            if (departmentId !== undefined) updateData.departmentId = departmentId;
        }

        if (password) {
            updateData.password = await hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        const { password: _, ...rest } = user as any;
        return NextResponse.json(rest);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

// DELETE /api/users/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Don't allow deleting self
        if (id === session.user.id) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id },
            select: { role: true }
        });

        if (!userToDelete) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Authorization logic
        if (session.user.role === "DEAN") {
            // Dean can delete HOD, ADMIN, LAB_INCHARGE
            if (!["HOD", "ADMIN", "LAB_INCHARGE", "USER"].includes(userToDelete.role)) {
                return NextResponse.json({ error: "Unauthorized: Insufficient permissions to delete this role" }, { status: 403 });
            }
            await prisma.user.delete({ where: { id } });
        } else if (session.user.role === "HOD") {
            // HOD can delete Lab Incharges in their department
            if (userToDelete.role !== "LAB_INCHARGE") {
                return NextResponse.json({ error: "HODs can only delete Lab Incharge accounts" }, { status: 403 });
            }

            // Further check: verify department (doing a re-fetch to be safe with deptId)
            const targetUser = await prisma.user.findUnique({ where: { id }, select: { departmentId: true } });
            if (targetUser?.departmentId !== session.user.departmentId) {
                return NextResponse.json({ error: "Unauthorized: You can only delete users from your own department" }, { status: 403 });
            }
            await prisma.user.delete({ where: { id } });
        } else {
            return NextResponse.json({ error: "Unauthorized: You do not have permission to delete users" }, { status: 403 });
        }

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
