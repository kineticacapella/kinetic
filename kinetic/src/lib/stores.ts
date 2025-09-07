import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import type { Workout, WorkoutLog, LoggedSet } from './supabase'; // Added WorkoutLog, LoggedSet

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

export const workoutLogs = writable<WorkoutLog[]>([]); // Changed to writable of WorkoutLog[]
export const myoReps = writable([]);
export const dropSets = writable([]);

// Local Storage Helper Functions
export function saveWorkoutLog(log: WorkoutLog) {
    let logs: WorkoutLog[] = loadWorkoutLogs();
    const index = logs.findIndex(l => l.id === log.id);
    if (index > -1) {
        logs[index] = log;
    } else {
        logs.push(log);
    }
    localStorage.setItem('workoutLogs', JSON.stringify(logs));
    workoutLogs.set(logs); // Update the Svelte store
}

export function loadWorkoutLogs(): WorkoutLog[] {
    const logs = localStorage.getItem('workoutLogs');
    return logs ? JSON.parse(logs) : [];
}

export function updateWorkoutLog(log: WorkoutLog) {
    saveWorkoutLog(log); // saveWorkoutLog handles updates if ID exists
}

// Initialize workoutLogs store on load
if (typeof window !== 'undefined') {
    workoutLogs.set(loadWorkoutLogs());
}

// Persist user and session to local storage
if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
if (storedUser) {
    user.set(JSON.parse(storedUser));
}
user.subscribe(value => {
    if (value) {
        localStorage.setItem('user', JSON.stringify(value));
    } else {
        localStorage.removeItem('user');
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
