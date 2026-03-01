"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings, LogOut, Bell, Loader2, User } from "lucide-react"

export function Header() {
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [name, setName] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            if (user) {
                setName(user.user_metadata?.full_name || "")
                setAvatarUrl(user.user_metadata?.avatar_url || "")
            }
        }
        fetchUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                setName(session.user.user_metadata?.full_name || "")
                setAvatarUrl(session.user.user_metadata?.avatar_url || "")
            }
        })
        return () => subscription.unsubscribe()
    }, [supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
    }

    const handleSaveProfile = async () => {
        setIsSaving(true)
        try {
            let finalAvatarUrl = avatarUrl;
            if (avatarFile && user) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `public/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                finalAvatarUrl = publicUrl;
            }

            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: name,
                    avatar_url: finalAvatarUrl
                }
            })
            if (!error) {
                setAvatarUrl(finalAvatarUrl);
                setAvatarFile(null);
                setIsSettingsOpen(false);
            } else {
                console.error("Failed to update profile", error)
            }
        } catch (error) {
            console.error("Failed to update profile", error)
        } finally {
            setIsSaving(false)
        }
    }

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

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
            <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="Caltra Logo"
                            className="h-10 w-auto"
                        />
                    </div>
                    {user && (
                        <div className="flex items-center gap-4">
                            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={avatarUrl} alt={name || "User"} className="object-cover" />
                                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                                    <User className="h-5 w-5" />
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{name || "User"}</p>
                                                <p className="text-xs leading-none text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DialogTrigger asChild>
                                            <DropdownMenuItem className="cursor-pointer">
                                                <Settings className="mr-2 h-4 w-4" />
                                                <span>Settings</span>
                                            </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={handleSignOut}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sign out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Profile Settings</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-4">
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">Display Name</Label>
                                                <Input
                                                    id="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Enter your name"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="avatarFile">Profile Picture</Label>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <Avatar className="h-16 w-16">
                                                        <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} alt={name || "User"} className="object-cover" />
                                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                                            <User className="h-8 w-8" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <Input
                                                        id="avatarFile"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                setAvatarFile(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save Profile
                                            </Button>
                                        </div>

                                        <div className="border-t pt-4 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-medium mb-1">Push Notifications</h4>
                                                <p className="text-sm text-gray-500 mb-3">Enable daily reminders to log your calories and stay on track.</p>
                                                <Button
                                                    onClick={subscribeToPush}
                                                    disabled={pushStatus === 'loading' || pushStatus === 'success'}
                                                    variant="outline"
                                                    className={`w-full ${pushStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800' : ''}`}
                                                >
                                                    {pushStatus === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                                                    {pushStatus === 'success' ? 'Notifications Enabled' : 'Enable Daily Reminders'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
