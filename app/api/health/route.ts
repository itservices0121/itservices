import { logError } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: "ok" }, { status: 200 });
    } catch (error) {
        logError("/api/health", error);
        return NextResponse.json({ status: "error", error: "Database unreachable" }, { status: 503 });
    }
}
