'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FoodEntry {
  id: string;
  name: string;
  weight: number;
  calories: number;
  protein: number;
  category?: string;
  time?: string;
}

interface EntriesListProps {
  entries: FoodEntry[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, entry: FoodEntry) => void;
}

export function EntriesList({
  entries,
  onDeleteEntry,
  onUpdateEntry,
}: EntriesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<FoodEntry | null>(null);

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);

  const startEdit = (entry: FoodEntry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const saveEdit = () => {
    if (editData && editingId) {
      onUpdateEntry(editingId, editData);
      setEditingId(null);
      setEditData(null);
    }
  };

  const categories = ['Breakfast', 'Dinner', 'Supper', 'Snack'];
  const groupedEntries = categories.map((category) => ({
    category,
    items: entries.filter((e) => (e.category || 'Snack') === category),
  }));

  // Handle entries with unknown categories fallback (legacy data)
  const unknownEntries = entries.filter(
    (e) => !categories.includes(e.category || 'Snack')
  );
  if (unknownEntries.length > 0) {
    if (groupedEntries.find((g) => g.category === 'Snack')) {
      groupedEntries.find((g) => g.category === 'Snack')?.items.push(...unknownEntries);
    }
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <p className="text-lg text-gray-600">No foods logged yet today</p>
          <p className="text-sm text-gray-500">🍽️ Start by uploading a photo or adding manually</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {groupedEntries.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <Card key={group.category} className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-800 font-semibold border-b border-gray-100 pb-2">
                  {group.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium w-1/3">
                          Food
                        </th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">
                          Weight
                        </th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">
                          Cals
                        </th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">
                          Prot
                        </th>
                        <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">

                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-2 text-gray-900 font-medium">{entry.name}</td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {entry.weight}g
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {entry.calories}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {entry.protein}g
                          </td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => startEdit(entry)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-xs opacity-60 hover:opacity-100 transition-opacity"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDeleteEntry(entry.id)}
                                className="text-red-600 hover:text-red-700 font-medium text-xs opacity-60 hover:opacity-100 transition-opacity"
                              >
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-0 shadow-sm mt-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Today</p>
              <div className="text-xs text-blue-600 mt-1">
                {totalCalories} kcals / {totalProtein}g protein
              </div>
            </div>
            <div className="text-right">
              {/* Visual summary could go here */}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingId(null);
          setEditData(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Food Entry</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Food Name
                </label>
                <Input
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Weight (g)
                </label>
                <Input
                  type="number"
                  value={editData.weight}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      weight: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Calories
                </label>
                <Input
                  type="number"
                  value={editData.calories}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      calories: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <Input
                  type="number"
                  value={editData.protein}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      protein: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.1"
                  className="mt-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveEdit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setEditData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
