"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
    User,
    Mail,
    Shield,
    MoreVertical,
    Plus,
    Search,
    Loader2,
    Building2,
    Briefcase,
    Trash2,
    Key,
    ShieldAlert,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/modal";

export default function UsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);

    const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

    const toggleDept = (deptId: string) => {
        setExpandedDepts(prev => prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]);
    };

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/api/departments");
            const data = await res.json();
            setDepartments(data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        setDeletingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchUsers();
                setShowOptionsId(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Failed to delete user", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleResetPassword = async (userId: string) => {
        if (!confirm("Are you sure you want to reset this user's password to 'admin123'?")) return;
        setResettingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: "admin123" }),
            });
            if (res.ok) {
                alert("Password successfully reset to 'admin123'");
                setShowOptionsId(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to reset password");
            }
        } catch (error) {
            console.error("Failed to reset password", error);
            alert("Failed to reset password");
        } finally {
            setResettingId(null);
        }
    };

    const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const body = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                fetchUsers();
            }
        } catch (error) {
            console.error("Failed to add user", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase().includes(search.toLowerCase()) ||
            user.email?.toLowerCase().includes(search.toLowerCase())) &&
        (
            session?.user?.role === "HOD" ? user.role === "LAB_INCHARGE" :
                session?.user?.role === "ADMIN" ? (user.role === "HOD" || user.role === "LAB_INCHARGE") :
                    session?.user?.role === "DEAN" ? (user.role === "HOD" || user.role === "ADMIN" || user.role === "DEAN") :
                        user.role === "HOD"
        )
    );

    const adminGroups = useMemo(() => {
        const deptMap = new Map();
        users.forEach(u => {
            if (u.role !== "HOD" && u.role !== "LAB_INCHARGE") return;

            const dId = u.departmentId || "GLOBAL";
            if (!deptMap.has(dId)) {
                deptMap.set(dId, { hod: null, labIncharges: [], departmentId: dId });
            }
            if (u.role === "HOD") {
                deptMap.get(dId).hod = u;
            } else {
                deptMap.get(dId).labIncharges.push(u);
            }
        });

        const groups: any[] = [];
        deptMap.forEach((group, dId) => {
            const hodMatches = group.hod && (group.hod.name?.toLowerCase().includes(search.toLowerCase()) || group.hod.email?.toLowerCase().includes(search.toLowerCase()));

            const matchedLabIncharges = group.labIncharges.filter((li: any) =>
                li.name?.toLowerCase().includes(search.toLowerCase()) || li.email?.toLowerCase().includes(search.toLowerCase())
            );

            if (hodMatches || matchedLabIncharges.length > 0) {
                groups.push({
                    hod: group.hod,
                    labIncharges: matchedLabIncharges,
                    departmentId: dId
                });
            }
        });
        return groups;
    }, [users, search]);

    const renderUserRow = (user: any, isChild: boolean = false, expandProps?: { hasChildren: boolean, isExpanded: boolean, onToggle: () => void }) => (
        <tr
            key={user.id}
            className={`hover:bg-muted/40 transition-colors group ${expandProps?.hasChildren ? 'cursor-pointer' : ''}`}
            onClick={expandProps?.hasChildren ? expandProps.onToggle : undefined}
        >
            <td className="px-6 py-4">
                <div className={`flex items-center ${isChild ? 'ml-10 relative' : ''}`}>
                    {isChild && (
                        <div className="absolute -left-6 top-1/2 w-5 h-px bg-border" />
                    )}
                    {expandProps && (
                        <div className="mr-3 -ml-2 text-muted-foreground">
                            {expandProps.hasChildren ? (
                                expandProps.isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <div className="w-4 h-4" />
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <User className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground text-sm">{user.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Mail className="h-3 w-3" aria-hidden="true" />
                                {user.email}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                    {user.role.replace('_', ' ')}
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-medium text-muted-foreground">
                        {user.department?.name || "Global / IT"}
                    </span>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-30" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Active</span>
                </div>
            </td>
            {(session?.user?.role === "DEAN" || session?.user?.role === "HOD") && (
                <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setShowOptionsId(showOptionsId === user.id ? null : user.id)}
                        aria-label={`Options for ${user.name}`}
                        className="p-2 bg-muted hover:bg-background rounded-lg border border-border hover:shadow-sm transition-all"
                    >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                    {showOptionsId === user.id && (
                        <div className="absolute right-8 top-12 w-52 bg-card rounded-xl shadow-md border border-border z-20 overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2">
                                <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                                <span className="text-xs font-medium text-muted-foreground">Admin Actions</span>
                            </div>
                            <button
                                onClick={() => handleResetPassword(user.id)}
                                disabled={resettingId === user.id}
                                className="w-full text-left px-4 py-3 text-foreground hover:bg-muted text-xs font-medium flex items-center gap-3 transition-colors border-b border-border"
                            >
                                {resettingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" /> : <Key className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                                Reset Password
                            </button>
                            <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingId === user.id}
                                className="w-full text-left px-4 py-3 text-destructive hover:bg-destructive/5 text-xs font-medium flex items-center gap-3 transition-colors"
                            >
                                {deletingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                Delete Account
                            </button>
                        </div>
                    )}
                </td>
            )}
        </tr>
    );

    return (
        <div className="p-6 lg:p-10 space-y-6 min-h-[calc(100vh-2rem)] bg-background">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                            {session?.user?.role === "HOD" ? "Lab Incharges" :
                                session?.user?.role === "ADMIN" ? "Department Heads & Lab Incharges" :
                                    "Department Heads"}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {session?.user?.role === "HOD"
                                ? "Directory of departmental laboratory leadership"
                                : session?.user?.role === "ADMIN"
                                    ? "Directory of institutional department leadership and lab incharges"
                                    : "Directory of institutional department leadership"}
                        </p>
                    </div>
                </div>

                {(session?.user?.role === "DEAN" || session?.user?.role === "HOD") && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        Register New
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        aria-label="Search users"
                        className="w-full pl-9 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Directory Table */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                        <p className="text-sm font-medium">Loading directory...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    <th className="px-6 py-4">User Information</th>
                                    <th className="px-4 py-4">Role</th>
                                    <th className="px-4 py-4">Department</th>
                                    <th className="px-4 py-4">Status</th>
                                    {(session?.user?.role === "DEAN" || session?.user?.role === "HOD") && (
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {session?.user?.role === "ADMIN" ? (
                                    adminGroups.map((group) => {
                                        const dId = group.departmentId;
                                        const hasLabIncharges = group.labIncharges.length > 0;
                                        const isExpanded = expandedDepts.includes(dId);

                                        return (
                                            <Fragment key={dId}>
                                                {group.hod && renderUserRow(
                                                    group.hod,
                                                    false,
                                                    {
                                                        hasChildren: hasLabIncharges,
                                                        isExpanded,
                                                        onToggle: () => toggleDept(dId)
                                                    }
                                                )}
                                                {(!group.hod || isExpanded) && group.labIncharges.map((li: any) =>
                                                    renderUserRow(li, !!group.hod)
                                                )}
                                            </Fragment>
                                        );
                                    })
                                ) : (
                                    filteredUsers.map((user) => renderUserRow(user))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Register New Account"
                className="max-w-md"
            >
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Name</label>
                        <input name="name" required className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground" placeholder="e.g. John Doe" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Address</label>
                        <input name="email" type="email" required className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground" placeholder="user@example.com" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</label>
                        <input name="password" type="password" required className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground" placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permission Role</label>
                        <select name="role" required className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground">
                            {session?.user?.role === "DEAN" ? (
                                <>
                                    <option value="ADMIN">System Admin</option>
                                    <option value="HOD">Department Head</option>
                                    <option value="DEAN">Academic Dean</option>
                                    <option value="LAB_INCHARGE">Lab Incharge</option>
                                </>
                            ) : session?.user?.role === "HOD" ? (
                                <option value="LAB_INCHARGE">Lab Incharge</option>
                            ) : (
                                <option value="USER">Standard User</option>
                            )}
                        </select>
                    </div>
                    {session?.user?.role === "DEAN" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</label>
                            <select name="departmentId" className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground">
                                <option value="">No Department (Global)</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}
                    {session?.user?.role === "HOD" && (
                        <input type="hidden" name="departmentId" value={session.user.departmentId || ""} />
                    )}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Create Account"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
