import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: targetUserId } = await params;
        
        // A user may only update their own image unless caller is ADMIN/DEAN
        if (session.user.id !== targetUserId && !["ADMIN", "DEAN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { image } = body;

        // Validating base64 (or null for removal)
        if (image !== null && typeof image === "string") {
            // Check size roughly (e.g. max 2MB base64 string is ~2.7MB in length)
            if (image.length > 3 * 1024 * 1024) {
                return NextResponse.json({ error: "Image too large" }, { status: 400 });
            }
            // Check type (starts with data:image/jpeg or png or webp)
            if (!image.startsWith("data:image/")) {
                return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { image },
        });

        return NextResponse.json({ success: true, image: updatedUser.image });
    } catch (error) {
        logError("PATCH /api/users/[id]/image", error);
        return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
    }
}
