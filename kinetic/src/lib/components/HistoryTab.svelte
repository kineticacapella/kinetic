<script lang="ts">
    import { onMount } from 'svelte';
    import { workoutLogs } from '$lib/stores';
    import type { WorkoutLog, LoggedSet } from '$lib/supabase';

    let history: WorkoutLog[] = [];

    onMount(() => {
        const unsubscribe = workoutLogs.subscribe(logs => {
            const ongoing = logs.filter(log => !log.ended_at);
            const completed = logs.filter(log => log.ended_at && log.sets && log.sets.length > 0);

            let latestOngoing: WorkoutLog[] = [];
            if (ongoing.length > 0) {
                // Sort by started_at descending to find the latest
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
</script>

<div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Workout History</h2>

    {#if history.length === 0}
        <p class="text-gray-500 dark:text-gray-400">No workout sessions logged yet.</p>
    {:else}
        <div class="space-y-6">
            {#each history as log (log.id)}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {log.workout_name}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Started: {formatDateTime(log.started_at)}
                    </p>
                    {#if log.ended_at}
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Ended: {formatDateTime(log.ended_at)}
                        </p>
                    {:else}
                        <p class="text-sm text-red-500">Session ongoing...</p>
                    {/if}

                    {#if log.sets.length > 0}
                        <h4 class="text-md font-semibold mt-4 mb-2 text-gray-800 dark:text-white">Logged Sets:</h4>
                        <div class="space-y-2">
                            {#each log.sets as set (set.logged_at + set.exercise_id)}
                                <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                                    <p class="text-sm text-gray-800 dark:text-gray-200">
                                        <span class="font-medium">{set.exercise_name}</span> - {set.weight}kg x {set.reps} reps
                                        {#if set.is_drop_set}(Drop Set){/if}
                                        {#if set.myo_rep}(Myo-Rep: {set.myo_rep}){/if}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        Logged at: {formatDateTime(set.logged_at)} (Timer: {Math.floor(set.timer_time / 60).toString().padStart(2, '0')}:{(set.timer_time % 60).toString().padStart(2, '0')})
                                    </p>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">No sets logged for this session.</p>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>