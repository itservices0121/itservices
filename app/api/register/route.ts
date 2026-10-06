import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity, logError } from "@/lib/logger";

const userSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["USER", "HOD", "LAB_INCHARGE", "ADMIN", "DEAN"]).optional(),
    departmentId: z.string().optional(),
    departmentName: z.string().optional(),
});

const rateLimit = new Map<string, { count: number, resetAt: number }>();

const rateLimiter = (req: Request) => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const record = rateLimit.get(ip);
    
    if (record) {
        if (now > record.resetAt) {
            rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
            return null;
        }
        if (record.count >= 5) {
            return NextResponse.json({ message: "Too Many Requests" }, { status: 429 });
        }
        record.count += 1;
        return null;
    }
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return null;
};

export async function POST(req: Request) {
    const limit = rateLimiter(req);
    if (limit) return limit;
    
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const { email, password, name, role, departmentId, departmentName } = userSchema.parse(body);

        // RBAC Logic
        const targetRole = role || "USER";
        let isAuthorized = false;
        let setAsActive = false;

        if (!session) {
            // Public registration - only USER role or PENDING HOD/LAB_INCHARGE
            if (targetRole === "USER") {
                isAuthorized = true;
                setAsActive = true;
            } else if (["HOD", "LAB_INCHARGE"].includes(targetRole)) {
                isAuthorized = true;
                setAsActive = false; // Results in PENDING
            }
        } else {
            const currentUserRole = session.user.role;

            if (currentUserRole === "DEAN") {
                // Dean can create anyone as ACTIVE
                isAuthorized = true;
                setAsActive = true;
            } else if (currentUserRole === "HOD" && targetRole === "LAB_INCHARGE") {
                // HOD can create Lab Incharge for their department
                isAuthorized = true;
                setAsActive = true;
            } else if (currentUserRole === "ADMIN") {
                // Admin can create Users? Or maybe nothing specialized.
                // Let's stick to the prompt: Dean creates Admin, HOD creates Lab Incharge.
                if (targetRole === "USER") {
                    isAuthorized = true;
                    setAsActive = true;
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { message: "Unauthorized: You do not have permission to register this role." },
                { status: 403 }
            );
        }

        const existingUser = await db.user.findUnique({
            where: { email: email },
        });

        if (existingUser) {
            return NextResponse.json(
                { user: null, message: "User with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await hash(password, 10);
        const isApprovalRequired = !setAsActive;

        // Handle Department Creation/Assignment
        let finalDeptId = departmentId || null;

        // If HOD is creating a Lab Incharge, force their department
        if (session?.user?.role === "HOD" && targetRole === "LAB_INCHARGE") {
            finalDeptId = session.user.departmentId || null;
        }

        if (!finalDeptId && departmentName && targetRole === "HOD") {
            const existingDept = await db.department.findFirst({
                where: { name: { equals: departmentName } }
            });

            if (existingDept) {
                finalDeptId = existingDept.id;
            } else {
                const newDept = await db.department.create({
                    data: {
                        name: departmentName,
                        code: departmentName.substring(0, 5).toUpperCase().replace(/\s/g, '') + Math.floor(10 + Math.random() * 90),
                        description: `Manually registered during HOD onboarding for ${name}`,
                    }
                });
                finalDeptId = newDept.id;
            }
        }

        if (finalDeptId) {
            const deptExists = await db.department.findUnique({ where: { id: finalDeptId } });
            if (!deptExists) {
                return NextResponse.json({ message: "Invalid department ID" }, { status: 400 });
            }
        }

        const newUser = await db.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: targetRole as any,
                status: (isApprovalRequired ? "PENDING" : "ACTIVE") as any,
                departmentId: finalDeptId,
            },
        });

        if (isApprovalRequired) {
            if (!finalDeptId && targetRole !== "USER") {
                return NextResponse.json({ message: "Department is required for specialized role registration" }, { status: 400 });
            }

            await db.request.create({
                data: {
                    requestNumber: `REQ-ACC-${Math.floor(1000 + Math.random() * 9000)}`,
                    title: `Account Approval: ${name} (${targetRole})`,
                    description: `A new ${targetRole} account for ${name} (${email}) is pending institutional approval.`,
                    type: "ACCOUNT_APPROVAL",
                    priority: "HIGH",
                    status: "PENDING",
                    departmentId: finalDeptId || "", // Assuming fallback handled if needed
                    createdById: newUser.id,
                }
            });
        }

        await logActivity({
            userId: newUser.id,
            action: "CREATE",
            entity: "USER",
            entityId: newUser.id,
            details: `New account registered: ${name} (${email}) as ${targetRole}`,
            departmentId: finalDeptId || undefined
        });

        const { password: newUserPassword, ...rest } = newUser;

        return NextResponse.json(
            {
                user: rest,
                message: isApprovalRequired
                    ? "Account registered. Pending Dean's approval."
                    : "User created successfully"
            },
            { status: 201 }
        );
    } catch (error: any) {
        logError("/api/register", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json(
            { message: error?.message || "Something went wrong" },
            { status: 500 }
        );
    }
}

