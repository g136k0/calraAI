"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Dumbbell, Play, X } from "lucide-react";
import { completeWorkoutSet, uncompleteWorkoutSet } from "@/app/fitness/actions";
import { cn } from "@/lib/utils";

export function ActiveWorkoutDialog({
    workout,
    onUpdated,
    triggerLayout = "button"
}: {
    workout: any,
    onUpdated: () => Promise<void>,
    triggerLayout?: "button" | "card-action"
}) {
    const [open, setOpen] = useState(false);
    // local state to handle optimistic updates
    const [localWorkout, setLocalWorkout] = useState(workout);

    const handleSetToggle = async (exerciseIdx: number, setIdx: number, setId: string, currentWeight: number | null, currentReps: number | null, isCompleted: boolean) => {
        // optimistically update
        const updatedWorkout = { ...localWorkout };
        updatedWorkout.exercises[exerciseIdx].sets[setIdx].is_completed = !isCompleted;
        setLocalWorkout(updatedWorkout);

        try {
            if (isCompleted) {
                await uncompleteWorkoutSet(setId);
            } else {
                await completeWorkoutSet(setId, currentWeight, currentReps);
            }
            await onUpdated();
        } catch (e) {
            console.error(e);
            // revert
            const revertedWorkout = { ...localWorkout };
            revertedWorkout.exercises[exerciseIdx].sets[setIdx].is_completed = isCompleted;
            setLocalWorkout(revertedWorkout);
        }
    };

    const handleValueChange = (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
        const updatedWorkout = { ...localWorkout };
        const parsed = value ? parseFloat(value) : null;
        updatedWorkout.exercises[exerciseIdx].sets[setIdx][field] = parsed;
        setLocalWorkout(updatedWorkout);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) setLocalWorkout(workout); // sync on open
        }}>
            <DialogTrigger asChild>
                {triggerLayout === "button" ? (
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700">
                        View Workout
                    </Button>
                ) : (
                    <Button className="flex-1 gap-1 text-xs h-9 bg-blue-600 hover:bg-blue-700">
                        <Play className="h-3.5 w-3.5" /> Start
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-[85vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="p-4 border-b border-gray-100 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Dumbbell className="h-5 w-5 text-blue-600" />
                        {workout.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-gray-50/50">
                    {!localWorkout.exercises || localWorkout.exercises.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 italic">
                            No exercises found for this workout.
                        </div>
                    ) : (
                        localWorkout.exercises.map((ex: any, exIdx: number) => (
                            <div key={ex.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-900">{exIdx + 1}. {ex.name}</h4>
                                </div>
                                <div className="p-3">
                                    <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-gray-500 text-center px-2">
                                        <div className="col-span-2 text-left">Set</div>
                                        <div className="col-span-4">kg</div>
                                        <div className="col-span-4">Reps</div>
                                        <div className="col-span-2"><Check className="h-4 w-4 mx-auto" /></div>
                                    </div>

                                    <div className="space-y-2">
                                        {ex.sets.map((set: any, setIdx: number) => {
                                            const isComplete = set.is_completed;
                                            return (
                                                <div
                                                    key={set.id}
                                                    className={cn(
                                                        "grid grid-cols-12 gap-2 items-center p-2 rounded-md transition-colors",
                                                        isComplete ? "bg-green-50/50" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className="col-span-2 text-sm font-medium text-gray-600 pl-1">
                                                        {set.set_number}
                                                    </div>
                                                    <div className="col-span-4">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className={cn("h-8 text-center", isComplete && "bg-transparent border-0 font-medium text-green-800 focus-visible:ring-0 px-0")}
                                                            value={set.weight || ""}
                                                            onChange={(e) => handleValueChange(exIdx, setIdx, 'weight', e.target.value)}
                                                            disabled={isComplete}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className={cn("h-8 text-center", isComplete && "bg-transparent border-0 font-medium text-green-800 focus-visible:ring-0 px-0")}
                                                            value={set.reps || ""}
                                                            onChange={(e) => handleValueChange(exIdx, setIdx, 'reps', e.target.value)}
                                                            disabled={isComplete}
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex justify-center">
                                                        <button
                                                            onClick={() => handleSetToggle(exIdx, setIdx, set.id, set.weight, set.reps, isComplete)}
                                                            className={cn(
                                                                "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                                                                isComplete ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                                                            )}
                                                        >
                                                            <Check className="h-4 w-4" strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
