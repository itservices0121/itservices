import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;
import { z } from "zod";

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["USER", "HOD", "LAB_INCHARGE", "ADMIN", "DEAN"], { error: "Invalid role" }),
    departmentId: z.string().optional(),
    labId: z.string().optional(),
});

// GET /api/users - List users
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN", "HOD"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        const deptId = searchParams.get("deptId");

        const where: any = {};
        if (role) where.role = role;
        if (deptId) {
            where.departmentId = deptId;
        } else if (session.user.role === "HOD") {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            if (user?.departmentId) where.departmentId = user.departmentId;
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                labId: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(users);
    } catch (error) {
        logError("/api/users", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/users - Create user
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role, departmentId, labId } = createUserSchema.parse(body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                departmentId,
                labId
            }
        });

        const { password: _, ...rest } = user;
        return NextResponse.json(rest, { status: 201 });
    } catch (error: any) {
        logError("/api/users", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
