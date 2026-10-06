"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Shield,
    Save,
    CheckCircle2,
    Camera,
    Trash2,
    Loader2
} from "lucide-react";

export default function SettingsPage() {
    const { data: session, update } = useSession();
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || "");
            setEmail(session.user.email || "");
            setImage(session.user.image || null);
        }
    }, [session]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePhotoRemove = () => {
        setImage(null);
    };

    const handleSave = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const [res, imageRes] = await Promise.all([
                fetch(`/api/users/${session.user.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email })
                }),
                fetch(`/api/users/${session.user.id}/image`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image })
                })
            ]);
            if (res.ok && imageRes.ok) {
                // Update the session state with small payload to avoid cookie size errors
                await update({ name, email, image: !!image });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return <div className="p-6 lg:p-10 flex items-center justify-center min-h-[50vh]"><Loader2 className="h-10 w-10 animate-spin text-green-500" /></div>;

    return (
        <div className="p-6 lg:p-10 space-y-10 bg-slate-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">SYSTEM SETTINGS</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Manage your institutional preferences and profile</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-black text-sm rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {loading ? "SAVING..." : saved ? "PREFERENCES SAVED" : "SAVE CHANGES"}
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Main Content Area */}
                <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-10">
                        <section className="space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <User className="h-6 w-6 text-green-500" />
                                General Profile
                            </h2>

                            {/* Photo Upload Section */}
                            <div className="flex items-center gap-8 py-4">
                                <div className="relative group">
                                    <div className="h-24 w-24 rounded-3xl overflow-hidden bg-slate-50 border-2 border-slate-100 flex items-center justify-center relative">
                                        {image ? (
                                            <img src={image} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            <User className="h-10 w-10 text-slate-300" />
                                        )}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                        >
                                            <Camera className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handlePhotoChange}
                                        accept="image/*"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Profile Picture</p>
                                    <p className="text-xs text-slate-500 mb-4">PNG or JPG up to 2MB</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700 underline flex items-center gap-1"
                                        >
                                            Change Photo
                                        </button>
                                        {image && (
                                            <button
                                                onClick={handlePhotoRemove}
                                                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 underline flex items-center gap-1"
                                            >
                                                Remove Photo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-green-500 font-bold"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Dr. Robert Dean"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-green-500 font-bold"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="dean@example.com"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6 pt-10 border-t border-slate-50">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Bell className="h-6 w-6 text-orange-500" />
                                Notification Toggles
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { label: "Email alerts for new requests", desc: "Receive immediate notification when a lab incharge raises a request." },
                                    { label: "Maintenance reminders", desc: "Weekly digest of assets nearing warranty expiry." },
                                    { label: "Request approval updates", desc: "Get notified when the Dean acts on your resource requests." }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                                            <p className="text-xs text-slate-500">{item.desc}</p>
                                        </div>
                                        <div className="h-6 w-11 bg-green-600 rounded-full relative cursor-pointer shadow-inner">
                                            <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6 pt-10 border-t border-slate-50">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Shield className="h-6 w-6 text-green-500" />
                                Security Settings
                            </h2>
                            <button className="px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all">
                                Change Account Password
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
