import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json([], { status: 200 }); // Return empty array if not logged in

        const limit = parseInt(new URL(req.url).searchParams.get("limit") || "50");
        const role = session.user.role;
        const userId = session.user.id;

        const where: any = {
            OR: [{ userId: userId }] // Always allow seeing own actions
        };

        if (role === "HOD") {
            // HOD sees only their own activities (handled by the default where clause)
        } else if (role === "LAB_INCHARGE") {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { labId: true, departmentId: true }
            });

            where.OR.push({
                AND: [
                    {
                        OR: [
                            { labId: user?.labId },
                            { departmentId: user?.departmentId }
                        ]
                    },
                    { entity: { in: ["TICKET", "ASSET", "REQUEST"] } },
                    {
                        NOT: [
                            { details: { contains: "Account Approval" } },
                            { details: { contains: "New account registered" } }
                        ]
                    }
                ]
            });
        }

        const activities = await prisma.activityLog.findMany({
            where,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, role: true } }
            }
        });

        return NextResponse.json(activities);
    } catch (error) {
        logError("/api/activities", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}
