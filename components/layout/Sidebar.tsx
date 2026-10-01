"use client";

import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Building2,
    Server,
    Ticket,
    Bell,
    Settings,
    LogOut,
    Shield,
    Monitor,
    Wrench,
    Activity,
    User,
    Layers
} from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const getDashboardHref = () => {
        if (!session?.user?.role) return "/login";
        return `/dashboard/${session.user.role.toLowerCase().replace('_', '-')}`;
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const sidebarLinks = [
        { name: "Dashboard", href: getDashboardHref(), icon: LayoutDashboard },
        { name: "Departments", href: "/departments", icon: Building2 },
        { name: "Labs", href: "/labs", icon: Server },
        { name: "Assets", href: "/assets", icon: Monitor },
        { name: "Allocate Systems", href: "/assets", icon: Layers, deanOnly: true },
        { name: "Requests", href: "/tickets", icon: Wrench },
        { name: "Users", href: "/users", icon: User },
        { name: "History", href: "/notifications", icon: Activity },
    ];

    const filteredLinks = sidebarLinks.filter((link: any) => {
        const role = session?.user?.role;

        // Dean-only links
        if (link.deanOnly && role !== "DEAN") return false;

        // Hide Departments for HOD and ADMIN
        if (role === "HOD" && link.name === "Departments") return false;
        if (role === "ADMIN" && link.name === "Departments") return false;

        // Hide specific links for Lab Incharge
        if (role === "LAB_INCHARGE") {
            const hiddenLinks = ["Departments", "Labs", "Users"];
            if (hiddenLinks.includes(link.name)) return false;
        }

        return true;
    });

    if (!mounted) return <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-zinc-950 border-r border-zinc-800/50" />;

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-zinc-950 text-white shadow-md transition-all duration-300 border-r border-zinc-800/50 flex flex-col">
            {/* Branding */}
            <div className="flex h-16 items-center gap-3 px-6 border-b border-zinc-800/50">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/95 p-1">
                    <img
                        src="/vignan-logo-custom.svg"
                        alt="Vignan Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                <h1 className="text-base font-semibold tracking-tight">
                    IT <span className="text-primary italic">SERVICES</span>
                </h1>
            </div>

            {/* Profile Summary */}
            <div className="mx-4 my-5 p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center font-medium text-sm border border-zinc-700 overflow-hidden text-primary shrink-0">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="h-full w-full object-cover" />
                        ) : (
                            session?.user?.name?.charAt(0) || "U"
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-white">{session?.user?.name || "User Account"}</p>
                        <p className="text-xs text-primary mt-0.5 font-medium">
                            {session?.user?.role?.replace('_', ' ') || "Guest"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 overflow-y-auto">
                <div className="radio-container" style={{ "--total-radio": filteredLinks.length } as any}>
                    {filteredLinks.map((link, index) => {
                        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                        return (
                            <Fragment key={link.name}>
                                <input
                                    type="radio"
                                    name="main-sidebar-nav"
                                    id={`link-${index}`}
                                    checked={isActive}
                                    readOnly
                                />
                                <Link
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-3.5 w-full px-4 py-3 relative transition-colors duration-200 rounded-lg !cursor-pointer",
                                        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                                    )}
                                >
                                    <link.icon
                                        className={cn(
                                            "h-4 w-4 shrink-0 transition-colors",
                                            isActive ? "text-primary" : ""
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span className="text-xs font-medium tracking-wide">
                                        {link.name}
                                    </span>
                                </Link>
                            </Fragment>
                        );
                    })}
                    <div className="glider-container">
                        <div className="glider" />
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-3 pb-6 mt-auto">
                <button
                    onClick={async () => {
                        await signOut({ redirect: false });
                        window.location.href = "/login";
                    }}
                    className="flex w-full items-center gap-3.5 px-4 py-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
