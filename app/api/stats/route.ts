import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const userId = session.user.id;

        // Dean - Global stats
        if (role === "DEAN") {
            // Fetch totalSystems from Google Sheet (row count = number of assets)
            // Sheet: https://docs.google.com/spreadsheets/d/1L3nDM3eFbhRUYct5nwihRGXLOUj5qPzL6pGwscHCdWI
            let totalSystems = 0;

            try {
                const sheetRes = await fetch(
                    "https://docs.google.com/spreadsheets/d/1L3nDM3eFbhRUYct5nwihRGXLOUj5qPzL6pGwscHCdWI/export?format=csv",
                    { cache: 'no-store' }
                );
                const text = await sheetRes.text();

                if (!text.toLowerCase().includes("<!doctype html>")) {
                    // Count data rows (exclude header row)
                    const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
                    totalSystems = lines.length > 1 ? lines.length - 1 : 0;
                } else {
                    console.error("Google Sheet returned HTML — ensure the sheet is published publicly.");
                    // Fallback to database count
                    totalSystems = 0;
                }
            } catch (error) {
                console.error("Error fetching from Google Sheets:", error);
                totalSystems = 0;
            }

            // Ready for Use, Service, Priority come from the database
            const [
                workingSystems,
                underMaintenanceCount,
                damagedCount,
                openMaintenanceTickets,
                departments,
                labs,
                pendingRequests,
            ] = await Promise.all([
                prisma.asset.count({ where: { status: "ACTIVE" } }),
                prisma.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),
                prisma.asset.count({ where: { status: "DAMAGED" } }),
                prisma.ticket.count({ where: { status: { not: "RESOLVED" } } }),
                prisma.department.count(),
                prisma.lab.count(),
                prisma.request.count({ where: { status: "PENDING" } }),
            ]);

            const serviceCount = underMaintenanceCount + damagedCount;
            const priorityCount = openMaintenanceTickets + pendingRequests;

            return NextResponse.json({
                totalSystems,
                readyForUse: workingSystems,
                service: serviceCount,
                priorityTasks: priorityCount,
                departments,
                labs,
                pendingRequests,
                lastSync: new Date().toISOString()
            });
        }

        // HOD - Department stats
        if (role === "HOD") {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { departmentId: true },
            });

            if (!user?.departmentId) {
                return NextResponse.json({ error: "No department assigned" }, { status: 400 });
            }

            const [
                totalSystems,
                workingSystems,
                underMaintenance,
                activeRequests,
                pendingRequests,
                approvedRequests,
            ] = await Promise.all([
                prisma.asset.count({ where: { departmentId: user.departmentId } }),
                prisma.asset.count({ where: { departmentId: user.departmentId, status: "ACTIVE" } }),
                prisma.asset.count({ where: { departmentId: user.departmentId, status: "UNDER_MAINTENANCE" } }),
                prisma.request.count({
                    where: {
                        departmentId: user.departmentId,
                        status: { in: ["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS"] },
                        type: { not: "ACCOUNT_APPROVAL" }
                    }
                }),
                prisma.request.count({
                    where: {
                        departmentId: user.departmentId,
                        status: "PENDING",
                        type: { not: "ACCOUNT_APPROVAL" }
                    }
                }),
                prisma.request.count({
                    where: {
                        departmentId: user.departmentId,
                        status: "APPROVED",
                        type: { not: "ACCOUNT_APPROVAL" }
                    }
                }),
            ]);

            return NextResponse.json({
                totalSystems,
                workingSystems,
                underMaintenance,
                activeRequests,
                pendingRequests,
                approvedRequests,
            });
        }

        // Admin - Global inventory stats
        if (role === "ADMIN") {
            const [
                totalSystems,
                totalServers,
                totalRouters,
                pendingTicketCount,
                inProgressTicketCount,
                completedTodayTicketCount,
                approvedRequestCount,
                inProgressRequestCount,
                completedRequestCount,
            ] = await Promise.all([
                prisma.asset.count({ where: { type: { in: ["DESKTOP", "LAPTOP"] } } }),
                prisma.asset.count({ where: { type: "SERVER" } }),
                prisma.asset.count({ where: { type: { in: ["ROUTER", "SWITCH"] } } }),
                prisma.ticket.count({ where: { status: { in: ["SUBMITTED", "APPROVED"] } } }),
                prisma.ticket.count({ where: { status: { in: ["PROCESSING", "QUEUED"] } } }),
                prisma.ticket.count({
                    where: {
                        status: { in: ["RESOLVED", "DEPLOYED"] },
                        resolvedAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                }),
                prisma.request.count({ where: { status: { in: ["PENDING", "APPROVED"] }, type: { not: "ACCOUNT_APPROVAL" } } }),
                prisma.request.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] }, type: { not: "ACCOUNT_APPROVAL" } } }),
                prisma.request.count({
                    where: {
                        status: "COMPLETED",
                        type: { not: "ACCOUNT_APPROVAL" },
                        completedAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                }),
            ]);

            return NextResponse.json({
                totalSystems,
                totalServers,
                totalRouters,
                pendingTickets: pendingTicketCount + approvedRequestCount,
                inProgressTickets: inProgressTicketCount + inProgressRequestCount,
                completedToday: completedTodayTicketCount + completedRequestCount,
            });
        }

        // Lab Incharge - Lab stats
        if (role === "LAB_INCHARGE") {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { labId: true, managedLab: { select: { id: true } } },
            });

            const labIds = [];
            if (user?.labId) labIds.push(user.labId);
            if (user?.managedLab?.id) labIds.push(user.managedLab.id);

            if (labIds.length === 0) {
                return NextResponse.json({ error: "No lab assigned" }, { status: 400 });
            }

            const [
                totalSystems,
                workingSystems,
                issues,
                myTickets,
                pendingTickets,
            ] = await Promise.all([
                prisma.asset.count({ where: { labId: { in: labIds } } }),
                prisma.asset.count({ where: { labId: { in: labIds }, status: "ACTIVE" } }),
                prisma.asset.count({ where: { labId: { in: labIds }, status: { not: "ACTIVE" } } }),
                prisma.ticket.count({ where: { createdById: userId } }),
                prisma.ticket.count({ where: { createdById: userId, status: { in: ["SUBMITTED", "APPROVED"] } } }),
            ]);

            return NextResponse.json({
                totalSystems,
                workingSystems,
                issues,
                myTickets,
                pendingTickets,
            });
        }

        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}
