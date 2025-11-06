import { dataStatus, type DataStatus } from './stores';

async function withStatus<T>(status: DataStatus, fn: () => Promise<T>): Promise<T> {
	dataStatus.set(status);
	try {
		const result = await fn();
		dataStatus.set('synced');
		return result;
	} catch (error) {
		dataStatus.set('error');
		throw error;
	}
}

// User settings CRUD functions
export interface UserSettings {
	user_id: string;
	exercise_types: string[];
	equipment_types: string[];
	workout_types?: string[];
}

export async function getUserSettings(user: User): Promise<UserSettings | null> {
	return withStatus('loading', async () => {
		const { data, error } = await supabase
			.from('user_settings')
			.select('*')
			.eq('user_id', user.id)
			.single();
		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			throw error;
		}
		return data as UserSettings;
	});
}

export async function upsertUserSettings(user: User, exercise_types: string[], equipment_types: string[], workout_types?: string[]) {
	return withStatus('syncing', async () => {
		const { error } = await supabase
			.from('user_settings')
			.upsert({
				user_id: user.id,
				exercise_types,
				equipment_types,
				workout_types
			});
		if (error) throw error;
	});
}

export async function deleteUserAccount(userId: string) {
    return withStatus('syncing', async () => {
        // Note: This function requires a Supabase RPC function to be created
        // to delete the user from auth.users. The RPC function should be called
        // 'delete_user' and should have the following SQL:
        //
        // CREATE OR REPLACE FUNCTION delete_user()
        // RETURNS void AS $$
        // BEGIN
        //   DELETE FROM auth.users WHERE id = auth.uid();
        // END;
        // $$ LANGUAGE plpgsql SECURITY DEFINER;
        //
        // Also, make sure to enable row level security on all tables and
        // create policies that only allow users to access their own data.

        const tables = ["workout_logs", "workout_exercises", "workouts", "exercises", "user_settings"];
        for (const table of tables) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('user_id', userId);
            if (error) throw error;
        }

        const { error } = await supabase.rpc('delete_user');
        if (error) throw error;
    });
}

// Exercise CRUD functions
import type { User } from '@supabase/supabase-js';

export interface Exercise {
	id?: string;
	name: string;
	primaryMuscles: string[];
	secondaryMuscles: string[];
	type: string;
	equipment: string;
	user_id?: string;
}

export async function getExercises(user: User) {
	return withStatus('loading', async () => {
		const { data, error } = await supabase
			.from('exercises')
			.select('*')
			.eq('user_id', user.id);
		if (error) throw error;
		return data;
	});
}

export async function addExercise(exercise: Exercise, user: User) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('exercises')
			.insert([{ ...exercise, user_id: user.id }])
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

export async function updateExercise(id: string, exercise: Exercise) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('exercises')
			.update(exercise)
			.eq('id', id)
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

export async function deleteExercise(id: string) {
	return withStatus('syncing', async () => {
		const { error } = await supabase
			.from('exercises')
			.delete()
			.eq('id', id);
		if (error) throw error;
	});
}

// Workout CRUD functions
export interface Workout {
	id?: string;
	name: string;
	note?: string;
	workout_types?: string;
	user_id?: string;
	workout_exercises?: WorkoutExercise[]; // This will be populated by a join
}

export interface WorkoutExercise {
	id?: string;
	workout_id: string;
	exercise_id: string;
	sets: number;
	reps: number;
	weight: number;
	is_drop_set?: boolean;
	myo_rep?: 'start' | 'match' | null;
	exercises?: Exercise; // Make nested exercise optional
}

export async function getWorkouts(user: User) {
	return withStatus('loading', async () => {
		const { data, error } = await supabase
			.from('workouts')
			.select('*, workout_exercises(*, exercises(*))')
			.eq('user_id', user.id)
			.order('created_at', { foreignTable: 'workout_exercises', ascending: true });
		if (error) throw error;
		return data;
	});
}

export async function getWorkout(id: string) {
	return withStatus('loading', async () => {
		const { data, error } = await supabase
			.from('workouts')
			.select('*, workout_exercises(*, exercises(*))')
			.eq('id', id)
			.order('created_at', { foreignTable: 'workout_exercises', ascending: true })
			.single();
		if (error) throw error;
		return data;
	});
}

export async function addWorkout(workout: Workout, user: User) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('workouts')
			.insert([{ ...workout, user_id: user.id }])
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

export async function updateWorkout(id: string, workout: Workout) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('workouts')
			.update(workout)
			.eq('id', id)
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

export async function deleteWorkout(id: string) {
	return withStatus('syncing', async () => {
		const { error } = await supabase
			.from('workouts')
			.delete()
			.eq('id', id);
		if (error) throw error;
	});
}

export async function addExerciseToWorkout(workoutExercise: Partial<WorkoutExercise>) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('workout_exercises')
			.insert([workoutExercise])
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

export async function removeExerciseFromWorkout(id: string | undefined) {
	if (!id) return;
	return withStatus('syncing', async () => {
		const { error } = await supabase
			.from('workout_exercises')
			.delete()
			.eq('id', id);
		if (error) throw error;
	});
}

export async function updateExerciseInWorkout(id: string, workoutExercise: Partial<WorkoutExercise>) {
	return withStatus('syncing', async () => {
		const { data, error } = await supabase
			.from('workout_exercises')
			.update(workoutExercise)
			.eq('id', id)
			.select();
		if (error) throw error;
		return data?.[0];
	});
}

// Workout Log CRUD functions
export async function getWorkoutLogs(user: User) {
	return withStatus('loading', async () => {
		const { data, error } = await supabase
			.from('workout_logs')
			.select('*')
			.eq('user_id', user.id)
			.order('started_at', { ascending: false });
		if (error) throw error;
		return data as WorkoutLog[];
	});
}

export async function addWorkoutLog(log: Omit<WorkoutLog, 'id' | 'user_id'>, user: User) {
	return withStatus('logging', async () => {
		console.log('supabase.ts: addWorkoutLog', log, user);
		const { data, error } = await supabase
			.from('workout_logs')
			.insert([{ ...log, user_id: user.id }])
			.select()
			.single();
		console.log('supabase.ts: addWorkoutLog result', { data, error });
		if (error) throw error;
		return data as WorkoutLog;
	});
}

export async function updateWorkoutLog(id: string, log: Partial<WorkoutLog>) {
	return withStatus('logging', async () => {
		console.log('supabase.ts: updateWorkoutLog', id, log);
		const { data, error } = await supabase
			.from('workout_logs')
			.update(log)
			.eq('id', id)
			.select()
			.single();
		console.log('supabase.ts: updateWorkoutLog result', { data, error });
		if (error) throw error;
		return data as WorkoutLog;
	});
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LoggedSet {
    exercise_id: string;
    exercise_name: string;
    weight: number;
    reps: number;
    is_drop_set: boolean;
    myo_rep: 'start' | 'match' | null;
    timer_time: number; 
    logged_at: string; 
}

export interface WorkoutLog {
    id: string;
    user_id?: string;
    workout_name: string;
    started_at: string; 
    ended_at: string | null; 
    sets: LoggedSet[];
}

// Add any other Supabase-related code here.
