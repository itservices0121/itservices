import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "DEAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const stats = await prisma.department.findMany({
            select: {
                name: true,
                code: true,
                _count: {
                    select: {
                        assets: {
                            where: {
                                type: { in: ["DESKTOP", "LAPTOP"] }
                            }
                        }
                    }
                }
            }
        });

        const distribution = stats.map(dept => ({
            name: dept.name,
            code: dept.code,
            count: dept._count.assets
        }));

        return NextResponse.json(distribution);
    } catch (error) {
        logError("/api/analytics/distribution", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
