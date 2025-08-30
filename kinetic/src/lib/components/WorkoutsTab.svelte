<script lang="ts">
	import { onMount } from 'svelte';
	import { initFlowbite, Modal } from 'flowbite';
	import { workouts } from '$lib/stores';
	import { getExercises } from '$lib/supabase';
	import type { Workout, Exercise, WorkoutExercise } from '$lib/supabase';
	import { PlusOutline } from 'flowbite-svelte-icons';
    import { user } from '$lib/stores';

	let exercises: Exercise[] = $state([]);
	let editingWorkout: Workout | null = $state(null);
	let workoutError = $state('');
	let workoutSuccess = $state('');
	let addWorkoutModal: Modal;
	let viewWorkoutModal: Modal;

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
		const addModalElement = document.getElementById('add-workout-modal');
		if (addModalElement) {
			addWorkoutModal = new Modal(addModalElement);
		}
		const viewModalElement = document.getElementById('view-workout-modal');
		if (viewModalElement) {
			viewWorkoutModal = new Modal(viewModalElement);
		}
	});

	$effect(() => {
		if ($user) {
			void loadExercises();
		}
	});

	// Form state
	let name = $state('');

	function startAdd() {
		editingWorkout = null;
		name = '';
		addWorkoutModal.show();
	}

	function startEdit(workout: Workout) {
		editingWorkout = workout;
		name = workout.name;
		addWorkoutModal.show();
	}

	function viewWorkout(workout: Workout) {
		editingWorkout = workout;
		viewWorkoutModal.show();
	}

	function saveWorkout() {
		workoutError = '';
		workoutSuccess = '';
		if (!name.trim()) {
			workoutError = 'Name is required.';
			return;
		}

		const workoutData = {
			id: editingWorkout?.id || crypto.randomUUID(),
			name: name.trim(),
			exercises: editingWorkout?.exercises || []
		};

		if (editingWorkout) {
			workouts.update(items => items.map(item => item.id === editingWorkout!.id ? workoutData : item));
			workoutSuccess = 'Workout updated.';
			addWorkoutModal.hide();
			editingWorkout = null;
			name = '';
		} else {
			workouts.update(items => [...items, workoutData]);
			workoutSuccess = 'Workout added.';
			addWorkoutModal.hide();
			name = '';
			viewWorkout(workoutData);
		}
	}

	function handleDeleteWorkout(id: string | undefined) {
		if (!id) return;
		workouts.update(items => items.filter(item => item.id !== id));
	}

	// Workout Exercise Management
	let selectedExerciseId = $state('');
	let sets = $state(3);
	let reps = $state(10);
	let weight = $state(100);

	function handleAddExerciseToWorkout(event: Event) {
		event.preventDefault();
		if (!editingWorkout || !editingWorkout.id || !selectedExerciseId) return;

		const exercise = exercises.find(e => e.id === selectedExerciseId);
		if (!exercise) return;

		const workoutExercise: any = {
			id: crypto.randomUUID(),
			workout_id: editingWorkout.id,
			exercise_id: selectedExerciseId,
			sets,
			reps,
			weight,
			exercises: exercise // Nest the full exercise object
		};

		editingWorkout.exercises = [...(editingWorkout.exercises || []), workoutExercise];
		workouts.update(items => items.map(item => item.id === editingWorkout!.id ? editingWorkout : item));

		selectedExerciseId = '';
		sets = 3;
		reps = 10;
		weight = 100;
	}

	function handleRemoveExerciseFromWorkout(workoutExerciseId: string) {
		if (!editingWorkout) return;
		editingWorkout.exercises = (editingWorkout.exercises || []).filter(we => we.id !== workoutExerciseId);
		workouts.update(items => items.map(item => item.id === editingWorkout!.id ? editingWorkout : item));
	}

</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Workouts</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                A list of workouts you can use to track your progress.
            </p>
        </div>
        <button onclick={startAdd} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            <PlusOutline class="w-6 h-6" />
            <span class="sr-only">Add Workout</span>
        </button>
    </div>

	{#if $workouts.length === 0}
		<div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
			<h3 class="text-xl font-semibold text-gray-800 dark:text-white">No workouts yet!</h3>
			<p class="text-gray-500 dark:text-gray-400 mt-2">Click "Add Workout" to get started.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each $workouts as workout (workout.id)}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
                    <div class="p-6">
                        <h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{workout.name}</h5>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-3">
						<button onclick={() => viewWorkout(workout)} class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View</button>
						<button onclick={() => startEdit(workout)} class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
						<button onclick={() => handleDeleteWorkout(workout.id)} class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </div>
                </div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add/Edit Workout Modal -->
<div id="add-workout-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
	<div class="relative p-4 w-full max-w-lg max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800">
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">{editingWorkout ? 'Edit Workout' : 'Create New Workout'}</h3>
				<button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white" data-modal-hide="add-workout-modal">
					<svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<form class="p-4 md:p-5" onsubmit={saveWorkout}>
				{#if workoutError}
					<p class="text-red-600 text-sm mb-2">{workoutError}</p>
				{/if}
				<div class="grid gap-6 mb-6 grid-cols-1">
					<div>
						<label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
						<input type="text" name="name" id="name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="e.g. Push Day" required bind:value={name} />
					</div>
				</div>
				<button type="submit" class="text-white inline-flex items-center bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors">
					{editingWorkout ? 'Save changes' : 'Add new workout'}
				</button>
			</form>
		</div>
	</div>
</div>

<!-- View Workout Modal -->
<div id="view-workout-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-2xl max-h-full">
        <div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{editingWorkout?.name}</h3>
                <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white" data-modal-hide="view-workout-modal">
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>
            <div class="p-4 md:p-5 space-y-4">
				<form onsubmit={handleAddExerciseToWorkout} class="grid grid-cols-5 gap-4 items-end">
					<div class="col-span-2">
						<label for="exercise" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Exercise</label>
						<select id="exercise" bind:value={selectedExerciseId} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
							<option value="" disabled>Select an exercise</option>
							{#each exercises as exercise}
								<option value={exercise.id}>{exercise.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="sets" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Sets</label>
						<input type="number" id="sets" bind:value={sets} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600" />
					</div>
					<div>
						<label for="reps" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Reps</label>
						<input type="number" id="reps" bind:value={reps} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600" />
					</div>
					<div>
						<label for="weight" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Weight</label>
						<input type="number" id="weight" bind:value={weight} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600" />
					</div>
					<button type="submit" class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800">Add</button>
				</form>

                <div class="mt-4">
					<h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Exercises in this workout:</h4>
                    <ul class="space-y-2">
                        {#each editingWorkout?.exercises || [] as woExercise}
                            <li class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <div>
									<span class="font-bold text-gray-800 dark:text-gray-200">{woExercise.exercises.name}</span>
									<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">{woExercise.sets} sets x {woExercise.reps} reps @ {woExercise.weight}kg</span>
								</div>
                                <button onclick={() => handleRemoveExerciseFromWorkout(woExercise.id)} class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">Remove</button>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
