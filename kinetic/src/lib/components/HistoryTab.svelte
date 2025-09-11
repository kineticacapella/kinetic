
<script lang="ts">
    import { onMount } from 'svelte';
    import { workoutLogs } from '$lib/stores';
    import type { WorkoutLog } from '$lib/supabase';
    import { sineIn } from 'svelte/easing';

    let history: WorkoutLog[] = [];
    let expandedLogs = new Set<string>();

    function toggleLog(logId: string) {
        if (expandedLogs.has(logId)) {
            expandedLogs.delete(logId);
        } else {
            expandedLogs.add(logId);
        }
        expandedLogs = expandedLogs;
    }

    function handleKeyDown(event: KeyboardEvent, logId: string) {
        if (event.key === 'Enter' || event.key === ' ') {
            toggleLog(logId);
        }
    }

    onMount(() => {
        const unsubscribe = workoutLogs.subscribe(logs => {
            const ongoing = logs.filter(log => !log.ended_at);
            const completed = logs.filter(log => log.ended_at && log.sets && log.sets.length > 0);

            let latestOngoing: WorkoutLog[] = [];
            if (ongoing.length > 0) {
                const latest = ongoing.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
                latestOngoing = [latest];
            }
            
            history = [...completed, ...latestOngoing].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        });

        return () => unsubscribe();
    });

    function formatDateTime(isoString: string): string {
        const date = new Date(isoString);
        return date.toLocaleString();
    }

    function formatDuration(start: string, end: string | null): string {
        if (!end) return 'Ongoing';
        const duration = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white">History</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                A log of your completed workout sessions.
            </p>
        </div>
    </div>

    {#if history.length === 0}
        <div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">No history yet!</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Complete a workout to see it here.</p>
        </div>
    {:else}
        <div class="space-y-6">
            {#each history as log (log.id)}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg border-2 border-blue-700 dark:border-blue-600">
                    <div role="button" tabindex="0" class="p-6 cursor-pointer" on:click={() => toggleLog(log.id)} on:keydown={(e) => handleKeyDown(e, log.id)}>
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{log.workout_name}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(log.started_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex items-center">
                                {#if !log.ended_at}
                                    <span class="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-green-900 dark:text-green-300">Ongoing</span>
                                {:else}
                                    <span class="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                        {formatDuration(log.started_at, log.ended_at)}
                                    </span>
                                {/if}
                                <svg class="w-6 h-6 text-gray-500 dark:text-gray-400 transform transition-transform {expandedLogs.has(log.id) ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {#if expandedLogs.has(log.id) && log.sets && log.sets.length > 0}
                            <div class="mt-4 space-y-3">
                                <div class="grid grid-cols-3 gap-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">
                                    <div>Exercise</div>
                                    <div>Weight</div>
                                    <div>Reps</div>
                                </div>
                                {#each log.sets as set (set.logged_at + set.exercise_id)}
                                    <div class="grid grid-cols-3 gap-4 items-center text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                                        <div>
                                            <span class="font-medium">{set.exercise_name}</span>
                                            {#if set.is_drop_set}
                                                <span class="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">DS</span>
                                            {/if}
                                            {#if set.myo_rep === 'start'}
                                                <span class="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-300">Myo Start</span>
                                            {:else if set.myo_rep === 'match'}
                                                <span class="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-300">Myo Match</span>
                                            {/if}
                                        </div>
                                        <div>{set.weight}kg</div>
                                        <div>{set.reps}</div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
