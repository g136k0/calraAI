"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Dumbbell } from "lucide-react";
import { WorkoutRoutine, createWorkout } from "@/app/fitness/actions";

export function ScheduleWorkoutDialog({
    routines,
    date,
    onScheduled
}: {
    routines: WorkoutRoutine[],
    date: Date,
    onScheduled: () => Promise<void>
}) {
    const [open, setOpen] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleSchedule = async (routine: WorkoutRoutine) => {
        setLoadingId(routine.id);
        try {
            // we use local date string yyyy-mm-dd
            const offset = date.getTimezoneOffset();
            const correctDate = new Date(date.getTime() - (offset * 60 * 1000));
            const dateStr = correctDate.toISOString().split('T')[0];

            await createWorkout(routine.id, routine.name, dateStr);
            setOpen(false);
            await onScheduled();
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" /> Schedule Workout
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schedule Workout</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Select a routine to schedule for <span className="font-semibold text-gray-900">{date.toDateString()}</span>
                    </p>

                    {routines.length === 0 ? (
                        <p className="text-sm italic text-gray-500 bg-gray-50 p-4 rounded-md text-center">
                            You don't have any routines yet. Create one first!
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {routines.map(routine => (
                                <button
                                    key={routine.id}
                                    disabled={loadingId !== null}
                                    onClick={() => handleSchedule(routine)}
                                    className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{routine.name}</p>
                                        <p className="text-xs text-gray-500">{routine.exercises?.length || 0} exercises</p>
                                    </div>
                                    <Dumbbell className="h-4 w-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
