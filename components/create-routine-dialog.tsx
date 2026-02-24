"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Plus } from "lucide-react";

export function CreateRoutineDialog({ onRoutineCreated }: { onRoutineCreated: (name: string, notes: string) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onRoutineCreated(name, notes);
            setOpen(false);
            setName("");
            setNotes("");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Create Routine
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-blue-600" />
                        Create Workout Routine
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Routine Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Upper Body Power"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="e.g. Focus on progressive overload"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                    <div className="pt-2 flex justify-end">
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading ? "Creating..." : "Save Routine"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
