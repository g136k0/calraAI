"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "../actions";
import { Flame, Activity, LayoutDashboard, Loader2, Bell } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({ currentStreak: 0, weeklyAverageCalories: 0, weeklyAverageProtein: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = async () => {
        try {
            setPushStatus('loading');
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                alert('Push notifications are not supported by your browser or iOS device (requires adding to Home Screen first!).');
                setPushStatus('error');
                return;
            }

            // iOS requires permission request to happen BEFORE any async boundary (like registering the SW)
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('Notification permission denied or ignored. You might need to check your system settings.');
                setPushStatus('error');
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error("VAPID public key not found in env.");
                setPushStatus('error');
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            const res = await fetch('/api/web-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'subscribe', subscription })
            });

            if (res.ok) {
                setPushStatus('success');
            } else {
                console.error('Failed to save subscription');
                setPushStatus('error');
            }
        } catch (error) {
            console.error('Error subscribing to push:', error);
            setPushStatus('error');
        }
    };

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

                    <div className="grid gap-3 grid-cols-2 sm:gap-6">
                        <Card className="shadow-sm border-orange-100 bg-gradient-to-br from-orange-50/50 to-white hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                                    <Flame className="h-4 w-4" />
                                    Current Streak
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                                <div className="text-2xl sm:text-4xl font-bold text-gray-900 break-words line-clamp-1">
                                    {stats.currentStreak} <span className="text-sm sm:text-lg font-medium text-gray-500">days</span>
                                </div>
                                <p className="mt-1 text-[10px] leading-tight sm:text-xs text-orange-600/80 font-medium">
                                    Keep it up!
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
                            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                                <div className="space-y-1">
                                    <div className="text-2xl sm:text-4xl font-bold text-gray-900 break-words line-clamp-1">
                                        {stats.weeklyAverageCalories} <span className="text-sm sm:text-lg font-medium text-gray-500">cal</span>
                                    </div>
                                    <div className="text-lg sm:text-2xl font-bold text-gray-900 break-words line-clamp-1">
                                        {stats.weeklyAverageProtein} <span className="text-sm sm:text-lg font-medium text-gray-500">g pro</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-8">
                        <Card className="shadow-sm border-gray-200">
                            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Bell className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Daily Reminders</h3>
                                        <p className="text-sm text-gray-500">Enable push notifications to never forget logging your calories.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={subscribeToPush}
                                    disabled={pushStatus === 'loading' || pushStatus === 'success'}
                                    className={`${pushStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white w-full sm:w-auto`}
                                >
                                    {pushStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {pushStatus === 'success' ? 'Enabled' : 'Enable Notifications'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
