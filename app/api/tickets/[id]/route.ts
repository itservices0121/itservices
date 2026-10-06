import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logError } from "@/lib/logger";

// PATCH /api/tickets/[id] - Update ticket status/resolution
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { status, resolution, assignedToId } = body;

        const data: any = {};
        if (status) data.status = status;
        if (resolution) data.resolution = resolution;
        if (assignedToId) data.assignedToId = assignedToId;

        if (status === "RESOLVED" || status === "DEPLOYED") {
            data.resolvedAt = new Date();
        }

        // Fetch current ticket to get dept/lab for logging and to check permissions
        const currentTicket = await prisma.ticket.findUnique({
            where: { id },
            select: { departmentId: true, labId: true, ticketNumber: true, createdById: true, assignedToId: true }
        });

        if (!currentTicket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Role check: only ADMIN, or the ticket's createdById/assignedToId user, may PATCH.
        if (
            session.user.role !== "ADMIN" &&
            session.user.id !== currentTicket.createdById &&
            session.user.id !== currentTicket.assignedToId
        ) {
            return NextResponse.json({ error: "Forbidden: Insufficient permissions to update this ticket" }, { status: 403 });
        }

        const ticket = await prisma.ticket.update({
            where: { id },
            data,
        });

        await logActivity({
            userId: session.user.id,
            action: "UPDATE",
            entity: "TICKET",
            entityId: id,
            details: `Updated ticket ${currentTicket?.ticketNumber} status to ${status || 'unchanged'}`,
            departmentId: currentTicket?.departmentId,
            labId: currentTicket?.labId || undefined
        });

        return NextResponse.json(ticket);
    } catch (error) {
        logError("/api/tickets/[id]", error);
        return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }
}
