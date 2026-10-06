"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Ticket,
    Search,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    MoreVertical,
    Loader2,
    Filter,
    ArrowRight
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";

export default function TicketsPage() {
    const { data: session } = useSession();
    const [tickets, setTickets] = useState<any[]>([]);
    const [resourceRequests, setResourceRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [ticketsRes, requestsRes] = await Promise.all([
                fetch("/api/tickets"),
                fetch("/api/requests")
            ]);
            const ticketsData = await ticketsRes.json();
            const requestsData = await requestsRes.json();
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            setResourceRequests(Array.isArray(requestsData) ? requestsData : []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        fetchAllData();
    };

    const updateStatus = async (item: any, unifiedStatus: string) => {
        const id = item.id;
        const isRequest = item.itemCategory === 'RESOURCE_REQUEST';

        // Map unified UI status to database-specific enums
        let finalStatus = unifiedStatus;
        if (isRequest) {
            if (unifiedStatus === "PENDING") finalStatus = "PENDING";
            if (unifiedStatus === "QUEUED") finalStatus = "PENDING";
            if (unifiedStatus === "IN_PROCESS") finalStatus = "IN_PROGRESS";
            if (unifiedStatus === "DEPLOYED") finalStatus = "COMPLETED";
            if (unifiedStatus === "RESOLVED") finalStatus = "COMPLETED";
            if (unifiedStatus === "CLOSED") finalStatus = "DECLINED";
        } else {
            if (unifiedStatus === "PENDING") finalStatus = "SUBMITTED";
            if (unifiedStatus === "APPROVED") finalStatus = "APPROVED";
            if (unifiedStatus === "QUEUED") finalStatus = "QUEUED";
            if (unifiedStatus === "IN_PROCESS") finalStatus = "PROCESSING";
            if (unifiedStatus === "DEPLOYED") finalStatus = "DEPLOYED";
            if (unifiedStatus === "RESOLVED") finalStatus = "RESOLVED";
            if (unifiedStatus === "CLOSED") finalStatus = "CLOSED";
        }

        try {
            const endpoint = isRequest ? `/api/requests/${id}` : `/api/tickets/${id}`;
            await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: finalStatus })
            });
            fetchAllData();
        } catch (error) {
            console.error("Failed to update item", error);
        }
    };

    const getUnifiedStatus = (status: string) => {
        if (status === "SUBMITTED" || status === "PENDING") return "PENDING";
        if (status === "APPROVED") return "APPROVED";
        if (status === "QUEUED") return "QUEUED";
        if (status === "PROCESSING" || status === "ASSIGNED" || status === "IN_PROGRESS" || status === "IN_PROCESS") return "IN_PROCESS";
        if (status === "DEPLOYED") return "DEPLOYED";
        if (status === "RESOLVED" || status === "COMPLETED") return "RESOLVED";
        if (status === "CLOSED" || status === "DECLINED") return "CLOSED";
        return status;
    };

    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const safeRequests = Array.isArray(resourceRequests) ? resourceRequests : [];

    // Unified helper for counts
    const getCounts = () => {
        const newOpen =
            safeTickets.filter(t => ["SUBMITTED", "APPROVED", "QUEUED"].includes(t.status)).length +
            safeRequests.filter(r => ["PENDING", "APPROVED", "ASSIGNED"].includes(r.status)).length;

        const inProgress =
            safeTickets.filter(t => t.status === "PROCESSING" || t.status === "IN_PROGRESS" || t.status === "IN_PROCESS").length +
            safeRequests.filter(r => r.status === "IN_PROGRESS" || r.status === "IN_PROCESS").length;

        const resolved =
            safeTickets.filter(t => ["RESOLVED", "DEPLOYED"].includes(t.status)).length +
            safeRequests.filter(r => r.status === "COMPLETED" || r.status === "RESOLVED").length;

        return { newOpen, inProgress, resolved };
    };

    const counts = getCounts();

    const filteredTickets = safeTickets.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(search.toLowerCase())
    );

    const filteredRequests = safeRequests.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.requestNumber.toLowerCase().includes(search.toLowerCase())
    );

    const allItems = [
        ...filteredTickets.map(t => ({ ...t, itemCategory: 'TICKET' })),
        ...filteredRequests.map(r => ({ ...r, itemCategory: 'RESOURCE_REQUEST' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="p-6 lg:p-10 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#344e41] tracking-tight">Support Requests</h1>
                    <p className="text-slate-500 font-medium">Monitor and resolve infrastructure service requests</p>
                </div>
                {session?.user?.role === "LAB_INCHARGE" && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#344e41] text-white font-black text-sm rounded-2xl hover:bg-[#3a5a40] shadow-xl shadow-[#344e41]/20 transition-all font-black"
                    >
                        <Plus className="h-4 w-4" />
                        RAISE SUPPORT REQUEST
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Status Bubbles */}
                <div className="xl:col-span-1 space-y-4">
                    {[
                        { label: "New & Open", count: counts.newOpen, color: "text-[#3a5a40]", bg: "bg-[#dad7cd]/40" },
                        { label: "In Process", count: counts.inProgress, color: "text-orange-600", bg: "bg-orange-50" },
                        { label: "Resolved", count: counts.resolved, color: "text-[#344e41]", bg: "bg-[#a3b18a]/20" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-[#a3b18a]/30 transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.count}</p>
                            </div>
                            <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                <Ticket className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ticket List */}
                <div className="xl:col-span-3">
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <Clock className="h-6 w-6 text-slate-400" />
                                </div>
                                <h2 className="text-xl font-black text-[#344e41]">Service Queue</h2>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search requests..."
                                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#588157] transition-all w-48 text-[#344e41]"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {loading ? (
                                <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest flex flex-col items-center">
                                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#3a5a40]" />
                                    <p className="text-[#344e41] font-black italic">Loading Secure Queue...</p>
                                </div>
                            ) : (
                                allItems.map((item) => (
                                    <div key={item.id} className="p-8 hover:bg-slate-50/50 transition-all group">
                                        <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center">
                                            <div className="flex items-start gap-6">
                                                <div className={`mt-1 h-14 w-14 rounded-3xl flex items-center justify-center flex-shrink-0 font-black text-xs ${item.priority === "CRITICAL" || item.priority === "HIGH" ? "bg-red-50 text-red-600 border border-red-100" :
                                                    item.priority === "NORMAL" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                        "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                    }`}>
                                                    {item.priority.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${item.itemCategory === 'RESOURCE_REQUEST' ? 'bg-[#dad7cd]/60 text-[#344e41] border-[#a3b18a]/30' :
                                                            item.issueType === "HARDWARE" ? "bg-red-50 text-red-600 border-red-100" :
                                                                item.issueType === "SOFTWARE" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                    "bg-[#a3b18a]/20 text-[#3a5a40] border-[#a3b18a]/30"
                                                            }`}>
                                                            {item.itemCategory === 'RESOURCE_REQUEST' ? 'RESOURCE' : item.issueType}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{item.itemCategory === 'RESOURCE_REQUEST' ? item.requestNumber : item.ticketNumber}</span>
                                                        {item.itemCategory === 'RESOURCE_REQUEST' && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">Approved Request</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-bold text-[#344e41] group-hover:text-[#3a5a40] transition-colors uppercase tracking-tight">{item.title}</h4>
                                                    <p className="text-slate-500 text-sm mt-1 line-clamp-1">{item.description}</p>
                                                    <div className="flex items-center gap-4 mt-4">
                                                        {item.itemCategory === 'TICKET' && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ASSET: {item.asset?.assetNumber || "GENERAL"}</span>}
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">DEPT: {item.department?.code}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right mr-4 hidden md:block">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged By</p>
                                                    <p className="text-xs font-bold text-slate-700">{item.createdBy?.name}</p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${getUnifiedStatus(item.status) === "RESOLVED" ? "bg-[#344e41] text-white" :
                                                        getUnifiedStatus(item.status) === "IN_PROCESS" ? "bg-orange-500 text-white" :
                                                            "bg-[#3a5a40] text-white"
                                                        }`}>
                                                        {getUnifiedStatus(item.status).replace('_', ' ')}
                                                    </span>
                                                    {session?.user?.role === "ADMIN" && (
                                                        item.itemCategory === 'TICKET' && item.status === "SUBMITTED" ? (
                                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest px-2 py-1.5 border border-orange-200 rounded-lg bg-orange-50">
                                                                Awaiting HOD Approval
                                                            </span>
                                                        ) : (
                                                        <select
                                                            value={getUnifiedStatus(item.status)}
                                                            onChange={(e) => updateStatus(item, e.target.value)}
                                                            disabled={getUnifiedStatus(item.status) === "CLOSED" || item.type === "ACCOUNT_APPROVAL"}
                                                            className={`text-[10px] font-black border rounded-lg px-2 py-1.5 uppercase tracking-widest outline-none transition-all ${getUnifiedStatus(item.status) === "CLOSED" || item.type === "ACCOUNT_APPROVAL"
                                                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                                                : "text-[#3a5a40] bg-white border-[#a3b18a]/60 focus:ring-2 focus:ring-[#588157] cursor-pointer hover:border-[#a3b18a]/60"
                                                                }`}
                                                        >
                                                            {getUnifiedStatus(item.status) === "RESOLVED" || getUnifiedStatus(item.status) === "DEPLOYED" ? (
                                                                <>
                                                                    <option value="DEPLOYED">Deployed</option>
                                                                    <option value="RESOLVED">Resolved</option>
                                                                    <option value="CLOSED">Closed</option>
                                                                </>
                                                            ) : getUnifiedStatus(item.status) === "CLOSED" ? (
                                                                <option value="CLOSED">Closed</option>
                                                            ) : (
                                                                <>
                                                                    <option value="APPROVED">Approved</option>
                                                                    <option value="QUEUED">Queued</option>
                                                                    <option value="IN_PROCESS">In Process</option>
                                                                    <option value="DEPLOYED">Deployed</option>
                                                                    <option value="RESOLVED">Resolved</option>
                                                                </>
                                                            )}
                                                        </select>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Raise Request Modal */}
            <CreateTicketModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={refreshData}
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
                            // assetId is not provided by the current modal fields, passing null/undefined is fine
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
