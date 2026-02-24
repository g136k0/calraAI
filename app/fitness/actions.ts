'use server';

import { createClient } from '@/lib/supabase/server';

export interface RoutineExercise {
    id: string;
    routine_id: string;
    name: string;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    order_index: number;
}

export interface WorkoutRoutine {
    id: string;
    user_id: string;
    name: string;
    notes: string | null;
    created_at: string;
    exercises?: RoutineExercise[];
}

export async function getRoutines(): Promise<WorkoutRoutine[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('workout_routines')
        .select(`
      *,
      exercises:routine_exercises(*)
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }

    // Sort exercises by order_index
    return data.map((routine: any) => ({
        ...routine,
        exercises: (routine.exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }));
}

export async function createRoutine(name: string, notes: string = '') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('workout_routines')
        .insert({
            user_id: user.id,
            name,
            notes
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating routine:', error);
        throw new Error('Failed to create routine');
    }

    return data;
}

export async function addExerciseToRoutine(routineId: string, exercise: Omit<RoutineExercise, 'id' | 'routine_id'>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('routine_exercises')
        .insert({
            routine_id: routineId,
            name: exercise.name,
            target_sets: exercise.target_sets,
            target_reps: exercise.target_reps,
            rest_seconds: exercise.rest_seconds,
            order_index: exercise.order_index
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding exercise:', error);
        throw new Error('Failed to add exercise');
    }

    return data;
}

export async function getWorkouts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('workouts')
        .select(`
        *,
        exercises:workout_exercises(
            *,
            sets:workout_sets(*)
        )
      `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching workouts:', error);
        return [];
    }

    return data.map((workout: any) => ({
        ...workout,
        exercises: (workout.exercises || []).sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => ({
            ...ex,
            sets: (ex.sets || []).sort((a: any, b: any) => a.set_number - b.set_number)
        }))
    }));
}

export async function deleteRoutineExercise(exerciseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('routine_exercises').delete().eq('id', exerciseId);
    if (error) {
        console.error('Error deleting exercise:', error);
        throw new Error('Failed to delete exercise');
    }
}

export async function updateRoutineExercise(exerciseId: string, exercise: Partial<RoutineExercise>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('routine_exercises')
        .update({
            name: exercise.name,
            target_sets: exercise.target_sets,
            target_reps: exercise.target_reps,
            order_index: exercise.order_index
        })
        .eq('id', exerciseId);

    if (error) {
        console.error('Error updating exercise:', error);
        throw new Error('Failed to update exercise');
    }
}

export async function reorderRoutineExercises(exerciseAId: string, orderA: number, exerciseBId: string, orderB: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: errorA } = await supabase
        .from('routine_exercises')
        .update({ order_index: orderB })
        .eq('id', exerciseAId);

    if (errorA) throw errorA;

    const { error: errorB } = await supabase
        .from('routine_exercises')
        .update({ order_index: orderA })
        .eq('id', exerciseBId);

    if (errorB) throw errorB;
}

export async function createWorkout(routineId: string | null, name: string, date: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
            user_id: user.id,
            routine_id: routineId,
            name: name,
            scheduled_date: date,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating workout:', error);
        throw new Error('Failed to create/schedule workout');
    }

    if (routineId && workout) {
        const { data: routineExercises } = await supabase
            .from('routine_exercises')
            .select('*')
            .eq('routine_id', routineId);

        if (routineExercises && routineExercises.length > 0) {
            for (const re of routineExercises) {
                const { data: wEx } = await supabase
                    .from('workout_exercises')
                    .insert({
                        workout_id: workout.id,
                        name: re.name,
                        order_index: re.order_index
                    })
                    .select()
                    .single();

                if (wEx) {
                    const setsToInsert = [];
                    for (let i = 1; i <= re.target_sets; i++) {
                        const targetRepsPieces = re.target_reps.split('-');
                        const defaultReps = parseInt(targetRepsPieces[targetRepsPieces.length - 1]) || null;
                        setsToInsert.push({
                            workout_exercise_id: wEx.id,
                            set_number: i,
                            reps: defaultReps,
                        });
                    }
                    if (setsToInsert.length > 0) {
                        await supabase.from('workout_sets').insert(setsToInsert);
                    }
                }
            }
        }
    }

    return workout;
}

export async function deleteWorkout(workoutId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
    if (error) throw error;
}

export async function completeWorkoutSet(setId: string, weight: number | null, reps: number | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('workout_sets')
        .update({
            weight,
            reps,
            is_completed: true,
            completed_at: new Date().toISOString()
        })
        .eq('id', setId);

    if (error) throw error;
}

export async function uncompleteWorkoutSet(setId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('workout_sets')
        .update({
            is_completed: false,
            completed_at: null
        })
        .eq('id', setId);

    if (error) throw error;
}

export async function deleteRoutine(routineId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('workout_routines').delete().eq('id', routineId);
    if (error) throw error;
}
