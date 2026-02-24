"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Dumbbell, Calendar as CalendarIcon, LineChart, Plus, Clock, Play, Trash2, Activity } from "lucide-react";
import { CreateRoutineDialog } from "@/components/create-routine-dialog";
import { EditRoutineDialog } from "@/components/edit-routine-dialog";
import { ScheduleWorkoutDialog } from "@/components/schedule-workout-dialog";
import { ActiveWorkoutDialog } from "@/components/active-workout-dialog";
import { getRoutines, createRoutine, WorkoutRoutine, getWorkouts, createWorkout, deleteWorkout, deleteRoutine } from "./actions";

export default function FitnessPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('progress');
    const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const supabase = createClient();

    useEffect(() => {
        // Check auth status
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                await fetchRoutines();
                await fetchWorkouts();
            }
            setLoading(false);
        };

        checkUser();

        // Listen for auth changes
        const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    fetchRoutines();
                    fetchWorkouts();
                } else {
                    setRoutines([]);
                    setWorkouts([]);
                }
            }
        );

        return () => subscription?.unsubscribe();
    }, [supabase.auth]);

    const fetchRoutines = async () => {
        const data = await getRoutines();
        setRoutines(data);
    };

    const fetchWorkouts = async () => {
        const data = await getWorkouts();
        setWorkouts(data);
    };

    const handleRoutineCreated = async (name: string, notes: string) => {
        await createRoutine(name, notes);
        await fetchRoutines();
    };

    const handleStartWorkout = async (routine: WorkoutRoutine) => {
        try {
            const offset = (new Date()).getTimezoneOffset();
            const correctDate = new Date((new Date()).getTime() - (offset * 60 * 1000));
            const dateStr = correctDate.toISOString().split('T')[0];

            await createWorkout(routine.id, routine.name, dateStr);
            await fetchWorkouts();
            setDate(new Date());
            setActiveTab('schedule');
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteWorkout = async (id: string) => {
        try {
            await deleteWorkout(id);
            await fetchWorkouts();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteRoutine = async (id: string) => {
        try {
            await deleteRoutine(id);
            await fetchRoutines();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const selectedDateStr = date ? (() => {
        const offset = date.getTimezoneOffset();
        const correctDate = new Date(date.getTime() - (offset * 60 * 1000));
        return correctDate.toISOString().split('T')[0];
    })() : "";

    // Filter workouts for the selected date
    const selectedDayWorkouts = workouts.filter(w => w.scheduled_date === selectedDateStr);

    const completedWorkouts = workouts.filter(w => w.exercises?.some((ex: any) => ex.sets?.some((s: any) => s.is_completed)));

    // Convert formatted strings back into Date objects honoring the exact day regardless of local time shift
    const workedOutDates = completedWorkouts
        .map(w => {
            if (!w.scheduled_date) return null;
            const parts = w.scheduled_date.split('-');
            // Use year, month (0-indexed), date mapping to safely construct localized timezone dates
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        })
        .filter(Boolean) as Date[];

    const totalSets = completedWorkouts.reduce((acc, w) => {
        return acc + (w.exercises?.reduce((acc2: number, ex: any) => {
            return acc2 + (ex.sets?.filter((s: any) => s.is_completed).length || 0);
        }, 0) || 0);
    }, 0);

    const exerciseCurrentWeights: Record<string, number> = {};
    completedWorkouts.forEach(w => {
        w.exercises?.forEach((ex: any) => {
            ex.sets?.forEach((s: any) => {
                if (s.is_completed && s.weight) {
                    if (!exerciseCurrentWeights[ex.name] || s.weight > exerciseCurrentWeights[ex.name]) {
                        exerciseCurrentWeights[ex.name] = s.weight;
                    }
                }
            });
        });
    });

    const getCategory = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('chest') || n.includes('bench') || n.includes('pec') || n.includes('pushup') || n.includes('fly') || n.includes('crossover') || n.includes('cross-over')) return 'Chest';
        if (n.includes('leg') || n.includes('squat') || n.includes('calf') || n.includes('calves') || n.includes('lunge') || n.includes('quad') || n.includes('hamstring') || n.includes('glute') || n.includes('rdl')) return 'Legs';
        if (n.includes('bicep') || n.includes('tricep') || n.includes('curl') || n.includes('extension') || n.includes('pushdown') || n.includes('skullcrusher')) return 'Arms';
        if (n.includes('shoulder') || n.includes('lateral') || n.includes('raise') || n.includes('overhead') || n.includes('ohp') || n.includes('military') || n.includes('delt')) return 'Shoulders';
        if (n.includes('back') || n.includes('pull') || n.includes('row') || n.includes('lat ') || n.includes('lat-') || n.includes('deadlift') || n.includes('chin') || n.includes('shrug')) return 'Back';
        if (n.includes('abs') || /\bab\b/.test(n) || /\babs\b/.test(n) || n.includes('core') || n.includes('crunch') || n.includes('plank') || n.includes('situp')) return 'Abs';
        return 'Other';
    };

    const currentWeightsList = Object.entries(exerciseCurrentWeights).sort((a, b) => b[1] - a[1]);
    const groupedWeights = currentWeightsList.reduce((acc, [name, weight]) => {
        const cat = getCategory(name);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push([name, weight]);
        return acc;
    }, {} as Record<string, [string, number][]>);

    const categoryOrder = ["Chest", "Arms", "Back", "Shoulders", "Legs", "Abs", "Other"];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 relative">
            {/* Auth Popup if not logged in */}
            {!user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <AuthDialog open={true} onOpenChange={() => { }} />
                </div>
            )}

            <div className={!user ? "blur-sm pointer-events-none" : ""}>
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
                                <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
                                    Sign Out
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fitness</h1>
                        {activeTab === 'routines' && (
                            <CreateRoutineDialog onRoutineCreated={handleRoutineCreated} />
                        )}
                        {activeTab === 'schedule' && date && (
                            <ScheduleWorkoutDialog routines={routines} date={date} onScheduled={fetchWorkouts} />
                        )}
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="progress" className="flex items-center gap-2">
                                <LineChart className="h-4 w-4 hidden sm:block" />
                                <span>Progress</span>
                            </TabsTrigger>
                            <TabsTrigger value="schedule" className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 hidden sm:block" />
                                <span>Schedule</span>
                            </TabsTrigger>
                            <TabsTrigger value="routines" className="flex items-center gap-2">
                                <Dumbbell className="h-4 w-4 hidden sm:block" />
                                <span>Routines</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="routines" className="space-y-6">
                            {routines.length === 0 ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>My Routines</CardTitle>
                                        <CardDescription>
                                            Create and manage your workout templates.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
                                            <Dumbbell className="h-12 w-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No routines yet</h3>
                                            <p className="text-sm text-gray-500 mb-4">Create your first workout routine to get started.</p>
                                            <CreateRoutineDialog onRoutineCreated={handleRoutineCreated} />
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {routines.map((routine) => (
                                        <Card key={routine.id} className="flex flex-col hover:border-blue-400 transition-colors shadow-sm">
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-lg flex justify-between items-start">
                                                    <span>{routine.name}</span>
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2 min-h-10">
                                                    {routine.notes || "No notes"}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <div className="flex items-center text-sm text-gray-500 gap-4 mb-4">
                                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                                        <Dumbbell className="h-3.5 w-3.5" />
                                                        <span>{routine.exercises?.length || 0} exercises</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>~45 min</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-gray-100">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activities</p>
                                                    <ul className="text-sm space-y-1.5 text-gray-700 max-h-[80px] overflow-hidden">
                                                        {routine.exercises?.slice(0, 3).map((ex) => (
                                                            <li key={ex.id} className="truncate whitespace-nowrap overflow-hidden">
                                                                • {ex.target_sets}x {ex.name}
                                                            </li>
                                                        ))}
                                                        {routine.exercises && routine.exercises.length > 3 && (
                                                            <li className="text-xs text-gray-400 italic">+{routine.exercises.length - 3} more</li>
                                                        )}
                                                        {!routine.exercises || routine.exercises.length === 0 && (
                                                            <li className="text-gray-400 italic">Add exercises...</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-gray-50 flex justify-between gap-2">
                                                <div className="flex gap-2 w-1/2">
                                                    <EditRoutineDialog routine={routine} onUpdated={fetchRoutines} />
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                        onClick={() => handleDeleteRoutine(routine.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    className="flex-1 gap-1 text-xs h-9 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleStartWorkout(routine)}
                                                >
                                                    <Play className="h-3.5 w-3.5" /> Start
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="md:col-span-1 border-0 shadow-sm">
                                    <CardContent className="p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            className="rounded-xl border w-full flex justify-center p-3 [&_.rdp-day_button[data-worked-out=true]]:bg-blue-100 [&_.rdp-day_button[data-worked-out=true]]:text-blue-700 [&_.rdp-day_button[data-worked-out=true]]:font-bold"
                                            modifiers={{ workedOut: workedOutDates }}
                                            modifiersStyles={{
                                                workedOut: {
                                                    backgroundColor: '#dbeafe',
                                                    color: '#1d4ed8',
                                                    fontWeight: 'bold',
                                                }
                                            }}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="md:col-span-2 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>
                                            {date ? (
                                                date.toDateString() === new Date().toDateString()
                                                    ? "Today's Workouts"
                                                    : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                                            ) : "Select a date"}
                                        </CardTitle>
                                        <CardDescription>
                                            Your scheduled workouts for this day.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedDayWorkouts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                                <CalendarIcon className="h-10 w-10 text-gray-300 mb-3" />
                                                <h3 className="text-base font-medium text-gray-900 mb-1">Rest Day</h3>
                                                <p className="text-sm text-gray-500 mb-4 max-w-sm">No workout scheduled yet. Take a break or add something new.</p>
                                                {date && <ScheduleWorkoutDialog routines={routines} date={date} onScheduled={fetchWorkouts} />}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedDayWorkouts.map(workout => (
                                                    <div key={workout.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                                                        <div className="flex gap-4 items-center mb-3 sm:mb-0">
                                                            <div className="bg-blue-100 p-2.5 rounded-full text-blue-700">
                                                                <Dumbbell className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{workout.name}</h4>
                                                                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                                    <Clock className="h-3.5 w-3.5" /> Scheduled
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                                            <ActiveWorkoutDialog
                                                                workout={workout}
                                                                onUpdated={fetchWorkouts}
                                                                triggerLayout="button"
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                                onClick={() => handleDeleteWorkout(workout.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="progress" className="space-y-6">
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>My Progress Overview</CardTitle>
                                    <CardDescription>
                                        Summary of your fitness journey so far.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                        <div className="flex flex-col items-center justify-center py-6 px-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <Dumbbell className="h-8 w-8 text-blue-500 mb-2" />
                                            <p className="text-3xl font-bold text-blue-900">{completedWorkouts.length}</p>
                                            <p className="text-xs font-medium text-blue-700 mt-1 uppercase tracking-wider">Workouts Done</p>
                                        </div>
                                        <div className="flex flex-col items-center justify-center py-6 px-4 bg-violet-50 rounded-xl border border-violet-100">
                                            <Activity className="h-8 w-8 text-violet-500 mb-2" />
                                            <p className="text-3xl font-bold text-violet-900">{totalSets}</p>
                                            <p className="text-xs font-medium text-violet-700 mt-1 uppercase tracking-wider">Sets Completed</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Weights (Personal Records)</CardTitle>
                                    <CardDescription>
                                        Your highest recorded weights for each exercise.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {currentWeightsList.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                            <Dumbbell className="h-12 w-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No data available</h3>
                                            <p className="text-sm text-gray-500 mb-4">Complete a workout with logged weights to see them here.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {categoryOrder.map(cat => groupedWeights[cat] && groupedWeights[cat].length > 0 && (
                                                <div key={cat}>
                                                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                                        {cat}
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {groupedWeights[cat].map(([name, weight]) => (
                                                            <div key={name} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="bg-gray-100 p-2 rounded-full">
                                                                        <Dumbbell className="h-4 w-4 text-gray-600" />
                                                                    </div>
                                                                    <span className="font-medium text-gray-900 line-clamp-1">{name}</span>
                                                                </div>
                                                                <span className="text-lg font-bold text-blue-600 ml-2">{weight} <span className="text-sm font-normal text-gray-500">kg</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
