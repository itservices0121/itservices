import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createLabSchema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Code is required"),
    departmentId: z.string().min(1, "Department is required"),
    inchargeId: z.string().optional(),
    capacity: z.union([z.string(), z.number()]).optional(),
    location: z.string().optional(),
});

// GET /api/labs - List labs with RBAC
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const deptId = searchParams.get("deptId");

        const where: any = {};
        if (deptId) where.departmentId = deptId;

        // RBAC: HOD sees their dept labs
        if (session.user.role === "HOD") {
            if (session.user.departmentId) {
                where.departmentId = session.user.departmentId;
            }
        }

        const labs = await prisma.lab.findMany({
            where,
            include: {
                department: { select: { name: true, code: true } },
                incharge: { select: { name: true } },
                _count: { select: { assets: true } }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(labs);
    } catch (error) {
        logError("/api/labs", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/labs - Create lab (Dean/Admin)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, departmentId, inchargeId, capacity, location } = createLabSchema.parse(body);

        const cleanInchargeId = inchargeId && inchargeId !== "" ? inchargeId : null;

        const lab = await prisma.lab.create({
            data: {
                name,
                code,
                departmentId,
                inchargeId: cleanInchargeId,
                capacity: typeof capacity === 'string' ? parseInt(capacity) : (capacity || 0),
                location
            }
        });

        // Note: No user labId sync here to allow multi-lab management.

        return NextResponse.json(lab, { status: 201 });
    } catch (error: any) {
        logError("/api/labs", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "A lab with this code already exists. Please check the deployment nomenclature." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message || "Failed to create lab" }, { status: 500 });
    }
}
