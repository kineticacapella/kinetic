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
import { createClient } from '@supabase/supabase-js'

// TODO: Replace with your project's URL and anon key
const supabaseUrl = 'https://sxdmlypuekifpeogmjca.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZG1seXB1ZWtpZnBlb2dtamNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Njg4MDQsImV4cCI6MjA3MjA0NDgwNH0.chsBAJsbH7Hxi-ITVtNh2K36diMhwE8lZE0I5Ne-8p0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
