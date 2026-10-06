import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        user: {
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/logger", () => ({
    logError: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn(),
    },
    hash: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { PUT } from "@/app/api/users/[id]/route";
import { NextRequest } from "next/server";

describe("PUT /api/users/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createRequest = (body: any) => {
        return new NextRequest("http://localhost:3000/api/users/user-1", {
            method: "PUT",
            body: JSON.stringify(body),
        });
    };

    it("rejects non-admin attempting to set role", async () => {
        (getServerSession as any).mockResolvedValue({
            user: { id: "user-1", role: "USER" },
        });

        const req = createRequest({
            role: "ADMIN",
        });

        const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
        expect(res.status).toBe(403);
    });

    it("allows self-update of name/email with no role field", async () => {
        (getServerSession as any).mockResolvedValue({
            user: { id: "user-1", role: "USER" },
        });

        const mockUser = { id: "user-1", name: "New Name", email: "new@example.com", password: "hash" };
        (prisma.user.update as any).mockResolvedValue(mockUser);

        const req = createRequest({
            name: "New Name",
            email: "new@example.com",
        });

        const res = await PUT(req, { params: Promise.resolve({ id: "user-1" }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.name).toBe("New Name");
        expect(prisma.user.update).toHaveBeenCalled();
    });
});
