<script lang="ts">
    import { onMount } from 'svelte';
    import { workoutLogs } from '$lib/stores';
    import type { WorkoutLog, LoggedSet } from '$lib/supabase';

    let history: WorkoutLog[] = [];

    onMount(() => {
        const unsubscribe = workoutLogs.subscribe(logs => {
            const ongoing = logs.filter(log => !log.endedAt);
            const completed = logs.filter(log => log.endedAt);

            let latestOngoing: WorkoutLog[] = [];
            if (ongoing.length > 0) {
                // Sort by startedAt descending to find the latest
                const latest = ongoing.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
                latestOngoing = [latest];
            }
            
            history = [...completed, ...latestOngoing].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
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
                        {log.workoutName}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Started: {formatDateTime(log.startedAt)}
                    </p>
                    {#if log.endedAt}
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Ended: {formatDateTime(log.endedAt)}
                        </p>
                    {:else}
                        <p class="text-sm text-red-500">Session ongoing...</p>
                    {/if}

                    {#if log.sets.length > 0}
                        <h4 class="text-md font-semibold mt-4 mb-2 text-gray-800 dark:text-white">Logged Sets:</h4>
                        <div class="space-y-2">
                            {#each log.sets as set (set.loggedAt + set.exerciseId)}
                                <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                                    <p class="text-sm text-gray-800 dark:text-gray-200">
                                        <span class="font-medium">{set.exerciseName}</span> - {set.weight}kg x {set.reps} reps
                                        {#if set.isDropSet}(Drop Set){/if}
                                        {#if set.myoRep}(Myo-Rep: {set.myoRep}){/if}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        Logged at: {formatDateTime(set.loggedAt)} (Timer: {Math.floor(set.timerTime / 60).toString().padStart(2, '0')}:{(set.timerTime % 60).toString().padStart(2, '0')})
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
