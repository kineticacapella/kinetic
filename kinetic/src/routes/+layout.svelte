<script lang="ts">
	import { UserSettingsSolid, RefreshOutline, ArrowUpOutline, CheckOutline, ExclamationCircleOutline, HomeSolid, ListOutline, FireSolid, ClockSolid } from 'flowbite-svelte-icons';
	import '../app.css';
	import '@fontsource/fira-code';
	import ExercisesTab from '$lib/components/ExercisesTab.svelte';
	import SettingsTab from '$lib/components/SettingsTab.svelte';
	import WorkoutsTab from '$lib/components/WorkoutsTab.svelte';
	import HistoryTab from '$lib/components/HistoryTab.svelte';
	import HomeTab from '$lib/components/HomeTab.svelte';
	import { onMount } from 'svelte';
	import { initFlowbite } from 'flowbite';
	import { dataStatus, activeWorkout, activeWorkoutLog, sessionTimer, formatTime } from '$lib/stores';

	onMount(() => {
		initFlowbite();
	});
</script>

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
	<main class="flex-grow container mx-auto px-4 pt-4 pb-20" id="myTab" data-tabs-toggle="#myTabContent">
		<div class="mb-4 border-b border-gray-200 dark:border-gray-700">
			<ul class="flex flex-wrap -mb-px text-sm font-medium items-center" role="tablist">
				{#if $activeWorkout}
					<li class="mr-4">
						<div>
							<div class="font-bold text-sm text-blue-600 dark:text-blue-400">{$activeWorkout.name}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">
								<span>{formatTime($sessionTimer)}</span>
								<span class="mx-1">|</span>
								<span
									>{$activeWorkoutLog?.sets?.length || 0} / {$activeWorkout.workout_exercises
										?.length || 0} sets logged</span
								>
							</div>
						</div>
					</li>
				{/if}
				
				<li class="ml-auto flex items-center" role="presentation">
					<div class="mr-2">
						{#if $dataStatus === 'loading' || $dataStatus === 'syncing'}
							<RefreshOutline class="shrink-0 h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
						{:else if $dataStatus === 'logging'}
							<ArrowUpOutline class="shrink-0 h-6 w-6 text-blue-600 dark:text-blue-400" />
						{:else if $dataStatus === 'synced'}
							<CheckOutline class="shrink-0 h-6 w-6 text-green-500" />
						{:else if $dataStatus === 'error'}
							<ExclamationCircleOutline class="shrink-0 h-6 w-6 text-red-500" />
						{/if}
					</div>
					<button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" id="settings-tab" data-tabs-target="#settings" type="button" role="tab" aria-controls="settings" aria-selected="false">
						<UserSettingsSolid class="shrink-0 h-6 w-6" />
					</button>
				</li>
			</ul>
		</div>
		<div class="fixed bottom-0 left-0 z-50 w-full h-14 bg-white border-t border-gray-200 dark:bg-gray-700 dark:border-gray-600">
			<div class="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500 aria-selected:text-blue-600 aria-selected:dark:text-blue-500" id="home-tab" data-tabs-target="#home" type="button" role="tab" aria-controls="home" aria-selected="true">
					<HomeSolid class="w-5 h-5 mb-1" />
					Home
				</button>
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500 aria-selected:text-blue-600 aria-selected:dark:text-blue-500" id="workouts-tab" data-tabs-target="#workouts" type="button" role="tab" aria-controls="workouts" aria-selected="false">
					<ListOutline class="w-5 h-5 mb-1" />
					Workouts
				</button>
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500 aria-selected:text-blue-600 aria-selected:dark:text-blue-500" id="exercises-tab" data-tabs-target="#exercises" type="button" role="tab" aria-controls="exercises" aria-selected="false">
					<FireSolid class="w-5 h-5 mb-1" />
					Exercises
				</button>
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500 aria-selected:text-blue-600 aria-selected:dark:text-blue-500" id="history-tab" data-tabs-target="#history" type="button" role="tab" aria-controls="history" aria-selected="false">
					<ClockSolid class="w-5 h-5 mb-1" />
					History
				</button>
			</div>
		</div>
		<div id="myTabContent">
			<div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="home" role="tabpanel" aria-labelledby="home-tab">
				<HomeTab />
			</div>
			<div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="workouts" role="tabpanel" aria-labelledby="workouts-tab">
				<WorkoutsTab />
			</div>
			<div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="exercises" role="tabpanel" aria-labelledby="exercises-tab">
				<ExercisesTab />
			</div>
			<div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="history" role="tabpanel" aria-labelledby="history-tab">
				<HistoryTab />
			</div>
			<div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="settings" role="tabpanel" aria-labelledby="settings-tab">
				<SettingsTab />
			</div>
		</div>
	</main>
	<slot />
</div>
