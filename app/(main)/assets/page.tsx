"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    Monitor,
    MoreVertical,
    Loader2,
    Cpu,
    HardDrive,
    Activity,
    ChevronLeft,
    ChevronRight,
    Download,
    Trash2,
    Upload
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function AssetsPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-[#023e8a]" />
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-[#023e8a]" /></div>}>
            <AssetsContent />
        </Suspense>
    );
}

function AssetsContent() {
    const { data: session } = useSession();
    const canDelete = session?.user?.role === "DEAN";

    const searchParams = useSearchParams();
    const labIdParam = searchParams.get("labId");
    const statusParam = searchParams.get("status");

    const [assets, setAssets] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [filterLab, setFilterLab] = useState(labIdParam || "ALL");
    const [filterStatus, setFilterStatus] = useState(statusParam || "ALL");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const limit = 10;

    useEffect(() => {
        setFilterLab(labIdParam || "ALL");
    }, [labIdParam]);

    useEffect(() => {
        setFilterStatus(statusParam || "ALL");
    }, [statusParam]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchAssets();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchAssets();
    }, [filterType, filterLab, filterStatus, page]);

    const fetchInitialData = async () => {
        try {
            const [deptsRes, labsRes] = await Promise.all([
                fetch("/api/departments"),
                fetch("/api/labs")
            ]);
            const deptsData = await deptsRes.json();
            const labsData = await labsRes.json();
            setDepartments(Array.isArray(deptsData) ? deptsData : []);
            setLabs(Array.isArray(labsData) ? labsData : []);
        } catch (error) {
            console.error("Failed to fetch metadata", error);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            let url = `/api/assets?page=${page}&limit=${limit}&`;
            if (filterType !== "ALL") url += `type=${filterType}&`;
            if (filterLab !== "ALL") url += `labId=${filterLab}&`;
            if (filterStatus !== "ALL") url += `status=${filterStatus}&`;
            if (search) url += `search=${encodeURIComponent(search)}&`;

            const res = await fetch(url);
            const data = await res.json();
            setAssets(Array.isArray(data.assets) ? data.assets : []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.total || 0);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteAsset = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/assets/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchAssets();
            } else {
                alert("Failed to delete asset");
            }
        } catch (error) {
            console.error("Failed to delete asset", error);
        }
    };

    const handleUpdateLab = async (assetId: string, labId: string) => {
        try {
            const res = await fetch(`/api/assets/${assetId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ labId: labId === "NULL" ? null : labId }),
            });
            if (res.ok) fetchAssets();
        } catch (error) {
            console.error("Failed to update lab", error);
        }
    };

    const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const body = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                fetchAssets();
            }
        } catch (error) {
            console.error("Failed to add asset", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = () => {
        if (!assets || assets.length === 0) {
            alert("No assets to export");
            return;
        }

        const headers = ["Serial Number", "system code", "Processor", "Ram ", "HDD", "Lab Number"];
        const csvContent = [
            headers.join(","),
            ...assets.map((asset) => [
                `"${asset.serialNumber || ''}"`,
                `"${asset.assetNumber || ''}"`,
                `"${asset.processor || ''}"`,
                `"${asset.ram || ''}"`,
                `"${asset.hdd || ''}"`,
                `"${asset.lab?.code || asset.lab?.name || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "assets_export.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csv = event.target?.result as string;
            const lines = csv.split("\n");
            const rows = lines.slice(1).filter(line => line.trim() !== "");

            let successCount = 0;
            let failCount = 0;
            const errorMessages = new Set<string>();

            for (const row of rows) {
                const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length < 5) continue;

                let deptId = departments[0]?.id;
                if (cols[11]) {
                    const foundDept = departments.find(d => d.name === cols[11] || d.id === cols[11] || d.code === cols[11]);
                    if (foundDept) deptId = foundDept.id;
                }

                if (!deptId) {
                    failCount++;
                    errorMessages.add("Missing valid Department ID in column 12");
                    continue;
                }

                let labId = null;
                if (cols[4]) {
                    const foundLab = labs.find(l => l.code === cols[4] || l.name === cols[4] || l.id === cols[4]);
                    if (foundLab) labId = foundLab.id;
                }

                const body = {
                    assetNumber: cols[0],
                    processor: cols[1],
                    ram: cols[2],
                    hdd: cols[3],
                    status: ["ACTIVE", "UNDER_MAINTENANCE", "DAMAGED", "RETIRED"].includes(cols[5]?.toUpperCase()) ? cols[5].toUpperCase() : "ACTIVE",
                    name: cols[6] || `System ${cols[0]}`,
                    type: cols[7]?.toUpperCase() || "DESKTOP",
                    brand: cols[8] || "Generic",
                    model: cols[9] || "Generic",
                    macAddress: cols[10],
                    departmentId: deptId,
                    labId: labId,
                    category: "Computing"
                };

                try {
                    const res = await fetch("/api/assets", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                    });

                    if (res.ok) {
                        successCount++;
                    } else {
                        failCount++;
                        const errData = await res.json().catch(() => ({ error: res.statusText }));
                        errorMessages.add(errData.error || "Unknown server error");
                    }
                } catch (err: any) {
                    failCount++;
                    errorMessages.add(err.message || "Network/Client error");
                }
            }

            const errorSummary = errorMessages.size > 0 ? `\nErrors:\n${Array.from(errorMessages).join("\n")}` : "";
            alert(`Import complete.\nSuccess: ${successCount}\nFailed: ${failCount}${errorSummary}`);
            fetchAssets();
            e.target.value = "";
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 lg:p-10 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#344e41] tracking-tight">System Inventory</h1>
                    <p className="text-slate-500 font-medium">Complete record of institutional hardware and networking assets</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" id="import-assets" className="hidden" accept=".csv" onChange={handleImportFile} />
                    <button
                        onClick={() => document.getElementById('import-assets')?.click()}
                        className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Upload className="h-4 w-4" />
                        Import Assets
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Export Assets
                    </button>

                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-4 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white/50 flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                <div className="relative w-full md:w-[450px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#0077b6] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by System ID, MAC, or Name..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-100/50 border-none rounded-[20px] text-xs font-bold focus:ring-2 focus:ring-[#588157] transition-all placeholder:text-slate-400 text-[#344e41]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />
                    <select
                        className="bg-white border border-slate-100 rounded-[18px] text-[10px] font-black uppercase tracking-widest px-6 py-3 focus:ring-2 focus:ring-[#588157] cursor-pointer shadow-sm hover:bg-slate-50 transition-all text-[#344e41]"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="ALL">Hardware: All</option>
                        <option value="DESKTOP">Infrastructure: Desktop</option>
                        <option value="LAPTOP">End-User: Laptop</option>
                        <option value="SERVER">Node: Server</option>
                        <option value="ROUTER">Network: Router</option>
                    </select>
                    <select
                        className="bg-white border border-slate-100 rounded-[18px] text-[10px] font-black uppercase tracking-widest px-6 py-3 focus:ring-2 focus:ring-[#588157] cursor-pointer shadow-sm hover:bg-slate-50 transition-all text-[#344e41]"
                        value={filterLab}
                        onChange={(e) => setFilterLab(e.target.value)}
                    >
                        <option value="ALL">Location: All Labs</option>
                        {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <select
                        className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm transition-all border ${filterStatus === 'ALL' ? 'bg-white border-slate-100 text-[#344e41]' : 'bg-[#3a5a40] text-white border-[#3a5a40]'}`}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Status: All</option>
                        <option value="ACTIVE">Operational</option>
                        <option value="UNDER_MAINTENANCE">Maintenance</option>
                        <option value="DAMAGED">Compromised</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#3a5a40]" />
                        <p className="font-bold text-sm uppercase tracking-widest text-[#344e41]">Accessing Secure Records...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5">Serial No</th>
                                    <th className="px-6 py-5">Processor</th>
                                    <th className="px-6 py-5">RAM</th>
                                    <th className="px-6 py-5">HDD</th>
                                    <th className="px-6 py-5">Lab Number</th>
                                    <th className="px-6 py-5">System Code</th>
                                    <th className="px-6 py-5">Status</th>
                                    {canDelete && <th className="px-6 py-5 text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.length > 0 ? assets.map((asset, index) => (
                                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5 text-slate-900 font-bold text-xs">
                                            {asset.serialNumber || String((page - 1) * limit + index + 1).padStart(2, '0')}
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-900">{asset.processor || "N/A"}</td>
                                        <td className="px-6 py-5 text-slate-700 font-medium">{asset.ram || "N/A"}</td>
                                        <td className="px-6 py-5 text-slate-700 font-medium">{asset.hdd || "N/A"}</td>
                                        <td className="px-6 py-5">
                                            {canDelete ? (
                                                <select
                                                    className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#0077b6] w-full"
                                                    value={asset.labId || "NULL"}
                                                    onChange={(e) => handleUpdateLab(asset.id, e.target.value)}
                                                >
                                                    <option value="NULL">Unassigned</option>
                                                    {labs.map(l => <option key={l.id} value={l.id}>{l.code || l.name}</option>)}
                                                </select>
                                            ) : (
                                                <span className="font-black text-xs text-slate-500">{asset.lab?.code || asset.lab?.name || "Unassigned"}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <code className="text-[11px] font-black text-[#344e41] bg-[#dad7cd]/40 px-2.5 py-1 rounded-md border border-[#a3b18a]/30 italic">
                                                {asset.assetNumber}
                                            </code>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${asset.status === 'ACTIVE' ? 'bg-[#dad7cd]/60 text-[#344e41]' : 'bg-orange-100 text-orange-700'}`}>
                                                {asset.status === 'ACTIVE' ? 'Operational' : 'Maintenance'}
                                            </span>
                                        </td>
                                        {canDelete && (
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleDeleteAsset(asset.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={canDelete ? 8 : 7} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center grayscale opacity-50">
                                                <Monitor className="h-12 w-12 mb-4" />
                                                <p className="font-black text-sm uppercase tracking-widest">No matching assets found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {assets.length} of {totalCount} Assets • Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer">
                            <ChevronLeft className="h-4 w-4 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                if (pageNum > 0 && pageNum <= totalPages) {
                                    return (
                                        <button key={pageNum} onClick={() => setPage(pageNum)} className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all", page === pageNum ? "bg-[#023e8a] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>
                                            {pageNum}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer">
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Asset" className="max-w-2xl">
                <form onSubmit={handleAddAsset} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Name</label>
                            <input name="name" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Dell Optiplex 7090" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Number (Tag)</label>
                            <input name="assetNumber" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. CSE-PC-01" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Type</label>
                            <select name="type" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                <option value="DESKTOP">Desktop</option>
                                <option value="LAPTOP">Laptop</option>
                                <option value="SERVER">Server</option>
                                <option value="ROUTER">Router</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">MAC Address</label>
                            <input name="macAddress" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. 00:0A:95:9D:68:16" />
                            <input type="hidden" name="category" value="Computing" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</label>
                            <select name="departmentId" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab (Optional)</label>
                            <select name="labId" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                <option value="">Global / No Lab</option>
                                {labs.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processor</label>
                            <input name="processor" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Intel i7-12700" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">RAM</label>
                            <input name="ram" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. 16GB DDR4" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">HDD / SSD</label>
                            <input name="hdd" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. 512GB NVMe" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand / Model</label>
                            <input name="brand" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Dell Latitude" />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#03045e] text-white font-black rounded-2xl shadow-xl shadow-[#03045e]/10 hover:bg-[#023e8a] transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "REGISTER ASSET SYSTEM"}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
