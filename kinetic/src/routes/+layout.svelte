<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { initFlowbite, Modal } from 'flowbite';
	import { exerciseTypes, equipmentTypes } from '$lib/stores.ts';

	let { children } = $props();

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
		modal = new Modal(document.getElementById('add-exercise-modal'));
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

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
	<main class="flex-grow container mx-auto p-4">
		<h1 class="mb-4 text-2xl font-extrabold leading-none tracking-tight text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
			Exercises
		</h1>
		<p class="mb-6 text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">
			A list of exercises you can add to your workout routines.
		</p>

		<div class="flex justify-end mb-4">
			<!-- Modal toggle -->
			<button
				on:click={startAdd}
				class="block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				type="button"
			>
				Add Exercise
			</button>
		</div>

		<!-- Add Exercise Modal -->
		<div
			id="add-exercise-modal"
			tabindex="-1"
			aria-hidden="true"
			class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
		>
			<div class="relative p-4 w-full max-w-md max-h-full">
				<!-- Modal content -->
				<div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
					<!-- Modal header -->
					<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{editingExerciseId ? 'Edit Exercise' : 'Create New Exercise'}</h3>
						<button
							type="button"
							class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
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
						<div class="grid gap-4 mb-4 grid-cols-2">
							<div class="col-span-2">
								<label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
								<input
									type="text"
									name="name"
									id="name"
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
									placeholder="e.g. Barbell Bench Press"
									required
									bind:value={name}
								/>
							</div>
							<div class="col-span-2">
								<label for="primaryMuscles" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Primary Muscles</label>
								<input
									type="text"
									name="primaryMuscles"
									id="primaryMuscles"
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
									placeholder="Comma-separated, e.g. Chest, Triceps"
									required
									bind:value={primaryMusclesStr}
								/>
							</div>
							<div class="col-span-2">
								<label for="secondaryMuscles" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Secondary Muscles (optional)</label>
								<input
									type="text"
									name="secondaryMuscles"
									id="secondaryMuscles"
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
									placeholder="e.g. Shoulders"
									bind:value={secondaryMusclesStr}
								/>
							</div>
							<div class="col-span-2 sm:col-span-1">
								<label for="type" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Exercise Type</label>
								<select
									id="type"
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
									bind:value={type}
								>
									{#each $exerciseTypes as exerciseType}
										<option value={exerciseType}>{exerciseType}</option>
									{/each}
								</select>
							</div>
							<div class="col-span-2 sm:col-span-1">
								<label for="equipment" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Equipment</label>
								<select
									id="equipment"
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
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
							class="text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
						>
							<svg class="me-1 -ms-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
							{editingExerciseId ? 'Save changes' : 'Add new exercise'}
						</button>
					</form>
				</div>
			</div>
		</div>

		{#if exercises.length === 0}
			<div class="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg dark:border-gray-600">
				<h3 class="text-xl font-medium text-gray-900 dark:text-white">No exercises yet!</h3>
				<p class="text-gray-500 dark:text-gray-400 mt-1">Click "Add Exercise" to get started.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each exercises as exercise (exercise.id)}
					<div class="w-full bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
						<div class="p-5">
							<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{exercise.name}</h5>
							<div class="space-y-2 text-sm">
								<div>
									<span class="font-semibold text-gray-700 dark:text-gray-300">Primary Muscles:</span>
									<span class="text-gray-600 dark:text-gray-400"> {exercise.primaryMuscles.join(', ')}</span>
								</div>
								{#if exercise.secondaryMuscles.length > 0}
									<div>
										<span class="font-semibold text-gray-700 dark:text-gray-300">Secondary Muscles:</span>
										<span class="text-gray-600 dark:text-gray-400"> {exercise.secondaryMuscles.join(', ')}</span>
									</div>
								{/if}
								<div class="pt-2">
									<span class="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
										{exercise.type}
									</span>
									<span class="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
										{exercise.equipment}
									</span>
								</div>
								<div class="pt-2 flex justify-end">
									<button on:click={() => startEdit(exercise)} class="text-sm font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4">Edit</button>
									<button on:click={() => deleteExercise(exercise.id)} class="text-sm font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		{@render children?.()}
	</main>
	<header>
		<nav class="bg-white border-gray-200 dark:bg-gray-900 border-t dark:border-gray-700">
			<div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
				<a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
					<img src={favicon} class="h-8" alt="Kinetic Logo" />
					<span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white"
						>Kinetic</span
					>
				</a>
				<button
					data-collapse-toggle="navbar-default"
					type="button"
					class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
					aria-controls="navbar-default"
					aria-expanded="false"
				>
					<span class="sr-only">Open main menu</span>
					<svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
					</svg>
				</button>
				<div class="hidden w-full md:block md:w-auto" id="navbar-default">
					<ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
						<li>
							<a href="/" class="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500" aria-current="page">Exercises</a>
						</li>
						<li>
							<a href="/settings" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent">Settings</a>
						</li>
					</ul>
				</div>
			</div>
		</nav>
	</header>
</div>