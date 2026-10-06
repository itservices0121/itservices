import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logError } from "@/lib/logger";
import { z } from "zod";

const createTicketSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    issueType: z.string().min(1, "Issue type is required"),
    departmentId: z.string().min(1, "Department is required"),
    priority: z.string().optional(),
    assetId: z.string().nullable().optional(),
    labId: z.string().nullable().optional(),
});

// GET /api/tickets - Get tickets based on role
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const userId = session.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { departmentId: true, labId: true, managedLab: { select: { id: true } } },
        });

        let tickets;

        if (role === "ADMIN" || role === "DEAN") {
            // Admin and Dean see all tickets
            tickets = await prisma.ticket.findMany({
                include: {
                    asset: {
                        select: { assetNumber: true, name: true },
                    },
                    department: {
                        select: { name: true, code: true },
                    },
                    lab: {
                        select: { name: true, code: true },
                    },
                    createdBy: {
                        select: { name: true, email: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } else if (role === "LAB_INCHARGE") {
            // Lab Incharge sees their own + their lab's tickets
            const labIds = [];
            if (user?.labId) labIds.push(user.labId);
            if (user?.managedLab?.id) labIds.push(user.managedLab.id);

            tickets = await prisma.ticket.findMany({
                where: {
                    OR: [
                        { createdById: userId },
                        ...(labIds.length > 0 ? [{ labId: { in: labIds } }] : [])
                    ]
                },
                include: {
                    asset: {
                        select: { assetNumber: true, name: true },
                    },
                    lab: {
                        select: { name: true, code: true },
                    },
                    assignedTo: {
                        select: { name: true, email: true },
                    },
                    createdBy: {
                        select: { name: true, email: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } else if (role === "HOD") {
            // HOD sees all tickets in their department
            tickets = await prisma.ticket.findMany({
                where: { departmentId: user?.departmentId || undefined },
                include: {
                    asset: {
                        select: { assetNumber: true, name: true },
                    },
                    lab: {
                        select: { name: true, code: true },
                    },
                    createdBy: {
                        select: { name: true, email: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(tickets);
    } catch (error) {
        logError("/api/tickets", error);
        return NextResponse.json(
            { error: "Failed to fetch tickets" },
            { status: 500 }
        );
    }
}

// POST /api/tickets - Create a new ticket (Lab Incharge only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "LAB_INCHARGE") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, issueType, priority, assetId, departmentId, labId } = createTicketSchema.parse(body);

        // Generate ticket number safely without collision
        const randomStr = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID().split('-')[0].toUpperCase() 
            : Math.random().toString(36).substring(2, 8).toUpperCase();
        const ticketNumber = `TKT-${new Date().getFullYear()}-${randomStr}`;

        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber,
                title,
                description,
                issueType: issueType as any,
                priority: (priority || "NORMAL") as any,
                assetId: assetId || null,
                departmentId,
                labId: labId || null,
                createdById: session.user.id,
            },
            include: {
                asset: {
                    select: { assetNumber: true, name: true },
                },
                lab: {
                    select: { name: true, code: true },
                },
            },
        });

        await logActivity({
            userId: session.user.id,
            action: "CREATE",
            entity: "TICKET",
            entityId: ticket.id,
            details: `Created service request: ${ticket.title} (${ticket.ticketNumber})`,
            departmentId: ticket.departmentId,
            labId: ticket.labId || undefined
        });

        return NextResponse.json(ticket, { status: 201 });
    } catch (error: any) {
        logError("/api/tickets", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to create ticket" },
            { status: 500 }
        );
    }
}
