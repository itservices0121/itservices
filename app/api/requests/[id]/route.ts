import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logError } from "@/lib/logger";
import { z } from "zod";

const patchRequestSchema = z.object({
    status: z.string().optional(),
    remarks: z.string().optional(),
    assignedAdminId: z.string().optional(),
    labCode: z.string().optional(),
    labCapacity: z.union([z.string(), z.number()]).optional(),
    labLocation: z.string().optional(),
});

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== "DEAN" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        patchRequestSchema.parse(body);
        const { status, remarks, assignedAdminId } = body;

        const updateData: any = {
            status,
            remarks,
        };

        if (session.user.role === "DEAN") {
            updateData.approvedById = session.user.id;
            updateData.approvedAt = new Date();
        }

        if (session.user.role === "ADMIN") {
            if (status === "COMPLETED") {
                updateData.completedAt = new Date();
            }
        }

        if (assignedAdminId) {
            updateData.assignedAdminId = assignedAdminId;
        }

        const currentRequest = await prisma.request.findUnique({
            where: { id },
            select: { type: true, createdById: true }
        });

        const request = await prisma.request.update({
            where: { id },
            data: updateData,
            include: {
                department: {
                    select: { name: true },
                },
                createdBy: {
                    select: { name: true, email: true },
                },
            },
        });

        // If this was an account approval request, update user status
        if (currentRequest?.type === "ACCOUNT_APPROVAL") {
            let newUserStatus: "ACTIVE" | "PENDING" | "REJECTED" = "PENDING";
            if (status === "APPROVED" || status === "COMPLETED") {
                newUserStatus = "ACTIVE";
            } else if (status === "DECLINED") {
                newUserStatus = "REJECTED";
            } else {
                newUserStatus = "PENDING";
            }

            await prisma.user.update({
                where: { id: currentRequest.createdById },
                data: { status: newUserStatus }
            });
        }

        // Handle LAB_SETUP creation on Approval
        if (currentRequest?.type === "LAB_SETUP" && status === "APPROVED") {
            // Check if lab already exists to prevent duplicates
            const existingLab = await prisma.lab.findFirst({
                where: {
                    name: request.title,
                    departmentId: request.departmentId
                }
            });

            if (!existingLab) {
                const { labCode, labCapacity, labLocation } = body;

                // Generate a unique code if not provided
                const finalCode = labCode || `LAB-${Math.floor(1000 + Math.random() * 9000)}`;
                const finalCapacity = parseInt(labCapacity) || 0;

                await prisma.lab.create({
                    data: {
                        name: request.title,
                        code: finalCode,
                        departmentId: request.departmentId,
                        capacity: finalCapacity,
                        location: labLocation || "Allocation Pending",
                    }
                });
            }
        }

        // Handle LAB_SETUP updates on Completion (Admin)
        if (currentRequest?.type === "LAB_SETUP" && status === "COMPLETED") {
            const { labCode, labCapacity, labLocation } = body;

            if (labCode || labCapacity || labLocation) {
                // Find the lab created during approval
                const existingLab = await prisma.lab.findFirst({
                    where: {
                        name: request.title,
                        departmentId: request.departmentId
                    }
                });

                if (existingLab) {
                    await prisma.lab.update({
                        where: { id: existingLab.id },
                        data: {
                            code: labCode || existingLab.code,
                            capacity: parseInt(labCapacity) || existingLab.capacity,
                            location: labLocation || existingLab.location,
                        }
                    });
                }
            }
        }

        await logActivity({
            userId: session.user.id,
            action: (status === "APPROVED" || status === "REJECTED" || status === "COMPLETED" || status === "DECLINED") ? status : "UPDATE",
            entity: "REQUEST",
            entityId: id,
            details: `Updated request ${request.requestNumber} (${request.title}): ${status}`,
            departmentId: request.departmentId
        });

        return NextResponse.json(request);
    } catch (error: any) {
        logError("/api/requests/[id]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to update request" },
            { status: 500 }
        );
    }
}
