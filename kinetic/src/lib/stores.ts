import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import type { Workout } from './supabase';

function createPersistentStore<T>(key: string, startValue: T) {
    const { subscribe, set, update } = writable(startValue);

    if (typeof window !== 'undefined') {
        const json = localStorage.getItem(key);
        if (json) {
            set(JSON.parse(json));
        }

        subscribe(current => {
            localStorage.setItem(key, JSON.stringify(current));
        });
    }

    return {
        subscribe,
        set,
        update
    };
}

export const workouts = createPersistentStore<Workout[]>('workouts', []);

export const exerciseTypes = createPersistentStore('exerciseTypes', [
    'Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Strongman', 'Olympic Weightlifting'
]);

export const equipmentTypes = createPersistentStore('equipmentTypes', [
    'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Bands', 'Medicine Ball', 'Other'
]);

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);