"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "../actions";
import { Flame, Activity, LayoutDashboard, Loader2 } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({ currentStreak: 0, weeklyAverageCalories: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUserAndStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const s = await getDashboardStats();
                setStats(s);
            }
            setLoading(false);
        };
        fetchUserAndStats();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                getDashboardStats().then(setStats);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 relative pb-20">
            {!user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <AuthDialog open={true} onOpenChange={() => { }} />
                </div>
            )}

            <div className={!user ? 'blur-sm pointer-events-none' : ''}>
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/logo.png"
                                    alt="Caltra Logo"
                                    width={120}
                                    height={40}
                                    className="h-10 w-auto"
                                    priority
                                />
                            </div>
                            {user && (
                                <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
                    <div className="mb-8 mt-2">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl flex items-center gap-2">
                            <LayoutDashboard className="h-7 w-7 text-blue-600" />
                            Overview
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Track your consistency and monitor your weekly averages.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="shadow-sm border-orange-100 bg-gradient-to-br from-orange-50/50 to-white hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                                    <Flame className="h-4 w-4" />
                                    Current Streak
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-gray-900">
                                    {stats.currentStreak} <span className="text-lg font-medium text-gray-500">days</span>
                                </div>
                                <p className="mt-1 text-xs text-orange-600/80 font-medium">
                                    Keep it up! Consistency is key.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/50 to-white hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    7-Day Average
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-gray-900">
                                    {stats.weeklyAverageCalories} <span className="text-lg font-medium text-gray-500">cal/day</span>
                                </div>
                                <p className="mt-1 text-xs text-blue-600/80 font-medium">
                                    Your average consumption over the last week.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
