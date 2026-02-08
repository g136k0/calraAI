'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchFoodItems, saveFoodItem, FoodItem } from '@/app/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DetectedFood {
  id: string;
  name: string;
  weight: number;
  calories: number;
  protein: number;
  category: string;
}

interface ManualEntryProps {
  onFoodAdded: (food: DetectedFood) => Promise<void>;
}

export function ManualEntry({ onFoodAdded }: ManualEntryProps) {
  const [foodName, setFoodName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<{
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
  } | null>(null);
  const [weight, setWeight] = useState('100');
  const [category, setCategory] = useState('Snack');

  // Manual mode state
  const [manualMode, setManualMode] = useState(false);
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');

  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFoodName(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const results = await searchFoodItems(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  };

  const selectSuggestion = (item: FoodItem) => {
    setFoodName(item.name);
    setAnalyzedFood({
      name: item.name,
      caloriesPer100g: item.calories,
      proteinPer100g: item.protein,
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setManualMode(false);
  };

  const handleAnalyze = async () => {
    if (!foodName.trim()) return;

    setLoading(true);
    setAnalyzedFood(null);
    setManualMode(false);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: foodName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze food');
      }

      const data = await response.json();
      if (data.food) {
        setAnalyzedFood(data.food);
      }
    } catch (error: any) {
      console.error('Error analyzing food:', error);
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateNutrients = () => {
    if (manualMode) {
      return {
        calories: parseInt(manualCalories) || 0,
        protein: parseFloat(manualProtein) || 0,
      };
    }
    if (!analyzedFood) return { calories: 0, protein: 0 };
    const weightNum = parseInt(weight) || 0;
    return {
      calories: Math.round((analyzedFood.caloriesPer100g / 100) * weightNum),
      protein: Math.round((analyzedFood.proteinPer100g / 100) * weightNum * 10) / 10,
    };
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      if (manualMode) {
        if (!foodName || !manualCalories || !manualProtein) return;
        const nutrients = calculateNutrients();
        const foodData = {
          id: Date.now().toString(),
          name: foodName,
          weight: parseInt(weight) || 0,
          calories: nutrients.calories,
          protein: nutrients.protein,
          category,
        };

        await onFoodAdded(foodData);
        await saveFoodItem({
          name: foodName,
          calories: nutrients.calories,
          protein: nutrients.protein,
          unit: 'g',
          serving_size: parseInt(weight) || 100,
        });
        resetForm();
      } else if (analyzedFood && weight) {
        const nutrients = calculateNutrients();
        const weightNum = parseInt(weight) || 100;
        const foodData = {
          id: Date.now().toString(),
          name: analyzedFood.name,
          weight: weightNum,
          calories: nutrients.calories,
          protein: nutrients.protein,
          category,
        };

        await onFoodAdded(foodData);
        await saveFoodItem({
          name: analyzedFood.name,
          calories: analyzedFood.caloriesPer100g,
          protein: analyzedFood.proteinPer100g,
          serving_size: 100,
          unit: 'g',
        });
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add food:', error);
      alert('Failed to log food. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFoodName('');
    setWeight('100');
    setAnalyzedFood(null);
    setCategory('Snack');
    setManualMode(false);
    setManualCalories('');
    setManualProtein('');
    setSuggestions([]);
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Add Food</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analyzedFood && !manualMode && (
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700">Food Name</label>
            <div className="flex gap-2">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="e.g. Grilled Chicken Breast"
                  value={foodName}
                  onChange={handleSearchChange}
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  onFocus={() => foodName.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => selectSuggestion(item)}
                      >
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.calories} cal / {item.protein}g protein (per 100g)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={loading || !foodName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => setManualMode(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Or enter details manually
              </button>
            </div>
          </div>
        )}

        {manualMode && (
          <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-4">
              Manual Entry Mode
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Food Name</label>
              <Input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Calories</label>
                <Input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Protein (g)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {/* Weight and Category Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Weight (g)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Meal</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select meal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Supper">Supper</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={loading || !foodName || !manualCalories || !manualProtein}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Adding...' : 'Add Entry'}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {analyzedFood && (
          <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-medium">AI Analysis Result:</p>
              <p>{analyzedFood.name}</p>
              <p className="text-xs text-blue-600 mt-1">
                {analyzedFood.caloriesPer100g} cal / {analyzedFood.proteinPer100g}g protein per 100g
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Weight (g)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Meal</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select meal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Supper">Supper</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600">Total Calories</p>
                <p className="font-bold text-gray-900">{calculateNutrients().calories}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Protein (g)</p>
                <p className="font-bold text-gray-900">{calculateNutrients().protein}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Adding...' : 'Add to Log'}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
