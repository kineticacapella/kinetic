// User settings CRUD functions
export interface UserSettings {
	user_id: string;
	exercise_types: string[];
	equipment_types: string[];
}

export async function getUserSettings(user: User): Promise<UserSettings | null> {
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
}

export async function upsertUserSettings(user: User, exercise_types: string[], equipment_types: string[]) {
	const { error } = await supabase
		.from('user_settings')
		.upsert({
			user_id: user.id,
			exercise_types,
			equipment_types
		});
	if (error) throw error;
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
	const { data, error } = await supabase
		.from('exercises')
		.select('*')
		.eq('user_id', user.id);
	if (error) throw error;
	return data;
}

export async function addExercise(exercise: Exercise, user: User) {
	const { data, error } = await supabase
		.from('exercises')
		.insert([{ ...exercise, user_id: user.id }])
		.select();
	if (error) throw error;
	return data?.[0];
}

export async function updateExercise(id: string, exercise: Exercise) {
	const { data, error } = await supabase
		.from('exercises')
		.update(exercise)
		.eq('id', id)
		.select();
	if (error) throw error;
	return data?.[0];
}

export async function deleteExercise(id: string) {
	const { error } = await supabase
		.from('exercises')
		.delete()
		.eq('id', id);
	if (error) throw error;
}

// Workout CRUD functions
export interface Workout {
	id?: string;
	name: string;
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
	const { data, error } = await supabase
		.from('workouts')
		.select('*, workout_exercises(*, exercises(*))')
		.eq('user_id', user.id)
		.order('created_at', { foreignTable: 'workout_exercises', ascending: true });
	if (error) throw error;
	return data;
}

export async function getWorkout(id: string) {
	const { data, error } = await supabase
		.from('workouts')
		.select('*, workout_exercises(*, exercises(*))')
		.eq('id', id)
		.order('created_at', { foreignTable: 'workout_exercises', ascending: true })
		.single();
	if (error) throw error;
	return data;
}

export async function addWorkout(workout: Workout, user: User) {
	const { data, error } = await supabase
		.from('workouts')
		.insert([{ ...workout, user_id: user.id }])
		.select();
	if (error) throw error;
	return data?.[0];
}

export async function updateWorkout(id: string, workout: Workout) {
	const { data, error } = await supabase
		.from('workouts')
		.update(workout)
		.eq('id', id)
		.select();
	if (error) throw error;
	return data?.[0];
}

export async function deleteWorkout(id: string) {
	const { error } = await supabase
		.from('workouts')
		.delete()
		.eq('id', id);
	if (error) throw error;
}

export async function addExerciseToWorkout(workoutExercise: Partial<WorkoutExercise>) {
	const { data, error } = await supabase
		.from('workout_exercises')
		.insert([workoutExercise])
		.select();
	if (error) throw error;
	return data?.[0];
}

export async function removeExerciseFromWorkout(id: string | undefined) {
	if (!id) return;
	const { error } = await supabase
		.from('workout_exercises')
		.delete()
		.eq('id', id);
	if (error) throw error;
}

export async function updateExerciseInWorkout(id: string, workoutExercise: Partial<WorkoutExercise>) {
	const { data, error } = await supabase
		.from('workout_exercises')
		.update(workoutExercise)
		.eq('id', id)
		.select();
	if (error) throw error;
	return data?.[0];
}

// Workout Log CRUD functions
export async function getWorkoutLogs(user: User) {
	const { data, error } = await supabase
		.from('workout_logs')
		.select('*')
		.eq('user_id', user.id)
		.order('started_at', { ascending: false });
	if (error) throw error;
	return data as WorkoutLog[];
}

export async function addWorkoutLog(log: Omit<WorkoutLog, 'id' | 'user_id'>, user: User) {
	const { data, error } = await supabase
		.from('workout_logs')
		.insert([{ ...log, user_id: user.id }])
		.select()
        .single();
	if (error) throw error;
	return data as WorkoutLog;
}

export async function updateWorkoutLog(id: string, log: Partial<WorkoutLog>) {
	const { data, error } = await supabase
		.from('workout_logs')
		.update(log)
		.eq('id', id)
		.select()
        .single();
	if (error) throw error;
	return data as WorkoutLog;
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LoggedSet {
    exerciseId: string;
    exerciseName: string;
    weight: number;
    reps: number;
    isDropSet: boolean;
    myoRep: 'start' | 'match' | null;
    timerTime: number; // Time on the timer when this set was logged (in seconds)
    loggedAt: string; // ISO timestamp
}

export interface WorkoutLog {
    id: string;
    user_id?: string;
    workoutName: string;
    startedAt: string; // ISO timestamp
    endedAt: string | null; // ISO timestamp, null if session is ongoing
    sets: LoggedSet[];
}
