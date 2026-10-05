"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Plus,
    FileUp,
    MapPin,
    Users,
    Monitor,
    MoreVertical,
    Loader2,
    ArrowRight,
    ShieldCheck,
    Building2,
    HardDrive,
    AlertCircle,
    Edit2,
    Trash2
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ImportLabsModal } from "@/components/labs/ImportLabsModal";

export default function LabsPage() {
    return (
        <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-[#3a5a40]" /></div>}>
            <LabsContent />
        </Suspense>
    );
}

function LabsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const deptId = searchParams.get("deptId");
    const { data: session } = useSession();

    const [labs, setLabs] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [hods, setHods] = useState<any[]>([]);
    const [labIncharges, setLabIncharges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterDept, setFilterDept] = useState(deptId || "ALL");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedLab, setSelectedLab] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allocatedHodId, setAllocatedHodId] = useState("");
    const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

    // Lab Request Form
    const [requestForm, setRequestForm] = useState({
        title: "",
        description: "",
        type: "LAB_SETUP",
        priority: "NORMAL"
    });

    useEffect(() => {
        fetchLabs();
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [deptsRes, hodsRes, inchargesRes] = await Promise.all([
                fetch("/api/departments"),
                fetch("/api/users?role=HOD"),
                fetch("/api/users?role=LAB_INCHARGE")
            ]);
            const deptsData = await deptsRes.json();
            const hodsData = await hodsRes.json();
            const inchargesData = await inchargesRes.json();
            setDepartments(Array.isArray(deptsData) ? deptsData : []);
            setHods(Array.isArray(hodsData) ? hodsData : []);
            setLabIncharges(Array.isArray(inchargesData) ? inchargesData : []);
        } catch (error) {
            console.error("Failed to fetch metadata", error);
        }
    };

    const fetchLabs = async () => {
        try {
            const res = await fetch("/api/labs");
            const data = await res.json();
            setLabs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch labs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLab = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const body = Object.fromEntries(formData.entries());

        const payload = {
            ...body,
            capacity: parseInt(body.capacity as string, 10) || 0,
        };

        try {
            const res = await fetch("/api/labs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setIsAddModalOpen(false);
                setAllocatedHodId("");
                fetchLabs();
            } else {
                setError(data.error || "Failed to provision lab space");
            }
        } catch (err: any) {
            console.error("Failed to add lab", err);
            setError("A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLab = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedLab) return;
        setIsSubmitting(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const body = Object.fromEntries(formData.entries());

        const payload = {
            ...body,
            capacity: parseInt(body.capacity as string, 10) || 0,
        };

        try {
            const res = await fetch(`/api/labs/${selectedLab.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setIsEditModalOpen(false);
                setSelectedLab(null);
                fetchLabs();
            } else {
                setError(data.error || "Failed to update laboratory");
            }
        } catch (err: any) {
            console.error("Failed to update lab", err);
            setError("A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLab = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to decommission the ${name} laboratory? All associated asset records will remain but will lose their lab assignment.`)) return;

        try {
            const res = await fetch(`/api/labs/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (res.ok) {
                fetchLabs();
            } else {
                alert(data.error || "Failed to delete laboratory");
            }
        } catch (err: any) {
            console.error("Failed to delete lab", err);
            alert("A network error occurred. Please try again.");
        }
    };

    const handleAssignIncharge = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedLab) return;
        setIsSubmitting(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const inchargeId = formData.get("inchargeId") as string;

        try {
            const res = await fetch(`/api/labs/${selectedLab.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inchargeId }),
            });
            const data = await res.json();

            if (res.ok) {
                setIsAssignModalOpen(false);
                setSelectedLab(null);
                fetchLabs();
            } else {
                setError(data.error || "Failed to assign incharge");
            }
        } catch (err: any) {
            console.error("Failed to assign incharge", err);
            setError("A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestLab = async (e: React.FormEvent) => {
        e.preventDefault();
        const deptId = session?.user?.departmentId;
        if (!deptId) {
            alert("Error: Your account is not associated with any department. Please contact the administrator.");
            return;
        }

        setIsSubmitting(true);
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
                setRequestForm({ title: "", description: "", type: "LAB_SETUP", priority: "NORMAL" });
                alert(`Success! Lab Request ${data.requestNumber} has been submitted to the Dean.`);
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || "Failed to submit request"}`);
            }
        } catch (error) {
            console.error("Failed to submit request", error);
            alert("An error occurred. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredLabs = labs.filter(lab => {
        const matchesDept = filterDept === "ALL" || lab.departmentId === filterDept;
        return matchesDept;
    });

    return (
        <div className="p-6 lg:p-10 space-y-10 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#344e41] tracking-tight tracking-tighter uppercase italic">Institutional <span className="text-[#3a5a40]">Laboratories</span></h1>
                    <p className="text-slate-500 font-medium font-bold uppercase text-[10px] tracking-widest mt-1">Technically equipped workspaces & specialized monitoring</p>
                </div>
                {(session?.user?.role === "DEAN") && (
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-[#344e41] text-[#344e41] font-black text-xs rounded-2xl hover:bg-[#344e41] hover:text-white shadow-xl shadow-[#344e41]/5 transition-all uppercase tracking-widest"
                        >
                            <FileUp className="h-5 w-5" />
                            Import from Excel
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-[#344e41] text-white font-black text-xs rounded-2xl hover:bg-[#3a5a40] shadow-xl shadow-[#344e41]/20 transition-all uppercase tracking-widest"
                        >
                            <Plus className="h-5 w-5" />
                            Create New Lab Space
                        </button>
                    </div>
                )}
                {session?.user?.role === "HOD" && (
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#344e41] text-white font-black text-xs rounded-2xl hover:bg-[#3a5a40] shadow-xl shadow-[#344e41]/20 transition-all uppercase tracking-widest"
                    >
                        <Building2 className="h-5 w-5" />
                        Request Laboratory Space
                    </button>
                )}
            </div>



            {loading ? (
                <div className="p-20 flex flex-col items-center justify-center text-slate-300">
                    <Loader2 className="h-12 w-12 animate-spin mb-4 text-[#3a5a40]" />
                    <p className="font-black text-xs uppercase tracking-[0.3em] italic text-[#344e41]">Accessing Lab Records</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {filteredLabs.length > 0 ? filteredLabs.map((lab) => (
                        <div key={lab.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#a3b18a]/30 transition-all group relative flex flex-col lg:flex-row gap-10">
                            <div className="lg:w-1/3">
                                <div className="h-40 w-full rounded-[40px] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center group-hover:bg-[#3a5a40] transition-colors duration-500 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.2))] group-hover:opacity-0 transition-opacity" />
                                    <Building2 className="h-10 w-10 text-slate-300 group-hover:text-white mb-2 relative z-10 transition-colors" />
                                    <p className="text-2xl font-black text-[#344e41] group-hover:text-white relative z-10 transition-colors uppercase">{lab.code}</p>
                                </div>
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{lab.location || "Building A, 4th Floor"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Users className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Capacity: {lab.capacity} Units</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-8 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-[#3a5a40] uppercase tracking-widest">{lab.department?.name}</span>
                                        <div className="relative">
                                            <button
                                                disabled={!(session?.user?.role === "DEAN")}
                                                onClick={() => setShowOptionsId(showOptionsId === lab.id ? null : lab.id)}
                                                className="p-2 text-slate-200 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl disabled:hidden"
                                            >
                                                <MoreVertical className="h-6 w-6" />
                                            </button>

                                            {showOptionsId === lab.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLab(lab);
                                                            setIsEditModalOpen(true);
                                                            setShowOptionsId(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-black uppercase tracking-widest"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                        Modify
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteLab(lab.id, lab.name);
                                                            setShowOptionsId(null);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-xs font-black uppercase tracking-widest"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Decommission
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-[#344e41] leading-tight uppercase tracking-tighter group-hover:text-[#3a5a40] transition-colors">{lab.name}</h3>

                                    <div className="flex items-center gap-4 mt-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="h-10 w-10 bg-[#dad7cd]/60 rounded-2xl flex items-center justify-center text-[#3a5a40] font-bold">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Incharge</p>
                                            <p className="text-sm font-bold text-slate-900">{lab.incharge?.name || "Pending Assignment"}</p>
                                        </div>
                                        {session?.user?.role === "HOD" && (
                                            <button
                                                onClick={() => {
                                                    setSelectedLab(lab);
                                                    setIsAssignModalOpen(true);
                                                }}
                                                className="ml-auto text-[10px] font-black text-[#3a5a40] hover:text-[#344e41] uppercase tracking-widest underline underline-offset-4"
                                            >
                                                {lab.incharge ? "Reassign" : "Assign Now"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Managed Systems</p>
                                            <div className="flex items-center gap-2">
                                                <Monitor className="h-4 w-4 text-[#344e41]" />
                                                <span className="text-xl font-black text-[#344e41]">{lab._count?.assets || 0}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Rate</p>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="h-4 w-4 text-[#3a5a40]" />
                                                <span className="text-xl font-black text-[#344e41]">98%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/assets?labId=${lab.id}`)}
                                        className="p-5 bg-[#344e41] text-white rounded-3xl hover:bg-[#3a5a40] transition-all shadow-xl shadow-[#344e41]/10 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        Explore
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-slate-100">
                            <div className="inline-flex p-6 bg-[#dad7cd]/40 rounded-3xl mb-4">
                                <Building2 className="h-10 w-10 text-[#3a5a40]/40" />
                            </div>
                            <h3 className="text-xl font-black text-[#344e41] uppercase">No Laboratories Found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Lab Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setAllocatedHodId("");
                    setError(null);
                }}
                title="Establish New Laboratory"
                className="max-w-2xl"
            >
                <form onSubmit={handleAddLab} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab Name</label>
                            <input name="name" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#3a5a40]" placeholder="e.g. Advanced AI Lab" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab Code/Room</label>
                            <input name="code" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#3a5a40]" placeholder="e.g. CSE-601" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Location</label>
                        <input name="location" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" placeholder="e.g. Block C, 2nd Floor" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</label>
                            <select
                                name="departmentId"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]"
                                onChange={(e) => {
                                    const deptId = e.target.value;
                                    const dept = departments.find(d => d.id === deptId);
                                    if (dept?.hodId) {
                                        setAllocatedHodId(dept.hodId);
                                    } else {
                                        setAllocatedHodId("");
                                    }
                                }}
                            >
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity (Units)</label>
                            <input name="capacity" type="number" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" placeholder="40" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allocate to HOD (Department Lead)</label>
                        <select
                            name="inchargeId"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]"
                            value={allocatedHodId}
                            onChange={(e) => setAllocatedHodId(e.target.value)}
                        >
                            <option value="">Pending Allocation</option>
                            {hods.map(h => (
                                <option key={h.id} value={h.id}>
                                    {h.name} ({h.department?.code || 'UNASSIGNED'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#344e41] text-white font-black rounded-2xl shadow-xl shadow-[#344e41]/10 hover:bg-[#3a5a40] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Provision Lab Space"}
                    </button>
                </form>
            </Modal>

            {/* Edit Lab Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedLab(null);
                    setError(null);
                }}
                title="Modify Laboratory Workspace"
                className="max-w-2xl"
            >
                <form onSubmit={handleUpdateLab} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab Name</label>
                            <input name="name" defaultValue={selectedLab?.name} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab Code/Room</label>
                            <input name="code" defaultValue={selectedLab?.code} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Location</label>
                        <input name="location" defaultValue={selectedLab?.location} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</label>
                            <select
                                name="departmentId"
                                defaultValue={selectedLab?.departmentId}
                                required
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]"
                            >
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity (Units)</label>
                            <input name="capacity" type="number" defaultValue={selectedLab?.capacity} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Incharge</label>
                        <select
                            name="inchargeId"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0077b6]"
                            defaultValue={selectedLab?.inchargeId || ""}
                        >
                            <option value="">Pending Allocation</option>
                            {labIncharges.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#3a5a40] text-white font-black rounded-2xl shadow-xl shadow-[#3a5a40]/20 hover:bg-[#344e41] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "UPDATE LABORATORY CONFIG"}
                    </button>
                </form>
            </Modal>

            {/* Assign Incharge Modal (HOD Only) */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Lab Incharge"
                className="max-w-xl"
            >
                <form onSubmit={handleAssignIncharge} className="space-y-6">
                    <div className="p-6 bg-[#dad7cd]/50 rounded-3xl border border-[#a3b18a]/30 space-y-2">
                        <h4 className="text-sm font-black text-[#344e41] uppercase">Operational Lab: {selectedLab?.name}</h4>
                        <p className="text-xs text-[#3a5a40] opacity-80 uppercase tracking-widest font-bold font-black">{selectedLab?.code} • {selectedLab?.location}</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Lab Incharge</label>
                        <select
                            name="inchargeId"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0077b6] shadow-inner"
                            defaultValue={selectedLab?.inchargeId || ""}
                        >
                            <option value="">Pending Assignment</option>
                            {labIncharges.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsAssignModalOpen(false)}
                            className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 bg-[#344e41] text-white font-black rounded-2xl shadow-xl shadow-[#344e41]/10 hover:bg-[#3a5a40] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Assignment"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* HOD Request Lab Modal */}
            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Request New Laboratory Setup"
                className="max-w-xl"
            >
                <form onSubmit={handleRequestLab} className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Policy</h4>
                        <p className="text-xs text-slate-600 font-bold leading-relaxed">
                            Laboratory provisioning requires Dean's approval. Please specify the required infrastructure and capacity below.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Purpose / Lab Name</label>
                        <input
                            required
                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0077b6] shadow-sm"
                            placeholder="e.g. Specialized Cybersecurity Research Lab"
                            value={requestForm.title}
                            onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Justification & Requirements</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0077b6] shadow-sm"
                            placeholder="Describe the need for this space, expected student capacity, and specific technical requirements..."
                            value={requestForm.description}
                            onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Urgency Level</label>
                        <select
                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-[#0077b6] shadow-sm"
                            value={requestForm.priority}
                            onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}
                        >
                            <option value="LOW">Low - Future Planning</option>
                            <option value="NORMAL">Normal - Next Semester</option>
                            <option value="HIGH">High - Immediate Need</option>
                            <option value="CRITICAL">Critical - Urgent Expansion</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-[#344e41] text-white font-black rounded-3xl shadow-xl shadow-[#344e41]/20 hover:bg-[#3a5a40] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Building2 className="h-5 w-5" />}
                        Submit Space Proposal
                    </button>
                </form>
            </Modal>

            <ImportLabsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchLabs}
                onSubmit={async (file) => {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch("/api/labs/import", {
                        method: "POST",
                        body: formData
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Failed to import labs");
                    }
                }}
            />
        </div>
    );
}
