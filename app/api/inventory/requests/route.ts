import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
        console.error("Error fetching inventory requests:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/inventory/requests
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { partName, quantity, category, urgency, description } = body;

        if (!partName || !quantity) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

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

        const count = await prisma.inventoryRequest.count();
        const requestNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

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
    } catch (error) {
        console.error("Error creating inventory request:", error);
        return NextResponse.json({ error: "Failed to create inventory request" }, { status: 500 });
    }
}
