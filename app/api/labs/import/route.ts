import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "DEAN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const text = await file.text();
        let rows: any[] = [];

        if (file.type === "application/json" || file.name.endsWith(".json")) {
            rows = JSON.parse(text);
        } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
            const lines = text.split("\n").filter(line => line.trim());
            if (lines.length > 0) {
                const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
                    const row: any = {};
                    headers.forEach((h, index) => {
                        row[h] = values[index];
                    });
                    rows.push(row);
                }
            }
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        // We assume session.user.departmentId is valid or they are importing for a specific department
        // If the row doesn't have departmentId, we use the session user's departmentId if available
        const defaultDepartmentId = session.user.departmentId;

        const labs = rows.map((row: any) => ({
            name: row.name,
            code: row.code,
            capacity: parseInt(row.capacity) || 0,
            location: row.location || null,
            inchargeId: row.inchargeId || null,
            departmentId: row.departmentId || defaultDepartmentId,
        }));

        // Filter out labs missing required fields
        const validLabs = labs.filter(lab => lab.name && lab.code && lab.departmentId);

        if (validLabs.length === 0) {
            return NextResponse.json({ error: "No valid labs found in file" }, { status: 400 });
        }

        const created = await prisma.lab.createMany({
            data: validLabs,
            skipDuplicates: true,
        });

        return NextResponse.json({ message: `Successfully imported ${created.count} labs` }, { status: 201 });
    } catch (error) {
        logError("/api/labs/import", error);
        return NextResponse.json({ error: "Failed to import labs" }, { status: 500 });
    }
}
