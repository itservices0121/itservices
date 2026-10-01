"use client";

import { useRouter } from "next/navigation";
import { Shield, GraduationCap, Users, Wrench, ArrowRight } from "lucide-react";

type RoleOption = {
    role: string;
    displayName: string;
    description: string;
    icon: any;
    route: string;
};

const roleOptions: RoleOption[] = [
    {
        role: "DEAN",
        displayName: "Dean",
        description: "Executive Management",
        icon: GraduationCap,
        route: "/login/dean"
    },
    {
        role: "HOD",
        displayName: "Head of Department",
        description: "Department Management",
        icon: Users,
        route: "/login/hod"
    },
    {
        role: "ADMIN",
        displayName: "System Admin",
        description: "IT Support & Maintenance",
        icon: Shield,
        route: "/login/admin"
    },
    {
        role: "LAB_INCHARGE",
        displayName: "Lab Incharge",
        description: "Laboratory Operations",
        icon: Wrench,
        route: "/login/lab-incharge"
    },
];

export default function RoleSelectionPage() {
    const router = useRouter();

    const handleRoleSelect = (role: RoleOption) => {
        router.push(role.route);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
            <div className="w-full max-w-6xl relative z-10">
                {/* Institutional Branding - Top Center */}
                <div className="flex flex-col items-center justify-center mb-12">
                    <div className="flex items-center gap-4 bg-card rounded-xl px-6 py-3 shadow-sm border border-border">
                        <div className="w-12 h-12 p-1 bg-white rounded-lg">
                            <img
                                src="/vignan-logo-custom.svg"
                                alt="Vignan Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex flex-col text-left">
                            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground leading-tight">
                                Vignan Institute of Technology and Science
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4 tracking-tight">
                        IT Services Asset Management
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Streamline your institution's IT infrastructure with intelligent asset tracking and service management
                    </p>
                </div>

                {/* Role Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {roleOptions.map((role) => {
                        const Icon = role.icon;
                        return (
                            <button
                                key={role.role}
                                onClick={() => handleRoleSelect(role)}
                                className="group relative bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-border text-left"
                            >
                                {/* Icon Container */}
                                <div className="relative w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                                    <Icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                                </div>

                                {/* Content */}
                                <div className="relative">
                                    <h3 className="text-base font-semibold text-foreground mb-1">
                                        {role.displayName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        {role.description}
                                    </p>
                                    <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors mt-auto">
                                        <span>Continue</span>
                                        <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className="text-center mt-12">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/50 rounded-lg border border-border shadow-sm">
                        <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Secure Authentication • Role-Based Access Control
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
