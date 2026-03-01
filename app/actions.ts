'use server';

import { createClient } from '@/lib/supabase/server';

export interface FoodEntry {
    id: string;
    name: string;
    weight: number;
    calories: number;
    protein: number;
    date: string;
    category: string;
}

export interface FoodItem {
    id: string;
    name: string;
    calories: number; // per 100g
    protein: number; // per 100g
    serving_size: number;
    unit: string;
}

interface DayData {
    date: string;
    calories: number;
    protein: number;
    entries: FoodEntry[];
}

export async function getFoodLogs(date: string) {
    const supabase = await createClient();

    // Construct the query range for the full day in UTC to catch all entries
    const startDate = `${date}T00:00:00.000Z`; // Start of day UTC
    const endDate = `${date}T23:59:59.999Z`;   // End of day UTC

    const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .gte('eaten_at', startDate)
        .lte('eaten_at', endDate)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching food logs:', error);
        return [];
    }

    if (!data) return [];

    // Map DB columns to FoodEntry interface
    return data.map((log: any) => ({
        id: log.id,
        name: log.food_name,
        weight: log.weight_g,
        calories: log.calories,
        protein: log.protein,
        date: log.eaten_at ? log.eaten_at.split('T')[0] : '', // Extract YYYY-MM-DD
        category: log.meal_type || 'Snack',
    }));
}

export async function addFoodLog(entry: Omit<FoodEntry, 'id'>) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    // Ensure we store a valid timestamp for the given date
    const eatenAt = new Date(entry.date).toISOString(); // Default to midnight or current time? 
    // Ideally use current time if entry.date matches today, or midnight if backfilling.
    // For simplicity, we use the provided date which is YYYY-MM-DD, making it midnight UTC.

    const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        food_name: entry.name,
        weight_g: entry.weight,
        calories: entry.calories,
        protein: entry.protein,
        eaten_at: eatenAt,
        meal_type: entry.category,
    });

    if (error) {
        console.error('Error adding food log:', error);
        throw new Error('Failed to add food log');
    }
}

export async function deleteFoodLog(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('food_logs').delete().eq('id', id);

    if (error) {
        console.error('Error deleting food log:', error);
        throw new Error('Failed to delete food log');
    }
}

export async function updateFoodLog(id: string, entry: Partial<FoodEntry>) {
    const supabase = await createClient();
    const updateData: any = {};

    if (entry.name) updateData.food_name = entry.name;
    if (entry.weight) updateData.weight_g = entry.weight;
    if (entry.calories) updateData.calories = entry.calories;
    if (entry.protein) updateData.protein = entry.protein;
    if (entry.category) updateData.meal_type = entry.category;

    const { error } = await supabase
        .from('food_logs')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating food log:', error);
        throw new Error('Failed to update food log');
    }
}

export interface SavedMeal {
    id: string;
    name: string;
    description: string;
    calories: number;
    protein: number;
    image_url?: string | null;
}

export async function getSavedMeals(): Promise<SavedMeal[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching saved meals:', error);
        return [];
    }
    return data;
}

export async function addSavedMeal(meal: Omit<SavedMeal, 'id'>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('saved_meals').insert({
        user_id: user.id,
        name: meal.name,
        description: meal.description,
        calories: meal.calories,
        protein: meal.protein,
        image_url: meal.image_url,
    });

    if (error) {
        console.error('Error adding saved meal:', error);
        throw new Error('Failed to save meal');
    }
}

export async function deleteSavedMeal(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('saved_meals').delete().eq('id', id);
    if (error) {
        console.error('Error deleting saved meal:', error);
        throw new Error('Failed to delete saved meal');
    }
}

export async function updateSavedMeal(id: string, meal: Partial<Omit<SavedMeal, 'id'>>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = {};
    if (meal.name !== undefined) updateData.name = meal.name;
    if (meal.description !== undefined) updateData.description = meal.description;
    if (meal.calories !== undefined) updateData.calories = meal.calories;
    if (meal.protein !== undefined) updateData.protein = meal.protein;
    if (meal.image_url !== undefined) updateData.image_url = meal.image_url;

    const { error } = await supabase
        .from('saved_meals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating saved meal:', error);
        throw new Error('Failed to update saved meal');
    }
}

export async function getGoals() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { calorie_goal: 2000, protein_goal: 150 };

    const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single(); // Existing table uses id primary key, but we query by user_id unique

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching goals:', error);
    }

    if (!data) {
        return { calorie_goal: 2000, protein_goal: 150 };
    }

    return {
        calorie_goal: data.calorie_goal,
        protein_goal: data.protein_goal,
    };
}

