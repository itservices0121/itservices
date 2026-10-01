"use client";

import { useSession, signOut } from "next-auth/react";
import {
    Bell,
    Search,
    ChevronDown,
    Clock,
    User as UserIcon,
    Settings,
    LogOut
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Branding } from "@/components/Branding";

export function Header() {
    const { data: session } = useSession();
    const [activities, setActivities] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await fetch("/api/activities?limit=5");
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setActivities(data.slice(0, 5));

                        // Simple unread logic based on local storage
                        const lastSeen = localStorage.getItem("lastSeenActivity");
                        if (data.length > 0) {
                            if (!lastSeen || new Date(data[0].createdAt) > new Date(lastSeen)) {
                                setHasUnread(true);
                            }
                        }
                    } else {
                        setActivities([]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        if (session) {
            fetchActivities();
            // Poll every 60 seconds
            const interval = setInterval(fetchActivities, 60000);
            return () => clearInterval(interval);
        }
    }, [session]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = () => {
        if (activities.length > 0) {
            localStorage.setItem("lastSeenActivity", activities[0].createdAt);
            setHasUnread(false);
        }
    };

    if (!mounted) return <header className="sticky top-0 z-30 h-16 bg-card/80 border-b border-border" />;

    return (
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <Branding
                    text="VIGNAN INSTITUTE"
                    image="/vignan-logo-custom.svg"
                    size="md"
                    className="hidden xl:inline-flex opacity-80 hover:opacity-100 transition-opacity"
                />

                {/* Search */}
                <div className="relative hidden lg:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        aria-label="Search resources"
                        className="pl-9 pr-5 py-2.5 bg-muted border border-border rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            if (!showNotifications) markAsRead();
                        }}
                        aria-label="View notifications"
                        className="p-2 hover:bg-muted rounded-lg transition-colors relative"
                    >
                        <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        {hasUnread && (
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-card animate-pulse" />
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-md border border-border overflow-hidden z-50">
                            <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">System Alerts</h3>
                                <Link
                                    href="/notifications"
                                    onClick={() => setShowNotifications(false)}
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    View History
                                </Link>
                            </div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-border">
                                {activities.length > 0 ? (
                                    activities.map((act) => (
                                        <Link
                                            key={act.id}
                                            href="/notifications"
                                            onClick={() => setShowNotifications(false)}
                                            className="block p-4 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="flex gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-foreground line-clamp-1">{act.entity}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{act.details}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-muted-foreground">No recent activity</p>
                                    </div>
                                )}
                            </div>
                            <Link
                                href="/notifications"
                                onClick={() => setShowNotifications(false)}
                                className="block py-3 bg-primary text-primary-foreground text-center text-xs font-medium transition-colors hover:bg-primary/90"
                            >
                                View All Activity
                            </Link>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-border relative" ref={profileRef}>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-foreground">{session?.user?.name || "User"}</p>
                            <p className="text-xs text-primary">{session?.user?.role || "Member"}</p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-foreground overflow-hidden flex items-center justify-center">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="User avatar" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-4 w-4 text-background" aria-hidden="true" />
                            )}
                        </div>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            aria-label="Open profile menu"
                            aria-expanded={showProfileMenu}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${showProfileMenu ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                            <ChevronDown className={`h-4 w-4 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                    </div>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-3 w-52 bg-card rounded-xl shadow-md border border-border overflow-hidden z-50">
                            <div className="p-3.5 border-b border-border bg-muted/30">
                                <p className="text-xs text-muted-foreground">Authenticated User</p>
                                <p className="text-xs font-medium text-foreground line-clamp-1 mt-0.5">{session?.user?.email}</p>
                            </div>
                            <div className="p-1.5">
                                <Link
                                    href="/settings"
                                    onClick={() => setShowProfileMenu(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors group"
                                >
                                    <div className="p-1.5 bg-muted rounded-md group-hover:bg-card transition-colors">
                                        <Settings className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">Settings</span>
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-destructive/5 rounded-lg transition-colors group"
                                >
                                    <div className="p-1.5 bg-muted rounded-md group-hover:bg-destructive/10 transition-colors">
                                        <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" aria-hidden="true" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
