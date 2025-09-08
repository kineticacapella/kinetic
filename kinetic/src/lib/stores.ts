import { writable, get } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import type { Workout, WorkoutLog } from './supabase';
import { addWorkoutLog as dbAddWorkoutLog, getWorkoutLogs, updateWorkoutLog as dbUpdateWorkoutLog } from './supabase';

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

export const workoutLogs = writable<WorkoutLog[]>([]);
export const myoReps = writable([]);
export const dropSets = writable([]);

export async function addWorkoutLog(log: Omit<WorkoutLog, 'id' | 'user_id'>) {
    const currentUser = get(user);
    if (!currentUser) throw new Error("User not logged in");
    const newLog = await dbAddWorkoutLog(log, currentUser);
    workoutLogs.update(logs => [newLog, ...logs]);
    return newLog;
}

export async function updateWorkoutLog(id: string, log: Partial<WorkoutLog>) {
    const updatedLog = await dbUpdateWorkoutLog(id, log);
    workoutLogs.update(logs => logs.map(l => l.id === id ? updatedLog : l));
    return updatedLog;
}


// Persist user and session to local storage
if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        user.set(JSON.parse(storedUser));
    }
    user.subscribe(async (value) => {
        if (value) {
            localStorage.setItem('user', JSON.stringify(value));
            // Load user-specific data
            try {
                const logs = await getWorkoutLogs(value);
                workoutLogs.set(logs);
            } catch (error) {
                console.error('Error loading workout logs:', error);
            }
        } else {
            localStorage.removeItem('user');
            // Clear user-specific data
            workoutLogs.set([]);
        }
    });

    const storedSession = localStorage.getItem('session');
    if (storedSession) {
        session.set(JSON.parse(storedSession));
    }
    session.subscribe(value => {
        if (value) {
            localStorage.setItem('session', JSON.stringify(value));
        } else {
            localStorage.removeItem('session');
        }
    });
}
