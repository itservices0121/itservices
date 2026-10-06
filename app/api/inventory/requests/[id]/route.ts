import { logActivity, logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchInventoryRequestSchema = z.object({
    status: z.enum(["APPROVED", "DECLINED"]),
});

// PATCH /api/inventory/requests/[id] - Approve or decline a spare-part request
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden: Only ADMIN or DEAN may approve inventory requests" }, { status: 403 });
        }

        const body = await req.json();
        const { status } = patchInventoryRequestSchema.parse(body);

        const existing = await prisma.inventoryRequest.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Inventory request not found" }, { status: 404 });
        }

        const updated = await prisma.inventoryRequest.update({
            where: { id },
            data: {
                status: status as any,
                approvedById: status === "APPROVED" ? session.user.id : null,
            },
        });

        await logActivity({
            userId: session.user.id,
            action: "UPDATE",
            entity: "INVENTORY_REQUEST",
            entityId: id,
            details: `${status} inventory request ${existing.requestNumber}`,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        logError("/api/inventory/requests/[id]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to update inventory request" }, { status: 500 });
    }
}
