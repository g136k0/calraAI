"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Plus, X, Edit2 } from "lucide-react";
import { WorkoutRoutine, RoutineExercise, addExerciseToRoutine, deleteRoutineExercise, updateRoutineExercise } from "@/app/fitness/actions";

export function EditRoutineDialog({
    routine,
    onUpdated
}: {
    routine: WorkoutRoutine,
    onUpdated: () => Promise<void>
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Exercise form state
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const [exName, setExName] = useState("");
    const [exSets, setExSets] = useState("3");
    const [exReps, setExReps] = useState("8-12");

    const resetForm = () => {
        setEditingExerciseId(null);
        setExName("");
        setExSets("3");
        setExReps("8-12");
    };

    const handleSaveExercise = async () => {
        if (!exName.trim()) return;
        setLoading(true);
        try {
            if (editingExerciseId) {
                await updateRoutineExercise(editingExerciseId, {
                    name: exName,
                    target_sets: parseInt(exSets) || 3,
                    target_reps: exReps,
                });
            } else {
                await addExerciseToRoutine(routine.id, {
                    name: exName,
                    target_sets: parseInt(exSets) || 3,
                    target_reps: exReps,
                    rest_seconds: 90,
                    order_index: routine.exercises?.length || 0
                });
            }
            resetForm();
            await onUpdated();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExercise = async (id: string) => {
        setLoading(true);
        try {
            await deleteRoutineExercise(id);
            if (editingExerciseId === id) resetForm();
            await onUpdated();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (ex: RoutineExercise) => {
        setEditingExerciseId(ex.id);
        setExName(ex.name);
        setExSets(ex.target_sets.toString());
        setExReps(ex.target_reps);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 text-xs h-9">Edit</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-blue-600" />
                        Edit {routine.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Exercises</h4>
                        {routine.exercises && routine.exercises.length > 0 ? (
                            <div className="space-y-2">
                                {routine.exercises.map((ex, idx) => (
                                    <div key={ex.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400 font-medium text-sm w-4">{idx + 1}</span>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{ex.name}</p>
                                                <p className="text-xs text-gray-500">{ex.target_sets} sets x {ex.target_reps} reps</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => handleEditClick(ex)}
                                                disabled={loading}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteExercise(ex.id)}
                                                disabled={loading}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No exercises added yet.</p>
                        )}
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-3 pl-1">
                            <h4 className="font-semibold text-sm text-blue-900">
                                {editingExerciseId ? "Edit Exercise" : "Add New Exercise"}
                            </h4>
                            {editingExerciseId && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 px-2" onClick={resetForm}>
                                    Cancel Edit
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-4 lg:col-span-2 space-y-1">
                                <Label className="text-xs">Exercise Name</Label>
                                <Input
                                    placeholder="e.g. Bench Press"
                                    value={exName}
                                    onChange={(e) => setExName(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1 space-y-1">
                                <Label className="text-xs">Sets</Label>
                                <Input
                                    type="number"
                                    value={exSets}
                                    onChange={(e) => setExSets(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2 lg:col-span-1 space-y-1">
                                <Label className="text-xs">Reps</Label>
                                <Input
                                    placeholder="8-12"
                                    value={exReps}
                                    onChange={(e) => setExReps(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full mt-4 gap-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 bg-white"
                            variant="outline"
                            onClick={handleSaveExercise}
                            disabled={loading || !exName.trim()}
                        >
                            {editingExerciseId ? "Update Exercise" : <><Plus className="h-4 w-4" /> Add Exercise</>}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
