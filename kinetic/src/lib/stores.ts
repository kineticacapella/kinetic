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

// Stores for active session
export const activeWorkout = writable<Workout | null>(null);
export const activeWorkoutLog = writable<WorkoutLog | null>(null);
export const sessionTimer = writable<number>(0);
export const workoutToStart = writable<Workout | null>(null);
export const activeTab = writable('home');

export function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

let timerInterval: NodeJS.Timeout | null = null;

export function startSessionTimer() {
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		sessionTimer.update((t) => t + 1);
	}, 1000);
}

export function stopSessionTimer() {
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

export function resetSessionTimer() {
	stopSessionTimer();
	sessionTimer.set(0);
}


export type DataStatus = 'loading' | 'syncing' | 'logging' | 'synced' | 'error';
export const dataStatus = writable<DataStatus>('synced');

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
