<script lang="ts">
import '$lib/chart.css';
	import { onMount } from 'svelte';
	import { initFlowbite, Modal } from 'flowbite';
	import { user, workoutLogs } from '$lib/stores';
	import { getExercises, addExercise, updateExercise, deleteExercise, getWorkoutLogs, type WorkoutLog, type LoggedSet } from '$lib/supabase';
	import { PlusOutline, CheckOutline, CloseOutline, FileChartBarSolid } from 'flowbite-svelte-icons';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import { Tabs, TabItem } from 'flowbite-svelte';

	type Exercise = {
		id: string;
		name: string;
		primarymuscles: string[];
		secondarymuscles: string[];
		type: string;
		equipment: string;
		user_id: string;
	};

	let exercises: Exercise[] = $state([]);
	let editingExerciseId: string | null = $state(null);
	let exerciseError = $state('');
	let exerciseSuccess = $state('');
	let modal: Modal;
	let confirmDeleteModal: Modal;
	let statsModal: Modal;
	let exerciseToDeleteId: string | null = $state(null);
	let selectedExercise: Exercise | null = $state(null);
	let stats = $state({ totalSets: 0, totalReps: 0, totalVolume: 0, maxWeight: 0 });
	let statsLoading = $state(false);
	let chartLabels: string[] = $state([]);
	let chartData: number[] = $state([]);
	let selectedTimeframe = $state('all');

	async function loadExercises() {
		if (!$user) return;
		try {
			const data = await getExercises($user);
			exercises = data || [];
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error fetching exercises:', error.message);
			} else {
				console.error('Unknown error fetching exercises:', error);
			}
		}
	}


	onMount(() => {
		initFlowbite();
		const modalElement = document.getElementById('add-exercise-modal');
		if (modalElement) {
			modal = new Modal(modalElement);
		}
		const confirmDeleteModalEl = document.getElementById('confirm-delete-exercise-modal');
		if (confirmDeleteModalEl) {
			confirmDeleteModal = new Modal(confirmDeleteModalEl);
		}
		const statsModalEl = document.getElementById('stats-modal');
		if (statsModalEl) {
			statsModal = new Modal(statsModalEl);
		}
	});

	$effect(() => {
		if ($user) void loadExercises();
	});

	// Form state
	let name = $state('');
	let primaryMusclesStr = $state('');
	let secondaryMusclesStr = $state('');
	let type = $state('Strength');
	let equipment = $state('Barbell');

	// Shared options from user_settings
	import { getUserSettings } from '$lib/supabase';
	let exerciseTypes: string[] = $state([
		'Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Strongman', 'Olympic Weightlifting'
	]);
	let equipmentTypes: string[] = $state([
		'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Bands', 'Medicine Ball', 'Other'
	]);

	$effect(() => {
		if ($user) {
			(async () => {
				try {
					const settings = await getUserSettings($user);
					if (settings) {
						exerciseTypes = settings.exercise_types;
						equipmentTypes = settings.equipment_types;
					}
				} catch (err) {
					// Optionally handle error
				}
			})();
		}
	});

	function startAdd() {
		editingExerciseId = null;
		name = '';
		primaryMusclesStr = '';
		secondaryMusclesStr = '';
		type = 'Strength';
		equipment = 'Barbell';
		modal.show();
	}

	function startEdit(exercise: Exercise) {
		editingExerciseId = exercise.id || null;
		name = exercise.name;
		primaryMusclesStr = exercise.primarymuscles.join(', ');
		secondaryMusclesStr = exercise.secondarymuscles.join(', ');
		type = exercise.type;
		equipment = exercise.equipment;
		modal.show();
	}

	async function getExerciseStats(exerciseId: string, timeframe: string) {
		if (!$user) return;
		statsLoading = true;
		try {
			let startDate: Date | null = null;
			const now = new Date();

			switch (timeframe) {
				case '7d':
					startDate = new Date(now.setDate(now.getDate() - 7));
					break;
				case '30d':
					startDate = new Date(now.setDate(now.getDate() - 30));
					break;
				case '90d':
					startDate = new Date(now.setDate(now.getDate() - 90));
					break;
				case '365d':
					startDate = new Date(now.setDate(now.getDate() - 365));
					break;
				case 'all':
				default:
					startDate = null; // No date restriction
					break;
			}

			let workoutLogs = await getWorkoutLogs($user);

			if (startDate) {
				workoutLogs = workoutLogs.filter(log => new Date(log.started_at) >= startDate!);
			}

			const exerciseSets = workoutLogs.flatMap(log => log.sets).filter(set => set.exercise_id === exerciseId);

			const totalSets = exerciseSets.length;
			const totalReps = exerciseSets.reduce((sum, set) => sum + set.reps, 0);
			const totalVolume = exerciseSets.reduce((sum, set) => sum + set.reps * set.weight, 0);
			const maxWeight = exerciseSets.reduce((max, set) => Math.max(max, set.weight), 0);

			stats = { totalSets, totalReps, totalVolume, maxWeight };


			const setsByDate = workoutLogs.reduce((acc, log) => {
				// Use ISO date string (yyyy-mm-dd) for chart x-axis
				const date = new Date(log.started_at);
				const isoDate = date.toISOString().split('T')[0];
				if (!acc[isoDate]) {
					acc[isoDate] = [];
				}
				acc[isoDate].push(...log.sets.filter(set => set.exercise_id === exerciseId));
				return acc;
			}, {} as Record<string, LoggedSet[]>);

			const dates = Object.keys(setsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
			// Only include dates that are true PRs (strictly greater than any previous max)
			let currentPr = 0;
			const prPairs: { date: string; pr: number }[] = [];
			for (const date of dates) {
				const sets = setsByDate[date];
				const maxWeightForDay = sets.reduce((max, set) => Math.max(max, set.weight), 0);
				if (maxWeightForDay > currentPr) {
					currentPr = maxWeightForDay;
					prPairs.push({ date, pr: currentPr });
				}
			}

			chartLabels = prPairs.map(p => p.date);
			chartData = prPairs.map(p => p.pr);

		} catch (error) {
			console.error('Error fetching exercise stats:', error);
		} finally {
			statsLoading = false;
		}
	}

	function showStats(exercise: Exercise) {
		selectedExercise = exercise;
		statsModal.show();
	}

	$effect(() => {
		// Recompute stats when selected exercise or timeframe changes,
		// and also when workoutLogs (the source of truth for sets) updates so the PR chart refreshes immediately after deletions.
		if (selectedExercise) {
			// reference $workoutLogs here so this effect re-runs when the store updates
			const _logs = $workoutLogs;
			void getExerciseStats(selectedExercise.id, selectedTimeframe);
		}
	});

	async function saveExercise() {
		exerciseError = '';
		exerciseSuccess = '';
		if (!name.trim() || !primaryMusclesStr.trim()) {
			exerciseError = 'Name and primary muscles are required.';
			return;
		}
		if (!$user) {
			exerciseError = 'You must be logged in to add exercises.';
			return;
		}
		const exerciseData = {
			name: name.trim(),
			primarymuscles: primaryMusclesStr.split(',').map((s) => s.trim()).filter(Boolean),
			secondarymuscles: secondaryMusclesStr.split(',').map((s) => s.trim()).filter(Boolean),
			type,
			equipment
		};
		console.log('Adding exercise payload:', {
			...exerciseData,
			user_id: $user.id
		});
		console.log('User object:', $user);
		try {
			if (editingExerciseId) {
				// Directly call supabase to get error response
				const { data, error } = await import('$lib/supabase').then(m => m.supabase.from('exercises').update(exerciseData).eq('id', editingExerciseId).select());
				if (error) {
					exerciseError = error.message || JSON.stringify(error);
					console.error('Supabase error:', error);
					return;
				}
				exerciseSuccess = 'Exercise updated.';
			} else {
				// Directly call supabase to get error response
				const { data, error } = await import('$lib/supabase').then(m => m.supabase.from('exercises').insert([{ ...exerciseData, user_id: $user.id }]).select());
				if (error) {
					exerciseError = error.message || JSON.stringify(error);
					console.error('Supabase error:', error);
					return;
				}
				exerciseSuccess = 'Exercise added.';
			}
			await loadExercises();
			modal.hide();
			editingExerciseId = null;
			name = '';
			primaryMusclesStr = '';
			secondaryMusclesStr = '';
			type = 'Strength';
			equipment = 'Barbell';
		} catch (error) {
			exerciseError = error instanceof Error ? error.message : JSON.stringify(error);
			console.error('Error saving exercise:', error);
		}
	}

	function handleDeleteExercise(id: string | undefined) {
		if (!id) return;
		exerciseToDeleteId = id;
		confirmDeleteModal.show();
	}

	async function confirmDeleteExercise() {
		if (!exerciseToDeleteId) return;
		try {
			await deleteExercise(exerciseToDeleteId);
			await loadExercises();
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error deleting exercise:', error.message);
			} else {
				console.error('Unknown error deleting exercise:', error);
			}
		}
		exerciseToDeleteId = null;
		confirmDeleteModal.hide();
	}
