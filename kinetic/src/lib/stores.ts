import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import type { Workout } from './supabase';

export const workouts = writable<Workout[]>([]);

export const exerciseTypes = writable([
    'Strength',
    'Cardio',
    'Stretching',
    'Plyometrics',
    'Powerlifting',
    'Strongman',
    'Olympic Weightlifting'
]);

export const equipmentTypes = writable([
    'Barbell',
    'Dumbbell',
    'Kettlebell',
    'Machine',
    'Cable',
    'Bodyweight',
    'Bands',
    'Medicine Ball',
    'Other'
]);

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);

export const workoutLogs = writable([]);
export const myoReps = writable([]);
export const dropSets = writable([]);
