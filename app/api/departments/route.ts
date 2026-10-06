import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createDepartmentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required"),
    description: z.string().optional(),
    hodId: z.string().optional(),
});

// GET /api/departments - Get all departments
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const departments = await prisma.department.findMany({
            include: {
                hod: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                labs: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                _count: {
                    select: {
                        assets: true,
                        users: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(departments);
    } catch (error) {
        logError("/api/departments", error);
        return NextResponse.json(
            { error: "Failed to fetch departments" },
            { status: 500 }
        );
    }
}

// POST /api/departments - Create a new department
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "DEAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, description, hodId } = createDepartmentSchema.parse(body);

        // Clean up hodId - if empty string, make it null
        const cleanHodId = hodId && hodId !== "" ? hodId : null;

        const department = await prisma.department.create({
            data: {
                name,
                code,
                description,
                hodId: cleanHodId,
            },
            include: {
                hod: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // If an HOD was assigned, update their user record to be in this department
        if (cleanHodId) {
            await prisma.user.update({
                where: { id: cleanHodId },
                data: { departmentId: department.id }
            });
        }

        return NextResponse.json(department, { status: 201 });
    } catch (error: any) {
        logError("/api/departments", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            const target = error.meta?.target || "Field";
            return NextResponse.json(
                { error: `Conflict: A department with this ${target} already exists, or the selected HOD is already assigned to another department.` },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Failed to create department" },
            { status: 500 }
        );
    }
}