</script>

<style>
/* Make selected tab buttons in the stats modal match the app blue color */
:global(#stats-modal [role="tab"][aria-selected="true"]) {
	color: #2563eb !important; /* blue-600 */
}

/* Flowbite underlined tabs use a bottom border; ensure it's blue when selected */
:global(#stats-modal .underline .tab-item[aria-selected="true"]) {
	border-bottom-color: #2563eb !important;
}
</style>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Exercises</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                A list of exercises you can add to your workout routines.
            </p>
        </div>
        <button onclick={startAdd} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            <PlusOutline class="w-6 h-6" />
            <span class="sr-only">Add Exercise</span>
        </button>
    </div>

	{#if exercises.length === 0}
		<div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
			<h3 class="text-xl font-semibold text-gray-800 dark:text-white">No exercises yet!</h3>
			<p class="text-gray-500 dark:text-gray-400 mt-2">Click "Add Exercise" to get started.</p>
		</div>
	{:else}
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each exercises as exercise (exercise.id)}
				<div class="relative flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg border-2 border-blue-700 dark:border-blue-600 self-start">
                    <div class="p-6 flex-grow">
						<div class="flex justify-between items-center mb-3">
							<h5 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
								{exercise.name}
							</h5>
							<button
								onclick={() => showStats(exercise)}
								class="text-blue-600 dark:text-blue-400"
							>
								<FileChartBarSolid class="shrink-0 h-7 w-7" />
							</button>
						</div>
                        <div class="space-y-3 text-sm">
                            <div>
								<span class="font-semibold text-gray-600 dark:text-gray-300">Primary Muscles:</span>
								<span class="text-gray-500 dark:text-gray-400"> {exercise.primarymuscles.join(', ')}</span>
                            </div>
							{#if exercise.secondarymuscles.length > 0}
								<div>
									<span class="font-semibold text-gray-600 dark:text-gray-300">Secondary Muscles:</span>
									<span class="text-gray-500 dark:text-gray-400"> {exercise.secondarymuscles.join(', ')}</span>
								</div>
							{/if}
                            <div class="pt-2 min-h-[34px]">
                                <span class="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                    {exercise.type}
                                </span>
                                <span class="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                    {exercise.equipment}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-6">
						<button onclick={() => startEdit(exercise)} class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
						<button onclick={() => handleDeleteExercise(exercise.id)} class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </div>
                </div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Exercise Modal -->
<div
	id="add-exercise-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-lg max-h-full">
		<!-- Modal content -->
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<!-- Modal header -->
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">{editingExerciseId ? 'Edit Exercise' : 'Create New Exercise'}</h3>
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
					data-modal-hide="add-exercise-modal"
				>
					<svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<form class="p-4 md:p-5" onsubmit={saveExercise}>
				{#if exerciseError}
					<p class="text-red-600 text-sm mb-2">{exerciseError}</p>
				{/if}
				{#if exerciseSuccess}
					<p class="text-green-600 text-sm mb-2">{exerciseSuccess}</p>
				{/if}
				<div class="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
					<div class="md:col-span-2">
						<label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
						<input
							type="text"
							name="name"
							id="name"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="e.g. Barbell Bench Press"
							required
							bind:value={name}
						/>
					</div>
					<div class="md:col-span-2">
						<label for="primaryMuscles" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Primary Muscles</label>
						<input
							type="text"
							name="primaryMuscles"
							id="primaryMuscles"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="Comma-separated, e.g. Chest, Triceps"
							required
							bind:value={primaryMusclesStr}
						/>
					</div>
					<div class="md:col-span-2">
						<label for="secondaryMuscles" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Secondary Muscles (optional)</label>
						<input
							type="text"
							name="secondaryMuscles"
							id="secondaryMuscles"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="e.g. Shoulders"
							bind:value={secondaryMusclesStr}
						/>
					</div>
					<div>
						<label for="type" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Exercise Type</label>
						<select
							id="type"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							bind:value={type}
						>
							{#each exerciseTypes as exerciseType}
								<option value={exerciseType}>{exerciseType}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="equipment" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Equipment</label>
						<select
							id="equipment"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							bind:value={equipment}
						>
							{#each equipmentTypes as equipmentType}
								<option value={equipmentType}>{equipmentType}</option>
							{/each}
						</select>
					</div>
				</div>
				<button
					type="submit"
					class="text-white inline-flex items-center bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
				>
					<svg class="me-1 -ms-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
					{editingExerciseId ? 'Save changes' : 'Add new exercise'}
				</button>
			</form>
		</div>
	</div>
</div>

<!-- Confirm Delete Modal -->
<div
	id="confirm-delete-exercise-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-sm max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-red-700 dark:border-red-600">
			<div class="flex items-center justify-between p-4 rounded-t dark:border-gray-600">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Delete exercise?</h3>
				<div class="flex items-center gap-2">
					<button
						onclick={confirmDeleteExercise}
						type="button"
						class="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2 text-center inline-flex items-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
					>
						<CheckOutline class="w-5 h-5" />
						<span class="sr-only">Confirm</span>
					</button>
					<button
						data-modal-hide="confirm-delete-exercise-modal"
						type="button"
						class="text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 p-2"
					>
						<CloseOutline class="w-5 h-5" />
						<span class="sr-only">Cancel</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Stats Modal -->
<div
	id="stats-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-lg max-h-full">
		<!-- Modal content -->
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<!-- Modal header -->
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				{#if selectedExercise}
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">{selectedExercise.name}</h3>
				{/if}
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
					data-modal-hide="stats-modal"
				>
					<svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<div class="p-4 md:p-5">
				{#if selectedExercise}
					{#if statsLoading}
						<p class="text-gray-500 dark:text-gray-400 mt-2">Loading stats...</p>
					{:else}
						<div class="mb-4">
							<label for="timeframe" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Filter by Timeframe</label>
							<select
								id="timeframe"
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
								bind:value={selectedTimeframe}
							>
								<option value="all">All Time</option>
								<option value="7d">Last 7 Days</option>
								<option value="30d">Last 30 Days</option>
								<option value="90d">Last 90 Days</option>
								<option value="365d">Last Year</option>
							</select>
						</div>
						<Tabs tabStyle="underline">
							<TabItem title="Stats" open>
								<div class="grid grid-cols-2 gap-4 mt-4">
									<div>
										<p class="text-gray-500 dark:text-gray-400">Total Sets</p>
										<p class="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalSets}</p>
									</div>
									<div>
										<p class="text-gray-500 dark:text-gray-400">Total Reps</p>
										<p class="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalReps}</p>
									</div>
									<div>
										<p class="text-gray-500 dark:text-gray-400">Total Volume</p>
										<p class="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalVolume} kg</p>
									</div>
									<div>
										<p class="text-gray-500 dark:text-gray-400">Max Weight</p>
										<p class="text-2xl font-bold text-gray-800 dark:text-white">{stats.maxWeight} kg</p>
									</div>
								</div>
							</TabItem>
							<TabItem title="PR Chart">
								<div class="w-full max-w-full overflow-x-auto">
									<div class="min-w-[320px] w-full" style="width:100%;max-width:100%;">
										{#if chartData && chartData.length > 0}
											<Chart options={{ 
												series: [
												{
													name: 'Max Weight',
													data: chartData,
												},
												],
												chart: {
													height: 350,
													fontFamily: 'JetBrains Mono, monospace',
													type: 'area',
													zoom: { enabled: false },
													toolbar: { show: false },
													background: 'transparent',
												},
												dataLabels: { enabled: false },
												colors: ['#2563eb'],
												fill: {
													type: 'gradient',
													gradient: {
														shade: 'light',
														type: 'vertical',
														shadeIntensity: 0.2,
														gradientToColors: ['#93c5fd'],
														inverseColors: false,
														opacityFrom: 0.65,
														opacityTo: 0.08
													}
												},
												stroke: { curve: 'smooth', width: 4 },
												markers: { size: 4, colors: ['#ffffff'], strokeColors: '#2563eb', strokeWidth: 2, hover: { size: 6 } },
												legend: { show: false },
												xaxis: {
													type: 'datetime',
													categories: chartLabels,
													labels: {
														style: {
															colors: '#6b7280', /* tailwind gray-500 for balance */
															fontSize: '12px'
														},
													},
												},
												yaxis: { labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
												tooltip: { theme: 'dark', x: { show: true, formatter: function(val) { try { const ts = typeof val === 'number' ? val : Number(val); const d = new Date(ts); return d.toLocaleDateString(); } catch (e) { return String(val); } } } },
												grid: { show: false, padding: { left: 6, right: 6 } },
												responsive: [
													{
														breakpoint: 600,
														options: {
															chart: { height: 220 },
															xaxis: {
																labels: {
																	rotate: -60,
																	fontSize: '8px',
																}
															}
														}
													}
												]
											}} />
										{:else}
											<div class="text-center text-red-700 py-4">No chart data available.</div>
										{/if}
									</div>
								</div>
							</TabItem>
						</Tabs>
					{/if}
				{:else}
					<p class="text-gray-500 dark:text-gray-400">No exercise selected.</p>
				{/if}
			</div>
		</div>
	</div>
</div>