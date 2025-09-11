<script lang="ts">
	import { UserSettingsSolid, RefreshOutline, ArrowUpOutline, CheckOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import '../app.css';
	import ExercisesTab from '$lib/components/ExercisesTab.svelte';
	import SettingsTab from '$lib/components/SettingsTab.svelte';
	import WorkoutsTab from '$lib/components/WorkoutsTab.svelte';
	import HistoryTab from '$lib/components/HistoryTab.svelte';
	import { onMount } from 'svelte';
	import { initFlowbite } from 'flowbite';
	import { dataStatus } from '$lib/stores';

	onMount(() => {
		initFlowbite();
	});
</script>

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
	<main class="flex-grow container mx-auto px-4 pt-4 pb-20" id="myTab" data-tabs-toggle="#myTabContent">
		<div class="mb-4 border-b border-gray-200 dark:border-gray-700">
			<ul class="flex flex-wrap -mb-px text-sm font-medium" role="tablist">
				<li class="mr-2" role="presentation">
					<div class="inline-block p-4 border-b-2 rounded-t-lg invisible">Workouts</div>
				</li>
				<li class="mr-2" role="presentation">
					<div class="inline-block p-4 border-b-2 rounded-t-lg invisible">Exercises</div>
				</li>
				<li class="mr-2" role="presentation">
					<div class="inline-block p-4 border-b-2 rounded-t-lg invisible">History</div>
				</li>
				<li class="ml-auto flex items-center" role="presentation">
					<div class="mr-2">
						{#if $dataStatus === 'loading' || $dataStatus === 'syncing'}
							<RefreshOutline class="shrink-0 h-6 w-6 animate-spin" />
						{:else if $dataStatus === 'logging'}
							<ArrowUpOutline class="shrink-0 h-6 w-6" />
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
			<div class="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500" id="workouts-tab" data-tabs-target="#workouts" type="button" role="tab" aria-controls="workouts" aria-selected="true">
					Workouts
				</button>
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500" id="exercises-tab" data-tabs-target="#exercises" type="button" role="tab" aria-controls="exercises" aria-selected="false">
					Exercises
				</button>
				<button class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500" id="history-tab" data-tabs-target="#history" type="button" role="tab" aria-controls="history" aria-selected="false">
					History
				</button>
			</div>
		</div>
		<div id="myTabContent">
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
