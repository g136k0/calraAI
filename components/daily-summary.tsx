'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface DailySummaryProps {
  calorieGoal: number;
  proteinGoal: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  onCalorieGoalChange: (value: number) => void;
  onProteinGoalChange: (value: number) => void;
}

export function DailySummary({
  calorieGoal,
  proteinGoal,
  caloriesConsumed,
  proteinConsumed,
  onCalorieGoalChange,
  onProteinGoalChange,
}: DailySummaryProps) {
  const [editingCalorie, setEditingCalorie] = useState(false);
  const [editingProtein, setEditingProtein] = useState(false);
  const [tempCalorie, setTempCalorie] = useState(calorieGoal.toString());
  const [tempProtein, setTempProtein] = useState(proteinGoal.toString());

  const caloriePercentage = Math.min((caloriesConsumed / calorieGoal) * 100, 100);
  const proteinPercentage = Math.min((proteinConsumed / proteinGoal) * 100, 100);
  const caloriesOver = Math.max(0, caloriesConsumed - calorieGoal);
  const proteinOver = Math.max(0, proteinConsumed - proteinGoal);

  const handleCalorieSave = () => {
    const val = parseInt(tempCalorie);
    if (!isNaN(val) && val > 0) {
      onCalorieGoalChange(val);
      setEditingCalorie(false);
    }
  };

  const handleProteinSave = () => {
    const val = parseInt(tempProtein);
    if (!isNaN(val) && val > 0) {
      onProteinGoalChange(val);
      setEditingProtein(false);
    }
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">Today's Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Calories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Daily Calorie Goal
              </label>
              {editingCalorie ? (
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={tempCalorie}
                    onChange={(e) => setTempCalorie(e.target.value)}
                    className="h-7 w-20 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleCalorieSave}
                    className="h-7 px-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingCalorie(true)}
                  className="text-sm font-bold text-green-600 hover:text-green-700 cursor-pointer"
                >
                  {calorieGoal} kcal
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">
                  {caloriesConsumed} kcal
                </span>
                {caloriesOver > 0 && (
                  <span className="text-sm font-medium text-red-600">
                    Over by {caloriesOver}
                  </span>
                )}
              </div>
              <Progress
                value={caloriePercentage}
                className="h-3 bg-gray-200"
              />
            </div>
          </div>

          {/* Protein */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Daily Protein Goal
              </label>
              {editingProtein ? (
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={tempProtein}
                    onChange={(e) => setTempProtein(e.target.value)}
                    className="h-7 w-20 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleProteinSave}
                    className="h-7 px-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingProtein(true)}
                  className="text-sm font-bold text-green-600 hover:text-green-700 cursor-pointer"
                >
                  {proteinGoal} g
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">
                  {proteinConsumed} g
                </span>
                {proteinOver > 0 && (
                  <span className="text-sm font-medium text-red-600">
                    Over by {proteinOver}
                  </span>
                )}
              </div>
              <Progress
                value={proteinPercentage}
                className="h-3 bg-gray-200"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
