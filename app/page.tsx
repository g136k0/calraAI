'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailySummary } from '@/components/daily-summary';
import { ManualEntry } from '@/components/manual-entry';
import { EntriesList } from '@/components/entries-list';
import { HistorySection } from '@/components/history-section';
import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getFoodLogs, addFoodLog, deleteFoodLog, updateFoodLog, getGoals, updateGoals, getHistory } from './actions';
import { User } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { FoodDatabaseDialog } from '@/components/food-database-dialog';

// Re-export interface to match actions
export interface FoodEntry {
  id: string;
  name: string;
  weight: number;
  calories: number;
  protein: number;
  date: string; // Ensure date is string YYYY-MM-DD
  category: string;
}

interface DayData {
  date: string;
  calories: number;
  protein: number;
  entries: FoodEntry[];
}




export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(150);
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [historyData, setHistoryData] = useState<Map<string, DayData>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date().toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState(today);
  const [activeTab, setActiveTab] = useState('log');

  const supabase = createClient();

  useEffect(() => {
    // Check auth status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch data when user is present
  useEffect(() => {
    if (user) {
      loadData();
      loadHistory(currentMonth);
    }
  }, [user, currentMonth, viewDate]); // Reload when user changes

  const loadHistory = async (date: Date) => {
    try {
      const month = date.getMonth();
      const year = date.getFullYear();
      const history = await getHistory(month, year);

      // Convert Object to Map
      const map = new Map<string, DayData>(Object.entries(history));
      setHistoryData(map);
    } catch (error) {
      console.error('Failed to load history', error);
    }
  };

  const loadData = async () => {
    try {
      // Load goals
      const goals = await getGoals();
      setCalorieGoal(goals.calorie_goal);
      setProteinGoal(goals.protein_goal);

      // Load today's entries
      const entries = await getFoodLogs(viewDate);
      // Cast the result from action to FoodEntry[] to match state
      setTodayEntries(entries as unknown as FoodEntry[]);
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const todayData = {
    date: viewDate,
    calories: todayEntries.reduce((sum, e) => sum + e.calories, 0),
    protein: todayEntries.reduce((sum, e) => sum + e.protein, 0),
    entries: todayEntries,
  };



  const handleFoodAdded = async (food: any) => {
    const newEntry = { ...food, date: viewDate };

    // Optimistic
    setTodayEntries(prev => [...prev, newEntry]);

    try {
      // Persist
      await addFoodLog({
        name: food.name,
        weight: food.weight,
        calories: food.calories,
        protein: food.protein,
        date: viewDate,
        category: food.category || 'Snack',
      });
      // Optionally reload to get real IDs and synced state
      await loadData();
      await loadHistory(currentMonth);
    } catch (error) {
      console.error('Failed to persist food log:', error);
      // Revert optimistic update
      setTodayEntries(prev => prev.filter(e => e.id !== food.id));
      throw error; // Rethrow for component handling
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setTodayEntries(todayEntries.filter((e) => e.id !== id));
    await deleteFoodLog(id);
    loadHistory(currentMonth);
  };

  const handleUpdateEntry = async (id: string, updatedEntry: any) => {
    setTodayEntries(
      todayEntries.map((e) => (e.id === id ? updatedEntry : e))
    );
    await updateFoodLog(id, updatedEntry);
    loadHistory(currentMonth);
  };

  const handleGoalsChange = async (calories: number, protein: number) => {
    setCalorieGoal(calories);
    setProteinGoal(protein);
    await updateGoals(calories, protein);
  }

  const handleEditDate = (date: string) => {
    setViewDate(date);
    setActiveTab('log');
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Adjust for timezone to ensure we get the correct YYYY-MM-DD local string
      const offset = date.getTimezoneOffset();
      const correctDate = new Date(date.getTime() - (offset * 60 * 1000));
      setViewDate(correctDate.toISOString().split('T')[0]);
    }
  };

  const handlePrevDay = () => {
    const current = parseISO(viewDate);
    const prev = subDays(current, 1);
    handleDateSelect(prev);
  };

  const handleNextDay = () => {
    const current = parseISO(viewDate);
    const next = addDays(current, 1);
    handleDateSelect(next);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-1 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Caltra Logo"
                width={300}
                height={112}
                className="h-28 w-auto"
                priority
              />
            </div>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={parseISO(viewDate)}
                  onSelect={handleDateSelect}
                />
                {viewDate === today && (
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <DailySummary
              calorieGoal={calorieGoal}
              proteinGoal={proteinGoal}
              caloriesConsumed={todayData.calories}
              proteinConsumed={todayData.protein}
              onCalorieGoalChange={(c) => handleGoalsChange(c, proteinGoal)}
              onProteinGoalChange={(p) => handleGoalsChange(calorieGoal, p)}
            />



            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Food Logging</h2>
                <FoodDatabaseDialog />
              </div>

              <ManualEntry onFoodAdded={handleFoodAdded} />
            </div>

            <EntriesList
              entries={todayEntries}
              onDeleteEntry={handleDeleteEntry}
              onUpdateEntry={handleUpdateEntry}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistorySection
              currentMonth={currentMonth}
              historyData={historyData}
              calorieGoal={calorieGoal}
              proteinGoal={proteinGoal}
              onEditDate={handleEditDate}
              onMonthChange={handleMonthChange}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

