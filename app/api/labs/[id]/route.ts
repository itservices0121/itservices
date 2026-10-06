import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateLabSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    location: z.string().optional(),
    capacity: z.union([z.string(), z.number()]).optional(),
    inchargeId: z.string().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const lab = await prisma.lab.findUnique({
            where: { id },
            include: {
                department: { select: { name: true } },
                incharge: { select: { name: true, email: true } },
                _count: { select: { assets: true } }
            }
        });

        if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

        return NextResponse.json(lab);
    } catch (error) {
        logError("/api/labs/[id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN", "HOD"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        updateLabSchema.parse(body);
        const { inchargeId, ...otherData } = body;

        // Fetch current lab to check department
        const currentLab = await prisma.lab.findUnique({
            where: { id },
            select: { departmentId: true }
        });

        if (!currentLab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

        // RBAC Check for HOD
        if (session.user.role === "HOD") {
            const hod = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { departmentId: true }
            });

            if (hod?.departmentId !== currentLab.departmentId) {
                return NextResponse.json({ error: "HODs can only manage labs within their department" }, { status: 403 });
            }
        }

        const cleanInchargeId = inchargeId && inchargeId !== "" ? inchargeId : (inchargeId === "" ? null : undefined);

        const lab = await prisma.lab.update({
            where: { id },
            data: {
                ...otherData,
                inchargeId: cleanInchargeId
            }
        });

        // Note: We no longer sync user.labId here to allow one user to manage multiple labs without overwriting their primary lab association.

        return NextResponse.json(lab);
    } catch (error: any) {
        logError("/api/labs/[id]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "A laboratory with this specific configuration code already exists." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: "Failed to update lab" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.lab.delete({ where: { id } });

        return NextResponse.json({ message: "Lab deleted successfully" });
    } catch (error) {
        logError("/api/labs/[id]", error);
        return NextResponse.json({ error: "Failed to delete lab" }, { status: 500 });
    }
}
