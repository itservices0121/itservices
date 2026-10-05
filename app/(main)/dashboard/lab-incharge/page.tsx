"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import {
    Monitor,
    Ticket,
    CheckCircle2,
    Plus,
    Clock,
    Wrench,
    Activity,
    ArrowRight,
    Server,
    Zap,
    Info,
    Loader2
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { cn } from "@/lib/utils";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LabInchargeDashboard() {
    const { data: session } = useSession();
    const { data: stats, isLoading: loadingStats } = useSWR("/api/stats", fetcher, { revalidateOnFocus: false });
    const { data: ticketsRaw } = useSWR("/api/tickets", fetcher);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : [];
    const loading = loadingStats;

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-8 space-y-8 text-foreground">
            {/* Page Header */}
            <DashboardHeader
                eyebrow="Lab Operations"
                title="Lab Monitoring Systems"
                subtitle="Real-time oversight of computer infrastructure and deployments."
                actions={
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <p className="text-xs font-medium text-muted-foreground">Server Date</p>
                            <p className="text-sm font-medium text-foreground">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Report Issue
                        </button>
                        <button
                            aria-label="View system activity"
                            className="p-2.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </button>
                    </div>
                }
            />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    label="Lab Inventory"
                    value={stats?.totalSystems || 0}
                    badge="Live Sync"
                    icon={Monitor}
                    variant="primary"
                />
                <StatCard
                    label="Optimal Status"
                    value={stats?.workingSystems || 0}
                    badge="Active"
                    icon={CheckCircle2}
                    variant="secondary"
                />
                <StatCard
                    label="Active Requests"
                    value={stats?.pendingTickets || 0}
                    badge="Processing"
                    icon={Wrench}
                    variant="accent"
                />
                <StatCard
                    label="System Health"
                    value="98%"
                    badge="Healthy"
                    icon={Zap}
                    variant="muted"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Active Maintenance</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Infrastructure technical queries</p>
                            </div>
                            <div className="p-2 bg-muted rounded-lg">
                                <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="divide-y divide-border">
                            {tickets.length > 0 ? tickets.slice(0, 5).map((t) => (
                                <div key={t.id} className="p-5 hover:bg-muted/30 transition-all group">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border group-hover:border-primary/30 transition-all">
                                                {t.status === "DEPLOYED" ?
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" /> :
                                                    <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                                                }
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${t.issueType === "HARDWARE"
                                                        ? "bg-orange-50 text-orange-600 border-orange-100"
                                                        : "bg-primary/5 text-primary border-primary/10"
                                                        }`}>
                                                        {t.issueType}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs font-medium">{t.ticketNumber}</span>
                                                </div>
                                                <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-md">
                                                    {t.title}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${t.status === "DEPLOYED" ? "bg-green-100 text-green-700" : "bg-muted text-foreground"
                                                }`}>
                                                {t.status}
                                            </span>
                                            <button
                                                aria-label={`View ticket ${t.ticketNumber}`}
                                                className="p-1.5 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all"
                                            >
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-14 text-center text-muted-foreground text-sm">No active technical queries for this lab</div>
                            )}
                        </div>
                    </div>

                    {/* Lab Ethics */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h4 className="font-semibold text-foreground text-sm">Lab Ethics</h4>
                        </div>
                        <div className="space-y-2">
                            {[
                                "Report hardware issues instantly.",
                                "Authorized software only.",
                                "No external USB devices.",
                                "Maintain logbook daily."
                            ].map((guide, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-muted rounded-lg">
                                    <span className="font-semibold text-primary text-sm shrink-0">0{i + 1}</span>
                                    <p className="text-sm text-foreground">{guide}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                    <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                        <div className="p-2 bg-primary/10 rounded-lg w-fit mb-4">
                            <Server className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-2">System Infrastructure</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            Ensure all lab terminals are synchronized. OS security patches were deployed successfully.
                        </p>
                        <div className="pt-4 border-t border-border flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-6 w-6 bg-muted border-2 border-card rounded-md flex items-center justify-center text-xs font-medium text-muted-foreground">
                                        SY
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">Admin Monitored</span>
                        </div>
                    </div>
                </div>
            </div>

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    mutate("/api/tickets");
                    mutate("/api/stats");
                }}
                onSubmit={async (data) => {
                    const res = await fetch("/api/tickets", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: data.title,
                            description: data.description,
                            issueType: data.category,
                            priority: data.priority,
                            departmentId: session?.user?.departmentId,
                            labId: session?.user?.labId,
                        })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Failed to create ticket");
                    }
                }}
            />
        </div>
    );
}
