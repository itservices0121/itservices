import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logError } from "@/lib/logger";
import { z } from "zod";

const patchTicketSchema = z.object({
    status: z.string().optional(),
    resolution: z.string().optional(),
    assignedToId: z.string().optional(),
});

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
        const { status, resolution, assignedToId } = patchTicketSchema.parse(body);

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
            select: { departmentId: true, labId: true, ticketNumber: true, createdById: true, assignedToId: true, status: true }
        });

        if (!currentTicket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // HOD approval path: HOD may set SUBMITTED → APPROVED only within their department.
        const isHodApproval =
            session.user.role === "HOD" &&
            status === "APPROVED" &&
            currentTicket.status === "SUBMITTED" &&
            session.user.departmentId === currentTicket.departmentId;

        // General path: ADMIN, the ticket creator, or the assigned technician.
        const hasGeneralAccess =
            session.user.role === "ADMIN" ||
            session.user.id === currentTicket.createdById ||
            session.user.id === currentTicket.assignedToId;

        if (!isHodApproval && !hasGeneralAccess) {
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
    } catch (error: any) {
        logError("/api/tickets/[id]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }
}
