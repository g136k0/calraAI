"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Camera, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { addSavedMeal } from '@/app/actions';
import { motion } from 'framer-motion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LogMeals({ onFoodAdded }: { onFoodAdded: (food: any) => Promise<void> }) {
    const [description, setDescription] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ name: string, calories: number, protein: number } | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleAnalyze = async () => {
        if (!description.trim()) return;
        setAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await fetch('/api/analyze-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: description })
            });
            const data = await res.json();
            if (data.meal) {
                setAnalysisResult(data.meal);
            }
        } catch (error) {
            console.error('Failed to analyze meal', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveMeal = async (category: string) => {
        if (!analysisResult) return;
        setSaving(true);
        try {
            let imageUrl = undefined;
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
                } else {
                    console.error("Image upload failed", uploadError);
                }
            }

            // Immediately logically add the meal to today's entry
            await onFoodAdded({
                name: analysisResult.name,
                weight: 1,
                calories: analysisResult.calories,
                protein: analysisResult.protein,
                category: category,
            });

            // Also save it to Saved Meals for future use
            await addSavedMeal({
                name: analysisResult.name,
                description: description,
                calories: analysisResult.calories,
                protein: analysisResult.protein,
                image_url: imageUrl
            });

            setDescription('');
            setAnalysisResult(null);
            setImageFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error('Failed to save and log meal', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg">Add Meal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-lg border border-blue-100/50 flex items-center gap-2 text-blue-800">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-medium">Describe your entire meal in detail and we'll map out all of the nutrients.</span>
                </div>
                <div className="space-y-4">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="E.g. A large chicken wrap with lettuce and a tablespoon of mayo, paired with a small side of fries..."
                        className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />

                    {!analysisResult ? (
                        <div className="flex justify-end gap-2">
                            <Button onClick={handleAnalyze} size="sm" disabled={!description.trim() || analyzing} className="bg-blue-600 hover:bg-blue-700">
                                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Analyze Meal
                            </Button>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 pt-4 border-t border-gray-100"
                        >
                            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                                <div className="col-span-3 pb-2 border-b border-gray-200 mb-2">
                                    <p className="font-semibold text-gray-900">{analysisResult.name}</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{Math.round(analysisResult.calories)}</p>
                                    <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mt-1">Calories</p>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                                            {Math.round(analysisResult.protein)}g Protein
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Meal Cover Photo (Optional)</label>
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

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)}>Edit Description</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-medium">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                            Log Meal & Save
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleSaveMeal('Breakfast')}>
                                            Breakfast
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSaveMeal('Lunch')}>
                                            Lunch
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSaveMeal('Dinner')}>
                                            Dinner
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSaveMeal('Snack')}>
                                            Snack
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </motion.div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
