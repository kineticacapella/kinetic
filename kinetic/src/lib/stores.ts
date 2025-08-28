import { writable } from 'svelte/store';

function createPersistentStore(key, startValue) {
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

export const exerciseTypes = createPersistentStore('exerciseTypes', [
    'Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Strongman', 'Olympic Weightlifting'
]);

export const equipmentTypes = createPersistentStore('equipmentTypes', [
    'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Bands', 'Medicine Ball', 'Other'
]);
