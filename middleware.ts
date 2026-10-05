import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes that don't require authentication
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico"
    ) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // If no token and trying to access a protected route, redirect to login
    if (!token) {
        const loginUrl = new URL("/login", req.url);
        return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    // Role-based route protection mirroring Sidebar logic
    
    // Dashboard specific protections
    if (pathname.startsWith("/dashboard/dean") && role !== "DEAN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/dashboard/hod") && role !== "HOD") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/dashboard/lab-incharge") && role !== "LAB_INCHARGE") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Module protections
    if (pathname.startsWith("/departments")) {
        if (role === "HOD" || role === "ADMIN" || role === "LAB_INCHARGE") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    if (pathname.startsWith("/labs")) {
        if (role === "LAB_INCHARGE") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    if (pathname.startsWith("/users")) {
        if (role === "LAB_INCHARGE") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.next();
}
