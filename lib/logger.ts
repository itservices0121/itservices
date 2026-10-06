import { prisma } from "./db";

export function logError(route: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] ERROR in ${route}:`, detail);
}

export async function logActivity({
    userId,
    action,
    entity,
    entityId,
    details,
    departmentId,
    labId
}: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: string;
    departmentId?: string;
    labId?: string;
}) {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details,
                departmentId,
                labId
            },
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
