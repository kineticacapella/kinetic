<script lang="ts">
	import { UserSettingsSolid } from 'flowbite-svelte-icons';
	import '../app.css';
	import ExercisesTab from '$lib/components/ExercisesTab.svelte';
	import SettingsTab from '$lib/components/SettingsTab.svelte';
	import WorkoutsTab from '$lib/components/WorkoutsTab.svelte';
	import HistoryTab from '$lib/components/HistoryTab.svelte';
	import { onMount } from 'svelte';
	import { initFlowbite } from 'flowbite';

	onMount(() => {
		initFlowbite();
	});
</script>

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
	<main class="flex-grow container mx-auto p-4">
		<div class="mb-4 border-b border-gray-200 dark:border-gray-700">
			<ul class="flex flex-wrap -mb-px text-sm font-medium" id="myTab" data-tabs-toggle="#myTabContent" role="tablist">
				<li class="mr-2" role="presentation">
					<button class="inline-block p-4 border-b-2 rounded-t-lg" id="workouts-tab" data-tabs-target="#workouts" type="button" role="tab" aria-controls="workouts" aria-selected="true">Workouts</button>
				</li>
				<li class="mr-2" role="presentation">
					<button class="inline-block p-4 border-b-2 rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300" id="exercises-tab" data-tabs-target="#exercises" type="button" role="tab" aria-controls="exercises" aria-selected="false">Exercises</button>
				</li>
				<li class="mr-2" role="presentation">
					<button class="inline-block p-4 border-b-2 rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300" id="history-tab" data-tabs-target="#history" type="button" role="tab" aria-controls="history" aria-selected="false">History</button>
				</li>
				<li class="ml-auto" role="presentation">
					<button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" id="settings-tab" data-tabs-target="#settings" type="button" role="tab" aria-controls="settings" aria-selected="false">
						<UserSettingsSolid class="shrink-0 h-6 w-6" />
					</button>
				</li>
			</ul>
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