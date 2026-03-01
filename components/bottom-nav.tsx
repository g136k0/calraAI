"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, Dumbbell, LayoutDashboard } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-40 pb-safe">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                <Link
                    href="/dashboard"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/dashboard" ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                        }`}
                >
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="text-xs font-medium">Overview</span>
                </Link>
                <Link
                    href="/"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/" ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                        }`}
                >
                    <Utensils className="h-6 w-6" />
                    <span className="text-xs font-medium">Calorie Tracker</span>
                </Link>
                <Link
                    href="/fitness"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/fitness" ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                        }`}
                >
                    <Dumbbell className="h-6 w-6" />
                    <span className="text-xs font-medium">Fitness Tracker</span>
                </Link>
            </div>
        </div>
    );
}
