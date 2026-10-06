import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchDepartmentSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    description: z.string().optional(),
    hodId: z.string().optional(),
});

// PATCH /api/departments/[id] - Update department
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "DEAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, description, hodId } = patchDepartmentSchema.parse(body);

        const cleanHodId = hodId === "" ? null : hodId;

        // Get current department to check for HOD changes
        const currentDept = await prisma.department.findUnique({
            where: { id },
            select: { hodId: true }
        });

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                code,
                description,
                hodId: cleanHodId,
            },
        });

        // If HOD changed, update user records
        if (cleanHodId !== currentDept?.hodId) {
            // Remove department link from old HOD if they are no longer HOD of any department
            if (currentDept?.hodId) {
                // We could check if they manage another dept, but schema says hodId is unique in Department
                await prisma.user.update({
                    where: { id: currentDept.hodId },
                    data: { departmentId: null }
                });
            }

            // Link new HOD to this department
            if (cleanHodId) {
                await prisma.user.update({
                    where: { id: cleanHodId },
                    data: { departmentId: id }
                });
            }
        }

        return NextResponse.json(department);
    } catch (error: any) {
        logError("/api/departments/[id]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "Conflict: A department with this name or code already exists, or the selected HOD is already assigned." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
    }
}

// DELETE /api/departments/[id] - Delete department
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "DEAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const dept = await prisma.department.findUnique({
            where: { id },
        });

        if (!dept) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        // Dissociate users and clear HOD links
        await prisma.user.updateMany({
            where: { departmentId: id },
            data: { departmentId: null }
        });

        // Explicitly clear HOD from this department record first to satisfy 1:1 constraints
        await prisma.department.update({
            where: { id },
            data: { hodId: null }
        });

        // Auto-delete tickets and requests to clear constraints
        await prisma.ticket.deleteMany({
            where: { departmentId: id }
        });

        await prisma.request.deleteMany({
            where: { departmentId: id }
        });

        // Delete all assets so they return to the allocation pool
        await prisma.asset.deleteMany({
            where: { departmentId: id }
        });

        // Delete all labs associated with the department
        await prisma.lab.deleteMany({
            where: { departmentId: id }
        });

        // Finally delete the department
        await prisma.department.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Department decommissioned successfully. Assets returned to allocation pool." });
    } catch (error: any) {
        logError("/api/departments/[id]", error);
        return NextResponse.json({
            error: `Deactivation Critical Failure: ${error.message || "Unknown Database Error"}`
        }, { status: 500 });
    }
}
