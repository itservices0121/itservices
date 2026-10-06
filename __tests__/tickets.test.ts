import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

vi.mock("@/lib/db", () => ({
    prisma: {
        ticket: {
            create: vi.fn(),
        },
    },
}));

vi.mock("@/lib/logger", () => ({
    logActivity: vi.fn(),
    logError: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/tickets/route";
import { NextRequest } from "next/server";

describe("POST /api/tickets", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createRequest = (body: any) => {
        return new NextRequest("http://localhost:3000/api/tickets", {
            method: "POST",
            body: JSON.stringify(body),
        });
    };

    it("returns 403 for non-LAB_INCHARGE session", async () => {
        (getServerSession as any).mockResolvedValue({
            user: { id: "user-1", role: "USER" },
        });

        const req = createRequest({
            title: "Test Ticket",
            description: "Test Desc",
            issueType: "HARDWARE",
            departmentId: "dept-1",
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it("returns 400 for missing required fields", async () => {
        (getServerSession as any).mockResolvedValue({
            user: { id: "user-1", role: "LAB_INCHARGE" },
        });

        // Missing title
        const req = createRequest({
            description: "Test Desc",
            issueType: "HARDWARE",
            departmentId: "dept-1",
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("creates a ticket for a valid LAB_INCHARGE session and body", async () => {
        (getServerSession as any).mockResolvedValue({
            user: { id: "user-1", role: "LAB_INCHARGE" },
        });

        const mockTicket = { id: "ticket-1", title: "Test Ticket" };
        (prisma.ticket.create as any).mockResolvedValue(mockTicket);

        const req = createRequest({
            title: "Test Ticket",
            description: "Test Desc",
            issueType: "HARDWARE",
            departmentId: "dept-1",
        });

        const res = await POST(req);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json).toEqual(mockTicket);
        expect(prisma.ticket.create).toHaveBeenCalled();
    });
});
