'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFoodItems, deleteFoodItem, FoodItem } from '@/app/actions';
import { Trash2, Search, Database, Plus } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FoodDatabaseDialogProps {
    onFoodAdded?: (food: any) => Promise<void>;
}

export function FoodDatabaseDialog({ onFoodAdded }: FoodDatabaseDialogProps) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<FoodItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadItems();
        }
    }, [open]);

    const loadItems = async () => {
        setLoading(true);
        const data = await getFoodItems();
        setItems(data);
        setLoading(false);
    };

    const handleAdd = async (item: FoodItem, category: string) => {
        if (!onFoodAdded) return;
        setLoading(true);
        try {
            await onFoodAdded({
                name: item.name,
                weight: item.serving_size,
                calories: Math.round((item.calories / 100) * item.serving_size),
                protein: Math.round((item.protein / 100) * item.serving_size * 10) / 10,
                category: category,
            });
            setOpen(false); // Optionally close on add, or keep open. Let's close it so user sees it in today's log.
        } catch (error) {
            console.error('Failed to add food:', error);
            alert('Failed to log food.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this food item?')) {
            await deleteFoodItem(id);
            loadItems();
        }
    };

    const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Database className="h-4 w-4" />
                    Saved Foods
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Food Database</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search foods..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {loading ? (
                        <p className="text-center text-gray-500 py-4">Loading...</p>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                            {search ? 'No matches found' : 'No saved foods yet'}
                        </p>
                    ) : (
                        filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {item.calories} cal / {item.protein}g protein (per 100g)
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                    {onFoodAdded && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    disabled={loading}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleAdd(item, 'Breakfast')}>
                                                    Breakfast
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAdd(item, 'Lunch')}>
                                                    Lunch
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAdd(item, 'Dinner')}>
                                                    Dinner
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAdd(item, 'Snack')}>
                                                    Snack
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={loading}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
