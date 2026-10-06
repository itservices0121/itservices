import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const handler = NextAuth(authOptions);

const rateLimit = new Map<string, { count: number, resetAt: number }>();

const rateLimiter = (req: NextRequest) => {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const now = Date.now();
    const record = rateLimit.get(ip);
    
    if (record) {
        if (now > record.resetAt) {
            rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
            return null;
        }
        if (record.count >= 10) { // 10 requests per minute
            return new NextResponse("Too Many Requests", { status: 429 });
        }
        record.count += 1;
        return null;
    }
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return null;
};

export async function GET(req: NextRequest, ctx: any) {
    const limit = rateLimiter(req);
    if (limit) return limit;
    return handler(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
    const limit = rateLimiter(req);
    if (limit) return limit;
    return handler(req, ctx);
}
