"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Shield,
    Server,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Search,
    ChevronRight,
    Loader2,
    Activity,
    Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import useSWR from "swr";
import { RequestSparePartModal } from "@/components/inventory/RequestSparePartModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
    const router = useRouter();

    const { data: stats, isLoading: loadingStats } = useSWR("/api/stats", fetcher, { revalidateOnFocus: false });
    const { data: ticketsRaw, mutate: mutateTickets } = useSWR("/api/tickets", fetcher);
    const { data: requestsRaw, mutate: mutateRequests } = useSWR("/api/requests", fetcher);
    const { data: inventoryRequestsRaw, mutate: mutateInventoryReqs } = useSWR("/api/inventory/requests", fetcher);

    const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : [];
    const requests = Array.isArray(requestsRaw) ? requestsRaw : [];
    const inventoryRequests = Array.isArray(inventoryRequestsRaw) ? inventoryRequestsRaw : [];
    const loading = loadingStats;

    const [search, setSearch] = useState("");
    const [activeQueue, setActiveQueue] = useState<"TICKETS" | "REQUESTS" | "INVENTORY">("TICKETS");
    const [filterPriority, setFilterPriority] = useState<string>("ALL");
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [processingRequest, setProcessingRequest] = useState(false);
    const [requestRemarks, setRequestRemarks] = useState("");
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    // Lab Creation Extra Fields (for LAB_SETUP type)
    const [labCode, setLabCode] = useState("");
    const [labCapacity, setLabCapacity] = useState("");
    const [labLocation, setLabLocation] = useState("");

    const handleProcessRequest = async (status: string) => {
        if (!selectedRequest) return;
        setProcessingRequest(true);
        try {
            const res = await fetch(`/api/requests/${selectedRequest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    remarks: requestRemarks || `Processed by System Admin`,
                    labCode,
                    labCapacity,
                    labLocation
                })
            });

            if (res.ok) {
                await mutateRequests();
                setIsProcessingModalOpen(false);
                setSelectedRequest(null);
                setRequestRemarks("");
                setLabCode("");
                setLabCapacity("");
                setLabLocation("");
            }
        } catch (error) {
            console.error("Failed to update request:", error);
        } finally {
            setProcessingRequest(false);
        }
    };

    const getUnifiedStatus = (status: string) => {
        if (status === "SUBMITTED" || status === "PENDING") return "PENDING";
        if (status === "PROCESSING" || status === "QUEUED" || status === "ASSIGNED" || status === "IN_PROGRESS") return "IN_PROCESS";
        if (status === "RESOLVED" || status === "DEPLOYED" || status === "COMPLETED") return "RESOLVED";
        if (status === "CLOSED" || status === "DECLINED") return "CLOSED";
        return status;
    };

    const filteredTickets = tickets
        .filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.ticketNumber.toLowerCase().includes(search.toLowerCase());
            const matchesPriority = filterPriority === "ALL" || t.priority === filterPriority;
            return matchesSearch && matchesPriority;
        })
        .sort((a, b) => {
            const statusOrder: Record<string, number> = {
                "SUBMITTED": 0, "PENDING": 0, "APPROVED": 0,
                "PROCESSING": 1, "QUEUED": 1, "ASSIGNED": 1, "IN_PROGRESS": 1,
                "RESOLVED": 2, "DEPLOYED": 2, "COMPLETED": 2,
                "CLOSED": 3, "DECLINED": 3
            };

            const statusA = getUnifiedStatus(a.status);
            const statusB = getUnifiedStatus(b.status);

            const orderA = statusOrder[statusA] ?? 4;
            const orderB = statusOrder[statusB] ?? 4;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const filteredRequests = requests
        .filter(r => {
            const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                r.requestNumber.toLowerCase().includes(search.toLowerCase());
            const matchesPriority = filterPriority === "ALL" || r.priority === filterPriority;
            return matchesSearch && matchesPriority;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());


    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-10 space-y-8 text-foreground">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Page Header */}
                <DashboardHeader
                    eyebrow="System Administration"
                    title="Admin Control Center"
                    subtitle="Manage service requests, resource approvals, and peripheral inventory"
                    actions={
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    aria-label="Search tickets and requests"
                                    className="pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56 transition-shadow"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsRequestModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Package className="h-4 w-4" aria-hidden="true" />
                                Request Peripheral
                            </button>
                        </>
                    }
                />

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard
                        label="Total Systems"
                        value={stats?.totalSystems || 0}
                        badge="Inventory"
                        icon={Shield}
                        href="/assets"
                        variant="primary"
                    />
                    <StatCard
                        label="Pending Tasks"
                        value={stats?.pendingTickets || 0}
                        badge="Awaiting"
                        icon={Clock}
                        href="/tickets"
                        variant="secondary"
                    />
                    <StatCard
                        label="In Process"
                        value={stats?.inProgressTickets || 0}
                        badge="Active"
                        icon={AlertCircle}
                        href="/tickets"
                        variant="accent"
                    />
                    <StatCard
                        label="Resolved Today"
                        value={stats?.completedToday || 0}
                        badge="Done"
                        icon={CheckCircle2}
                        href="/tickets"
                        variant="muted"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Service Queue */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <div className="flex gap-1">
                                    {(["TICKETS", "REQUESTS", "INVENTORY"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveQueue(tab)}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-md transition-colors relative",
                                                activeQueue === tab
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            {tab === "TICKETS" ? "Service Requests" : tab === "REQUESTS" ? "Resource Requests" : "Peripherals"}
                                            {tab === "REQUESTS" && requests.length > 0 && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                                    {requests.filter(r => r.status === "APPROVED").length}
                                                </span>
                                            )}
                                            {tab === "INVENTORY" && inventoryRequests.length > 0 && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                                    {inventoryRequests.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <Link href={activeQueue === "TICKETS" ? "/tickets" : "#"} className="text-sm font-medium text-primary hover:underline">
                                    View All
                                </Link>
                            </div>
                            <div className="divide-y divide-border">
                                {activeQueue === "TICKETS" ? (
                                    filteredTickets.length > 0 ? filteredTickets.slice(0, 5).map((ticket, index) => (
                                        <div
                                            key={ticket.id}
                                            className="p-5 hover:bg-muted/30 transition-colors group cursor-pointer"
                                            onClick={() => router.push(`/tickets`)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${ticket.priority === "CRITICAL" ? "bg-destructive" : "bg-primary"}`} />
                                                    <div>
                                                        <h4 className="font-medium text-foreground text-sm">
                                                            {ticket.title}
                                                        </h4>
                                                        <p className="text-muted-foreground text-xs mt-1">{ticket.department?.name} • {ticket.lab?.name || "General"}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${ticket.issueType === "HARDWARE"
                                                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                                                : "bg-primary/5 text-primary border-primary/10"
                                                                }`}>
                                                                {ticket.issueType}
                                                            </span>
                                                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                                                                <Clock className="h-3 w-3" aria-hidden="true" />
                                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getUnifiedStatus(ticket.status) === "RESOLVED" ? "bg-green-100 text-green-700" :
                                                        getUnifiedStatus(ticket.status) === "IN_PROCESS" ? "bg-orange-100 text-orange-700" :
                                                            "bg-primary/10 text-primary"
                                                        }`}>
                                                        {getUnifiedStatus(ticket.status).replace('_', ' ')}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-10 text-center text-muted-foreground text-sm">No requests in the queue</div>
                                    )
                                ) : activeQueue === "REQUESTS" ? (
                                    filteredRequests.length > 0 ? filteredRequests.slice(0, 5).map((request, index) => (
                                        <div
                                            key={request.id}
                                            className="p-5 hover:bg-muted/30 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${request.priority === "CRITICAL" ? "bg-destructive" : "bg-orange-500"}`} />
                                                    <div>
                                                        <h4 className="font-medium text-foreground text-sm">
                                                            {request.title}
                                                        </h4>
                                                        <p className="text-muted-foreground text-xs mt-1">From: {request.createdBy.name} ({request.department.code})</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary border border-primary/10">
                                                                {request.type.replace('_', ' ')}
                                                            </span>
                                                            <span className="text-muted-foreground text-xs font-medium">Approved by Dean</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getUnifiedStatus(request.status) === "RESOLVED" ? "bg-green-100 text-green-700" :
                                                        getUnifiedStatus(request.status) === "IN_PROCESS" ? "bg-orange-100 text-orange-700" :
                                                            "bg-primary/10 text-primary"
                                                        }`}>
                                                        {getUnifiedStatus(request.status).replace('_', ' ')}
                                                    </span>
                                                    {request.type !== "ACCOUNT_APPROVAL" && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setIsProcessingModalOpen(true);
                                                            }}
                                                            className="text-xs font-medium text-primary hover:underline mt-1"
                                                        >
                                                            Process Request
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-10 text-center text-muted-foreground text-sm">No approved resource requests</div>
                                    )
                                ) : (
                                    inventoryRequests.length > 0 ? inventoryRequests.map((request: any, index: number) => (
                                        <div
                                            key={request.id}
                                            className="p-5 hover:bg-muted/30 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0 bg-primary" />
                                                    <div>
                                                        <h4 className="font-medium text-foreground text-sm">
                                                            {request.inventoryItem?.name} {request.quantity > 1 ? `×${request.quantity}` : ""}
                                                        </h4>
                                                        <p className="text-muted-foreground text-xs mt-1">{request.remarks || "No remarks"}</p>
                                                        {(request.department || request.lab) && (
                                                            <p className="text-muted-foreground text-xs mt-1">
                                                                For: {request.department?.code || "N/A"}{request.lab ? ` — ${request.lab.name}` : ""}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary border border-primary/10">
                                                                PERIPHERAL
                                                            </span>
                                                            <span className="text-muted-foreground text-xs font-medium">Sent to Dean</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${request.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                                        request.status === "DECLINED" ? "bg-red-100 text-red-700" :
                                                            "bg-orange-100 text-orange-700"
                                                        }`}>
                                                        {request.status}
                                                    </span>
                                                    {request.status === "APPROVED" && (
                                                        <p className="text-xs font-medium text-muted-foreground">Allocated</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-10 text-center text-muted-foreground text-sm">No peripheral requests made</div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Service Performance */}
                    <div className="space-y-6">
                        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                            <h2 className="text-base font-semibold text-foreground mb-5">Service Performance</h2>
                            <div className="space-y-4">
                                {[
                                    { label: "Success Rate", value: 98, color: "bg-primary" },
                                    { label: "SLA Compliance", value: 94, color: "bg-secondary-foreground" },
                                    { label: "Uptime (Global)", value: 99.9, color: "bg-primary" },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-foreground">{item.label}</span>
                                            <span className="text-muted-foreground">{item.value}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${item.color} rounded-full transition-all duration-700`}
                                                style={{ width: `${item.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* System Alert Panel */}
                        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                                <h3 className="text-sm font-semibold text-foreground">System Alert</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                There are high-priority hardware issues pending in CSE Lab 301. Immediate attention required.
                            </p>
                            <button
                                onClick={() => router.push("/tickets")}
                                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                View Tickets
                            </button>
                        </div>
                    </div>
                </div>

                <Modal
                    isOpen={isProcessingModalOpen}
                    onClose={() => setIsProcessingModalOpen(false)}
                    title="Process Resource Request"
                >
                    {selectedRequest && (
                        <div className="space-y-5">
                            <div className="p-4 bg-muted rounded-lg border border-border">
                                <h3 className="font-semibold text-foreground text-sm">{selectedRequest.requestNumber} · {selectedRequest.title}</h3>
                                <p className="text-muted-foreground text-sm mt-1">{selectedRequest.description}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Implementation Remarks</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Details about the implementation, asset numbers assigned, etc..."
                                    value={requestRemarks}
                                    onChange={(e) => setRequestRemarks(e.target.value)}
                                />
                            </div>

                            {selectedRequest.type === "LAB_SETUP" && (
                                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 space-y-3">
                                    <h4 className="text-xs font-medium text-destructive uppercase tracking-wide">Laboratory Provisioning Details</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Lab Code / Room</label>
                                            <input
                                                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder="e.g. CSE-101"
                                                value={labCode}
                                                onChange={(e) => setLabCode(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Max Capacity</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder="40"
                                                value={labCapacity}
                                                onChange={(e) => setLabCapacity(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Physical Location</label>
                                        <input
                                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="e.g. Block C, 3rd Floor"
                                            value={labLocation}
                                            onChange={(e) => setLabLocation(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleProcessRequest("IN_PROGRESS")}
                                    disabled={processingRequest}
                                    className="py-2.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors"
                                >
                                    {processingRequest ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Start Work"}
                                </button>
                                <button
                                    onClick={() => handleProcessRequest("COMPLETED")}
                                    disabled={processingRequest}
                                    className="py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {processingRequest ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Mark Completed"}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                <RequestSparePartModal
                    isOpen={isRequestModalOpen}
                    onClose={() => setIsRequestModalOpen(false)}
                />
            </div>
        </div>
    );
}
