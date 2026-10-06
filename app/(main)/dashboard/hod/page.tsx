"use client";

import { useState } from "react";
import {
    Plus,
    History,
    Monitor,
    CheckCircle2,
    Clock,
    AlertCircle,
    LayoutGrid,
    ArrowRight,
    ClipboardList,
    ChevronRight,
    Loader2,
    Ticket
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HODDashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    const { data: stats, isLoading: loadingStats } = useSWR("/api/stats", fetcher, { revalidateOnFocus: false });
    const { data: requestsRaw, mutate: mutateRequests } = useSWR("/api/requests", fetcher);
    const { data: labsRaw, mutate: mutateLabs } = useSWR("/api/labs", fetcher, { revalidateOnFocus: false });
    const { data: usersRaw } = useSWR("/api/users?role=LAB_INCHARGE", fetcher, { revalidateOnFocus: false });
    const { data: ticketsRaw, mutate: mutateTickets } = useSWR("/api/tickets", fetcher, { revalidateOnFocus: false });

    const requests = Array.isArray(requestsRaw) ? requestsRaw : [];
    const labs = Array.isArray(labsRaw) ? labsRaw : [];
    const users = Array.isArray(usersRaw) ? usersRaw : [];
    const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : [];
    const loading = loadingStats;

    const [showHistory, setShowHistory] = useState(false);
    const [showAllTickets, setShowAllTickets] = useState(false);
    const [approvingTicketId, setApprovingTicketId] = useState<string | null>(null);

    // Modals
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    // Form States
    const [requestForm, setRequestForm] = useState({ title: "", description: "", type: "NEW_SYSTEM", priority: "NORMAL" });
    const [assignForm, setAssignForm] = useState({ labId: "", inchargeId: "" });
    const [submitting, setSubmitting] = useState(false);

    const handleRaiseRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        const deptId = session?.user?.departmentId;
        if (!deptId) {
            alert("Error: Your account is not associated with any department. Please contact the administrator.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...requestForm,
                    departmentId: deptId
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsRequestModalOpen(false);
                setRequestForm({ title: "", description: "", type: "NEW_SYSTEM", priority: "NORMAL" });
                await mutateRequests();
                alert(`Success! Request ${data.requestNumber} has been raised.`);
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || "Failed to raise request"}`);
            }
        } catch (error) {
            console.error("Failed to raise request", error);
            alert("An error occurred while submitting the request. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignIncharge = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/labs/${assignForm.labId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inchargeId: assignForm.inchargeId })
            });
            if (res.ok) {
                setIsAssignModalOpen(false);
                setAssignForm({ labId: "", inchargeId: "" });
                await mutateLabs();
            }
        } catch (error) {
            console.error("Failed to assign incharge", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveTicket = async (ticketId: string) => {
        setApprovingTicketId(ticketId);
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" })
            });
            if (res.ok) {
                await mutateTickets();
            } else {
                const err = await res.json();
                alert(`Failed to approve: ${err.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Failed to approve ticket", error);
        } finally {
            setApprovingTicketId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-10 space-y-8 text-foreground">
            {/* Page Header */}
            <DashboardHeader
                eyebrow="Departmental Management"
                title="Management Console"
                subtitle="Monitoring departmental assets and technical requests"
                actions={
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        New Resource Request
                    </button>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard
                    label="Total Assets"
                    value={stats?.totalSystems || 0}
                    badge="Live"
                    icon={Monitor}
                    href="/assets"
                    variant="primary"
                />
                <StatCard
                    label="Active Requests"
                    value={stats?.activeRequests || 0}
                    badge="Operational"
                    icon={History}
                    href="/dashboard/hod#request-pipeline"
                    variant="secondary"
                />
                <StatCard
                    label="Working Condition"
                    value={`${Math.round((stats?.workingSystems / stats?.totalSystems) * 100) || 0}%`}
                    badge="Optimal"
                    icon={CheckCircle2}
                    variant="muted"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Request Pipeline */}
                <div id="request-pipeline" className="scroll-mt-10 space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Request Pipeline</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Operational flow monitoring</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium rounded-lg flex items-center gap-2 transition-colors border border-border"
                        >
                            {showHistory ? "Active Only" : "Show History"}
                            <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", showHistory && "rotate-90")} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(Array.isArray(requests) ? requests : [])
                            .filter(r => showHistory ? true : ["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS"].includes(r.status))
                            .slice(0, 10)
                            .map((req) => (
                                <div
                                    key={req.id}
                                    className="p-4 bg-background rounded-lg border border-border flex items-center justify-between group hover:shadow-md hover:border-border/80 transition-all cursor-pointer"
                                    onClick={() => {
                                        setSelectedRequest(req);
                                        setIsDetailsModalOpen(true);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${req.status === "APPROVED" || req.status === "COMPLETED" ? "bg-green-50 text-green-600 border border-green-100" :
                                            req.status === "DECLINED" ? "bg-red-50 text-red-600 border border-red-100" :
                                                "bg-orange-50 text-orange-600 border border-orange-100"
                                            }`}>
                                            {req.status === "APPROVED" || req.status === "COMPLETED" ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> :
                                                req.status === "DECLINED" ? <AlertCircle className="h-5 w-5" aria-hidden="true" /> :
                                                    <Clock className="h-5 w-5" aria-hidden="true" />}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">{req.title}</h4>
                                            <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{req.requestNumber}</span>
                                                <span>·</span>
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${req.priority === "HIGH" || req.priority === "CRITICAL" ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {req.priority}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                                    </div>
                                </div>
                            ))}
                        {requests.filter(r => showHistory ? true : ["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS"].includes(r.status)).length === 0 && (
                            <div className="py-10 text-center text-muted-foreground text-sm">No {showHistory ? "" : "active "}requests in pipeline</div>
                        )}
                    </div>
                </div>

                {/* Labs Management */}
                <div id="lab-overseer" className="scroll-mt-10 space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LayoutGrid className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Lab Overseer</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Infrastructure provisioning</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setAssignForm({ labId: labs[0]?.id || "", inchargeId: "" });
                                setIsAssignModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                        >
                            Assign New Incharge
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(Array.isArray(labs) ? labs : []).map((lab, i) => (
                            <div key={lab.id} className="p-4 bg-background rounded-lg border border-border flex items-center justify-between group hover:shadow-md hover:border-border/80 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-semibold text-sm text-primary-foreground">
                                        {String(i + 1).padStart(2, '0')}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-foreground text-sm">{lab.name}</h4>
                                        <p className="text-muted-foreground text-xs mt-0.5">Incharge: <span className="text-foreground font-medium">{lab.incharge?.name || "Not Assigned"}</span></p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1.5">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        {lab.code}
                                    </span>
                                    <button
                                        onClick={() => router.push(`/assets?labId=${lab.id}`)}
                                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Manage assets →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pending Tickets — HOD approval queue */}
            <div id="ticket-queue" className="scroll-mt-10 space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Service Tickets</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Approve tickets from your department</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAllTickets(!showAllTickets)}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium rounded-lg flex items-center gap-2 transition-colors border border-border"
                    >
                        {showAllTickets ? "Pending Only" : "Show All"}
                        <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", showAllTickets && "rotate-90")} aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-2">
                    {tickets
                        .filter((t: any) => showAllTickets ? true : t.status === "SUBMITTED")
                        .slice(0, 10)
                        .map((ticket: any) => (
                            <div
                                key={ticket.id}
                                className="p-4 bg-background rounded-lg border border-border flex items-center justify-between group hover:shadow-md hover:border-border/80 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        ticket.status === "APPROVED" || ticket.status === "RESOLVED" ? "bg-green-50 text-green-600 border border-green-100" :
                                        ticket.status === "CLOSED" ? "bg-red-50 text-red-600 border border-red-100" :
                                        "bg-orange-50 text-orange-600 border border-orange-100"
                                    }`}>
                                        {ticket.status === "APPROVED" || ticket.status === "RESOLVED"
                                            ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                            : <Clock className="h-5 w-5" aria-hidden="true" />}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-foreground text-sm">{ticket.title}</h4>
                                        <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 bg-muted rounded">{ticket.ticketNumber}</span>
                                            <span>·</span>
                                            <span>{ticket.issueType}</span>
                                            <span>·</span>
                                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        ticket.status === "SUBMITTED" ? "bg-orange-100 text-orange-700" :
                                        ticket.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                        "bg-muted text-muted-foreground"
                                    }`}>
                                        {ticket.status}
                                    </span>
                                    {ticket.status === "SUBMITTED" && (
                                        <button
                                            id={`approve-ticket-${ticket.id}`}
                                            onClick={() => handleApproveTicket(ticket.id)}
                                            disabled={approvingTicketId === ticket.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            {approvingTicketId === ticket.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                            Approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    {tickets.filter((t: any) => showAllTickets ? true : t.status === "SUBMITTED").length === 0 && (
                        <div className="py-10 text-center text-muted-foreground text-sm">
                            No {showAllTickets ? "" : "pending "}tickets in your department
                        </div>
                    )}
                </div>
            </div>

            {/* Raise Request Modal */}
            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Raise Resource Request"
            >
                <form onSubmit={handleRaiseRequest} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Request Title</label>
                        <input
                            required
                            className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g., 20 New Systems for Lab 102"
                            value={requestForm.title}
                            onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Request Type</label>
                            <select
                                className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={requestForm.type}
                                onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}
                            >
                                <option value="NEW_SYSTEM">New Systems</option>
                                <option value="HARDWARE_REPAIR">Hardware Repair</option>
                                <option value="SOFTWARE_INSTALLATION">Software</option>
                                <option value="NETWORK_UPGRADE">Network</option>
                                <option value="LAB_SETUP">Lab Setup</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
                            <select
                                className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={requestForm.priority}
                                onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Please provide specific details about the requirement..."
                            value={requestForm.description}
                            onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                        />
                    </div>
                    <button
                        disabled={submitting}
                        className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Submit Official Request
                    </button>
                </form>
            </Modal>

            {/* Assign Incharge Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Lab Incharge"
            >
                <form onSubmit={handleAssignIncharge} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Lab</label>
                        <select
                            required
                            className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={assignForm.labId}
                            onChange={e => setAssignForm({ ...assignForm, labId: e.target.value })}
                        >
                            <option value="" disabled>Choose a lab...</option>
                            {labs.map(lab => (
                                <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Incharge</label>
                        <select
                            required
                            className="w-full p-3 bg-muted rounded-lg border-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={assignForm.inchargeId}
                            onChange={e => setAssignForm({ ...assignForm, inchargeId: e.target.value })}
                        >
                            <option value="" disabled>Choose a faculty member...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    </div>
                    <button
                        disabled={submitting}
                        className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Confirm Assignment
                    </button>
                </form>
            </Modal>

            {/* Request Details Modal (HOD view — read-only) */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Resource Request Details"
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedRequest.status === "APPROVED" || selectedRequest.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                    selectedRequest.status === "DECLINED" ? "bg-red-100 text-red-700" :
                                        "bg-orange-100 text-orange-700"
                                    }`}>
                                    {selectedRequest.status}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">{selectedRequest.requestNumber}</span>
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">{selectedRequest.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{selectedRequest.description}</p>
                        </div>

                        {selectedRequest.remarks && (
                            <div className={cn(
                                "p-4 rounded-lg border",
                                selectedRequest.status === "DECLINED" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
                            )}>
                                <h4 className={cn(
                                    "text-xs font-medium uppercase tracking-wide mb-2",
                                    selectedRequest.status === "DECLINED" ? "text-red-600" : "text-green-700"
                                )}>
                                    Dean's Remarks
                                </h4>
                                <p className="text-sm text-foreground">&quot;{selectedRequest.remarks}&quot;</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                                <p className="text-sm font-medium text-foreground">{selectedRequest.type.replace('_', ' ')}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
                                <p className="text-sm font-medium text-foreground">{selectedRequest.priority}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsDetailsModalOpen(false)}
                            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
