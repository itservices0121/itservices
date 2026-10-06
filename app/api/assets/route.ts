import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logError } from "@/lib/logger";
import { z } from "zod";

const createAssetSchema = z.object({
    assetNumber: z.string().min(1, "Asset number is required"),
    name: z.string().min(1, "Name is required"),
    type: z.string().min(1, "Type is required"),
    departmentId: z.string().min(1, "Department is required"),
    category: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    macAddress: z.string().optional(),
    specifications: z.string().optional(),
    purchaseDate: z.string().optional(),
    purchasePrice: z.number().optional(),
    warrantyExpiry: z.string().optional(),
    processor: z.string().optional(),
    ram: z.string().optional(),
    hdd: z.string().optional(),
    status: z.string().optional(),
    condition: z.string().optional(),
    assignment: z.string().optional(),
    labId: z.string().nullable().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
});

// GET /api/assets - List assets with filters
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const labId = searchParams.get("labId");
        const deptId = searchParams.get("deptId");
        const search = searchParams.get("search");

        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (labId) where.labId = labId;
        if (deptId) where.departmentId = deptId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { assetNumber: { contains: search, mode: "insensitive" } },
                { macAddress: { contains: search, mode: "insensitive" } },
            ];
        }

        // RBAC: HOD sees their dept, Lab Incharge sees their lab
        if (session.user.role === "HOD") {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            if (user?.departmentId) where.departmentId = user.departmentId;
        } else if (session.user.role === "LAB_INCHARGE") {
            const user = await prisma.user.findUnique({ 
                where: { id: session.user.id },
                select: { labId: true, managedLab: { select: { id: true } } }
            });
            const labIds = [];
            if (user?.labId) labIds.push(user.labId);
            if (user?.managedLab?.id) labIds.push(user.managedLab.id);
            if (labIds.length > 0) {
                where.labId = { in: labIds };
            }
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const [assets, total] = await Promise.all([
            prisma.asset.findMany({
                where,
                include: {
                    department: { select: { name: true, code: true } },
                    lab: { select: { name: true, code: true } },
                },
                orderBy: { sheetOrder: "asc" },
                skip,
                take: limit,
            }),
            prisma.asset.count({ where })
        ]);

        return NextResponse.json({
            assets,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        logError("/api/assets", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/assets - Create asset
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const {
            assetNumber, name, type, category, brand, model, serialNumber,
            macAddress, specifications, purchaseDate, purchasePrice,
            warrantyExpiry, processor, ram, hdd, status, condition,
            assignment, departmentId, labId, location, notes
        } = createAssetSchema.parse(body);
        
        const asset = await prisma.asset.create({
            data: {
                assetNumber, name, type, category, brand, model, serialNumber,
                macAddress, specifications, purchaseDate, purchasePrice,
                warrantyExpiry, processor, ram, hdd, status, condition,
                assignment, departmentId, labId, location, notes
            } as any,
        });

        await logActivity({
            userId: session.user.id,
            action: "CREATE",
            entity: "ASSET",
            entityId: asset.id,
            details: `Created asset ${asset.assetNumber}`,
            departmentId: asset.departmentId,
            labId: asset.labId || undefined
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error: any) {
        logError("/api/assets", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "An asset with this System Code already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
    }
}
