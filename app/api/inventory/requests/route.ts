import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createInventoryRequestSchema = z.object({
    partName: z.string().min(1, "Part name is required"),
    quantity: z.number({ error: "Quantity must be a number" }).int().positive("Quantity must be a positive integer"),
    category: z.string().optional(),
    urgency: z.string().optional(),
    description: z.string().optional(),
});

// GET /api/inventory/requests
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const requests = await prisma.inventoryRequest.findMany({
            include: {
                inventoryItem: true,
                requestedBy: { select: { name: true, email: true } },
                approvedBy: { select: { name: true, email: true } },
                department: { select: { name: true, code: true } },
                lab: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(requests);
    } catch (error) {
        logError("/api/inventory/requests", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/inventory/requests
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!["ADMIN", "LAB_INCHARGE"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { partName, quantity, category, urgency, description } = createInventoryRequestSchema.parse(body);

        // Find or create inventory item
        let item = await prisma.inventoryItem.findUnique({
            where: { name: partName }
        });

        if (!item) {
            item = await prisma.inventoryItem.create({
                data: {
                    name: partName,
                    description: category ? `${category} part` : undefined,
                    quantity: 0
                }
            });
        }

        const randomStr = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().split('-')[0].toUpperCase()
            : Math.random().toString(36).substring(2, 8).toUpperCase();
        const requestNumber = `INV-${new Date().getFullYear()}-${randomStr}`;

        const request = await prisma.inventoryRequest.create({
            data: {
                requestNumber,
                inventoryItemId: item.id,
                quantity: quantity,
                remarks: description ? `[${urgency}] ${description}` : `[${urgency}]`,
                requestedById: session.user.id,
                departmentId: session.user.departmentId,
                labId: session.user.labId,
            }
        });

        return NextResponse.json(request, { status: 201 });
    } catch (error: any) {
        logError("/api/inventory/requests", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create inventory request" }, { status: 500 });
    }
}
