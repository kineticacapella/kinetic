<script lang="ts">
	import { onMount } from 'svelte';
	import { initFlowbite, Modal } from 'flowbite';
	import { exerciseTypes, equipmentTypes } from '$lib/stores.ts';

	type Exercise = {
		id: number;
		name: string;
		primaryMuscles: string[];
		secondaryMuscles: string[];
		type: string;
		equipment: string;
	};

	let exercises: Exercise[] = $state([]);
	let editingExerciseId: number | null = $state(null);
	let modal: Modal;

	onMount(() => {
		initFlowbite();
		const storedExercises = localStorage.getItem('exercises');
		if (storedExercises) {
			exercises = JSON.parse(storedExercises);
		}
		const modalElement = document.getElementById('add-exercise-modal');
		if (modalElement) {
			modal = new Modal(modalElement);
		}
	});

	$effect(() => {
		localStorage.setItem('exercises', JSON.stringify(exercises));
	});

	// Form state
	let name = $state('');
	let primaryMusclesStr = $state('');
	let secondaryMusclesStr = $state('');
	let type = $state('Strength');
	let equipment = $state('Barbell');

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
		editingExerciseId = exercise.id;
		name = exercise.name;
		primaryMusclesStr = exercise.primaryMuscles.join(', ');
		secondaryMusclesStr = exercise.secondaryMuscles.join(', ');
		type = exercise.type;
		equipment = exercise.equipment;
		modal.show();
	}

	function saveExercise() {
		if (!name.trim() || !primaryMusclesStr.trim()) {
			return;
		}

		const exerciseData = {
			name: name.trim(),
			primaryMuscles: primaryMusclesStr.split(',').map((s) => s.trim()).filter(Boolean),
			secondaryMuscles: secondaryMusclesStr.split(',').map((s) => s.trim()).filter(Boolean),
			type,
			equipment
		};

		if (editingExerciseId !== null) {
			const index = exercises.findIndex((ex) => ex.id === editingExerciseId);
			if (index !== -1) {
				exercises[index] = { ...exercises[index], ...exerciseData };
			}
		} else {
			const newExercise: Exercise = {
				id: exercises.length > 0 ? Math.max(...exercises.map((e) => e.id)) + 1 : 1,
				...exerciseData
			};
			exercises.push(newExercise);
		}

		modal.hide();
		editingExerciseId = null;
		name = '';
		primaryMusclesStr = '';
		secondaryMusclesStr = '';
		type = 'Strength';
		equipment = 'Barbell';
	}

	function deleteExercise(id: number) {
		const index = exercises.findIndex((ex) => ex.id === id);
		if (index !== -1) {
			exercises.splice(index, 1);
		}
	}
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Exercises</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                A list of exercises you can add to your workout routines.
            </p>
        </div>
        <button
            on:click={startAdd}
            class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
            type="button"
        >
            Add Exercise
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
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
                    <div class="p-6">
                        <h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{exercise.name}</h5>
                        <div class="space-y-3 text-sm">
                            <div>
                                <span class="font-semibold text-gray-600 dark:text-gray-300">Primary Muscles:</span>
                                <span class="text-gray-500 dark:text-gray-400"> {exercise.primaryMuscles.join(', ')}</span>
                            </div>
                            {#if exercise.secondaryMuscles.length > 0}
                                <div>
                                    <span class="font-semibold text-gray-600 dark:text-gray-300">Secondary Muscles:</span>
                                    <span class="text-gray-500 dark:text-gray-400"> {exercise.secondaryMuscles.join(', ')}</span>
                                </div>
                            {/if}
                            <div class="pt-2">
                                <span class="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                    {exercise.type}
                                </span>
                                <span class="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                    {exercise.equipment}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-3">
                        <button on:click={() => startEdit(exercise)} class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                        <button on:click={() => deleteExercise(exercise.id)} class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">Delete</button>
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
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800">
			<!-- Modal header -->
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">{editingExerciseId ? 'Edit Exercise' : 'Create New Exercise'}</h3>
				<button
					type="button"
					class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
					data-modal-hide="add-exercise-modal"
				>
					<svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<form class="p-4 md:p-5" on:submit|preventDefault={saveExercise}>
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
							{#each $exerciseTypes as exerciseType}
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
							{#each $equipmentTypes as equipmentType}
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
