"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSavedMeals, deleteSavedMeal, updateSavedMeal, SavedMeal } from '@/app/actions';
import { Trash2, Search, Database, Plus, Edit2, Camera, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SavedMealsDialogProps {
    onFoodAdded: (food: any) => Promise<void>;
}

export function SavedMealsDialog({ onFoodAdded }: SavedMealsDialogProps) {
    const [open, setOpen] = useState(false);
    const [meals, setMeals] = useState<SavedMeal[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Edit state
    const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCalories, setEditCalories] = useState('');
    const [editProtein, setEditProtein] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    useEffect(() => {
        if (open) {
            loadMeals();
        } else {
            setEditingMeal(null);
            resetEditForm();
        }
    }, [open]);

    const loadMeals = async () => {
        setLoading(true);
        const data = await getSavedMeals();
        setMeals(data);
        setLoading(false);
    };

    const handleAdd = async (meal: SavedMeal, category: string) => {
        setLoading(true);
        try {
            await onFoodAdded({
                name: meal.name,
                weight: 1, // Represents 1 meal
                calories: meal.calories,
                protein: meal.protein,
                category: category,
            });
            setOpen(false);
        } catch (error) {
            console.error('Failed to add meal:', error);
            alert('Failed to log meal.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this saved meal?')) {
            await deleteSavedMeal(id);
            loadMeals();
        }
    };

    const startEditing = (meal: SavedMeal) => {
        setEditingMeal(meal);
        setEditName(meal.name);
        setEditDescription(meal.description || '');
        setEditCalories(meal.calories.toString());
        setEditProtein(meal.protein.toString());
        setImagePreview(meal.image_url || null);
        setImageFile(null);
    };

    const resetEditForm = () => {
        setEditingMeal(null);
        setEditName('');
        setEditDescription('');
        setEditCalories('');
        setEditProtein('');
        setImagePreview(null);
        setImageFile(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMeal) return;
        setSaving(true);

        try {
            let imageUrl = editingMeal.image_url;

            // If they uploaded a new image, replace tracking URL
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('meals')
                    .upload(fileName, imageFile);

                if (!uploadError && data) {
                    const { data: publicUrlData } = supabase.storage
                        .from('meals')
                        .getPublicUrl(fileName);
                    imageUrl = publicUrlData.publicUrl;
                }
            }

            await updateSavedMeal(editingMeal.id, {
                name: editName,
                description: editDescription,
                calories: parseFloat(editCalories) || 0,
                protein: parseFloat(editProtein) || 0,
                image_url: imageUrl
            });

            resetEditForm();
            await loadMeals();
        } catch (error) {
            console.error('Failed to update meal:', error);
        } finally {
            setSaving(false);
        }
    };

    const filteredMeals = meals.filter((meal) =>
        meal.name.toLowerCase().includes(search.toLowerCase()) ||
        (meal.description && meal.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Database className="h-4 w-4" />
                    Saved Meals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{editingMeal ? 'Edit Saved Meal' : 'Saved Meals'}</DialogTitle>
                </DialogHeader>

                {editingMeal ? (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Meal Photo</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden relative aspect-square"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="h-6 w-6 text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 text-center px-2">Click to upload photo</span>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Meal Name</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full min-h-[80px] p-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Calories</label>
                                <Input
                                    type="number"
                                    value={editCalories}
                                    onChange={(e) => setEditCalories(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Protein (g)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={editProtein}
                                    onChange={(e) => setEditProtein(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSaveEdit}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={resetEditForm}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search meals..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-4">
                            {loading ? (
                                <p className="text-center text-gray-500 py-4">Loading...</p>
                            ) : filteredMeals.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">
                                    {search ? 'No matches found' : 'No saved meals yet'}
                                </p>
                            ) : (
                                filteredMeals.map((meal) => (
                                    <div
                                        key={meal.id}
                                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg group"
                                    >
                                        {meal.image_url ? (
                                            <img
                                                src={meal.image_url}
                                                alt={meal.name}
                                                className="w-16 h-16 rounded-md object-cover aspect-square bg-gray-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center shrink-0">
                                                <Database className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{meal.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                    {Math.round(meal.calories)} cal
                                                </span>
                                                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                                    {Math.round(meal.protein)}g pro
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Add to log"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        disabled={loading}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleAdd(meal, 'Breakfast')}>
                                                        Breakfast
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAdd(meal, 'Lunch')}>
                                                        Lunch
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAdd(meal, 'Dinner')}>
                                                        Dinner
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAdd(meal, 'Snack')}>
                                                        Snack
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Edit meal"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => startEditing(meal)}
                                                disabled={loading}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Delete meal"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(meal.id)}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
