import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
    const fn = vi.fn();
    return {
        db: { user: { findUnique: fn } },
        prisma: { user: { findUnique: fn } },
    };
});

vi.mock("../lib/db", () => {
    const fn = vi.fn();
    return {
        db: { user: { findUnique: fn } },
        prisma: { user: { findUnique: fn } },
    };
});

vi.mock("@next-auth/prisma-adapter", () => ({
    PrismaAdapter: vi.fn(() => ({})),
}));

import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { authOptions } from "@/lib/auth";

const credentialsProvider = authOptions.providers[0] as any;
// NextAuth stores the actual authorize function inside the options object!
const authorize: (
    credentials: Record<string, string>
) => Promise<any> = credentialsProvider.options.authorize.bind(credentialsProvider.options);

const realHash = bcryptjs.hashSync("correct-password", 10);

const mockDbUser = (overrides: Record<string, unknown> = {}) => ({
    id: "user-1",
    email: "lab@example.com",
    name: "Lab User",
    password: realHash,
    role: "LAB_INCHARGE",
    status: "ACTIVE",
    departmentId: "dept-1",
    labId: "lab-1",
    image: null,
    ...overrides,
});

describe("lib/auth.ts — authorize()", () => {
    beforeEach(() => {
        (db.user.findUnique as any).mockReset();
    });

    it("returns null when credentials are missing", async () => {
        const result = await authorize({ email: "", password: "" });
        expect(result).toBeNull();
    });

    it("returns null when the user is not found", async () => {
        (db.user.findUnique as any).mockResolvedValue(null);
        const result = await authorize({
            email: "nobody@example.com",
            password: "secret",
        });
        expect(result).toBeNull();
    });

    it("returns null when the password is wrong", async () => {
        (db.user.findUnique as any).mockResolvedValue(mockDbUser());
        const result = await authorize({
            email: "lab@example.com",
            password: "wrong-password",
        });
        expect(result).toBeNull();
    });

    it("resolves a user object for valid credentials", async () => {
        const user = mockDbUser();
        (db.user.findUnique as any).mockResolvedValue(user);

        const result = await authorize({
            email: "lab@example.com",
            password: "correct-password",
        });

        expect(result).toMatchObject({
            id: "user-1",
            email: "lab@example.com",
            role: "LAB_INCHARGE",
        });
    });

    it("throws 'Account pending approval by Dean.' for a PENDING user", async () => {
        (db.user.findUnique as any).mockResolvedValue(
            mockDbUser({ status: "PENDING" })
        );

        try {
            await authorize({ email: "lab@example.com", password: "any" });
            expect.fail("Should have thrown");
        } catch (e: any) {
            expect(e).toBeInstanceOf(Error);
            if (e.name === "AssertionError") {
                throw e; // Rethrow expect.fail
            }
            expect(e.message).toBe("Account pending approval by Dean.");
        }
    });
});