export async function updateGoals(calorie_goal: number, protein_goal: number) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    // Check if goals exist first to decide insert vs update, or use upsert on unique constraint
    // The DB constraint is on user_id (unique). Upsert should work.

    const { error } = await supabase.from('user_goals').upsert({
        user_id: user.id,
        calorie_goal,
        protein_goal,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }); // Specify conflict column if needed

    if (error) {
        console.error('Error updating goals:', error);
        throw new Error('Failed to update goals');
    }
}

export async function searchFoodItems(query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', `%${query}%`)
        .order('name');

    if (error) {
        console.error('Error searching food items:', error);
        return [];
    }
    return data;
}

export async function saveFoodItem(item: Omit<FoodItem, 'id'>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
        .from('food_items')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', item.name)
        .single();

    if (existing) return;

    const { error } = await supabase.from('food_items').insert({
        user_id: user.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        serving_size: item.serving_size || 100,
        unit: item.unit || 'g',
    });

    if (error) {
        console.error('Error saving food item:', error);
    }
}

export async function deleteFoodItem(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('food_items').delete().eq('id', id);

    if (error) {
        console.error('Error deleting food item:', error);
    }
}

export async function getFoodItems() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (error) {
        console.error('Error fetching food items:', error);
        return [];
    }
    return data;
}

export async function getHistory(month: number, year: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return {};

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const startStr = startOfMonth.toISOString();

    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const endStr = endOfMonth.toISOString();

    const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('eaten_at', startStr)
        .lte('eaten_at', endStr)
        .order('eaten_at', { ascending: true }); // Ordering by date

    if (error) {
        console.error('Error fetching history:', error);
        return {};
    }

    if (!data) return {};

    const history: { [key: string]: DayData } = {};

    data.forEach((log: any) => {
        const date = log.eaten_at.split('T')[0];
        if (!history[date]) {
            history[date] = {
                date,
                calories: 0,
                protein: 0,
                entries: [],
            };
        }
        history[date].calories += log.calories;
        history[date].protein += log.protein;

        // Map logs to FoodEntry
        history[date].entries.push({
            id: log.id,
            name: log.food_name,
            weight: log.weight_g,
            calories: log.calories,
            protein: log.protein,
            date: date,
            category: log.meal_type || 'Snack',
        });
    });

    return history;
}

export async function getDashboardStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { currentStreak: 0, weeklyAverageCalories: 0 };

    const { data, error } = await supabase
        .from('food_logs')
        .select('eaten_at, calories')
        .eq('user_id', user.id)
        .order('eaten_at', { ascending: false });

    if (error || !data || data.length === 0) {
        return { currentStreak: 0, weeklyAverageCalories: 0 };
    }

    const dates = data.map(log => {
        if (!log.eaten_at) return '';
        return log.eaten_at.split('T')[0];
    }).filter(d => d !== '');

    const uniqueDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Convert to YYYY-MM-DD
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let checkDateStr = '';

    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
        currentStreak = 1;
        checkDateStr = uniqueDates[0];

        for (let i = 1; i < uniqueDates.length; i++) {
            // Calculate previous day by subtracting 86400000ms from midnight UTC
            const prevTime = new Date(checkDateStr + "T00:00:00Z").getTime() - 86400000;
            const prevDate = new Date(prevTime);
            const expectedPrevStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevDate.getUTCDate()).padStart(2, '0')}`;

            if (uniqueDates[i] === expectedPrevStr) {
                currentStreak++;
                checkDateStr = uniqueDates[i];
            } else {
                break;
            }
        }
    }

    // Weekly average (previous 7 days, excluding today)
    const sevenDaysAgo = new Date(yesterday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

    const last7DaysData = data.filter(log => {
        const d = log.eaten_at ? log.eaten_at.split('T')[0] : '';
        return d > sevenDaysAgoStr && d <= yesterdayStr;
    });

    const uniqueDaysWithLogs = new Set(last7DaysData.map(log => log.eaten_at ? log.eaten_at.split('T')[0] : ''));

    let totalCalories = 0;
    for (const log of last7DaysData) {
        totalCalories += log.calories || 0;
    }

    const divisor = uniqueDaysWithLogs.size || 1; // avoid division by zero
    const weeklyAverageCalories = uniqueDaysWithLogs.size > 0 ? Math.round(totalCalories / divisor) : 0;

    return { currentStreak, weeklyAverageCalories };
}
