<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { initFlowbite, Modal, Dropdown } from 'flowbite';
	import { workouts } from '$lib/stores';
	import { getExercises } from '$lib/supabase';
	import type { Workout, Exercise, WorkoutExercise } from '$lib/supabase';
	import { PlusOutline, DotsVerticalOutline } from 'flowbite-svelte-icons';
	import { user } from '$lib/stores';

	let exercises: Exercise[] = $state([]);
	let editingWorkout: Workout | null = $state(null);
	let workoutError = $state('');
	let workoutSuccess = $state('');
	let viewWorkoutModal: Modal;
	let addWorkoutModal: Modal;

	// Add workout state
	let newWorkoutName = $state('');
	let newWorkoutExerciseId = $state('');
	let newWorkoutSets = $state<
		{ id: string; exerciseId: string; exerciseName: string; weight: number; reps: number }[]
	>([]);

	let groupedSets = $derived(
		newWorkoutSets.reduce(
			(acc, set) => {
				let group = acc.find((g) => g.exerciseId === set.exerciseId);
				if (!group) {
					group = {
						exerciseId: set.exerciseId,
						exerciseName: set.exerciseName,
						sets: []
					};
					acc.push(group);
				}
				group.sets.push(set);
				return acc;
			},
			[] as {
				exerciseId: string;
				exerciseName: string;
				sets: typeof newWorkoutSets;
			}[]
		)
	);

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
		const viewModalElement = document.getElementById('view-workout-modal');
		if (viewModalElement) {
			viewWorkoutModal = new Modal(viewModalElement);
		}
		const addModalElement = document.getElementById('add-workout-modal');
		if (addModalElement) {
			addWorkoutModal = new Modal(addModalElement, {
				onHide: () => {
					editingWorkout = null;
					newWorkoutName = '';
					newWorkoutSets = [];
					newWorkoutExerciseId = '';
				}
			});
		}
	});

	$effect(() => {
		if ($user) {
			void loadExercises();
		}
	});

	function startAdd() {
		editingWorkout = null;
		newWorkoutName = '';
		newWorkoutExerciseId = '';
		newWorkoutSets = [];
		addWorkoutModal.show();
	}

	async function addSet() {
		if (!newWorkoutExerciseId) {
			// TODO: show error to user
			return;
		}
		const exercise = exercises.find((e) => e.id === newWorkoutExerciseId);
		if (!exercise) {
			// TODO: show error to user
			return;
		}
		newWorkoutSets = [
			...newWorkoutSets,
			{
				id: crypto.randomUUID(),
				exerciseId: newWorkoutExerciseId,
				exerciseName: exercise.name,
				weight: 0,
				reps: 0
			}
		];
		await tick();
		initFlowbite();
	}

	function removeSet(id: string) {
		newWorkoutSets = newWorkoutSets.filter((set) => set.id !== id);
	}

	function handleAddWorkout(event: Event) {
		event.preventDefault();
		if (!newWorkoutName.trim() || !$user || newWorkoutSets.length === 0) return;

		if (editingWorkout) {
			// Update existing workout
			const updatedWorkout: Workout = {
				...editingWorkout,
				name: newWorkoutName,
				exercises: newWorkoutSets.map((set) => {
					const exercise = exercises.find((e) => e.id === set.exerciseId);
					return {
						id: set.id, // Preserving original ID for existing sets
						workout_id: editingWorkout.id,
						exercise_id: set.exerciseId,
						sets: 1,
						reps: set.reps,
						weight: set.weight,
						exercises: exercise
					};
				})
			};

			workouts.update((items) =>
				items.map((w) => (w.id === editingWorkout!.id ? updatedWorkout : w))
			);
		} else {
			// Add new workout
			const newWorkoutId = crypto.randomUUID();

			const workoutExercises: any[] = newWorkoutSets.map((set) => {
				const exercise = exercises.find((e) => e.id === set.exerciseId);
				return {
					id: crypto.randomUUID(),
					workout_id: newWorkoutId,
					exercise_id: set.exerciseId,
					sets: 1, // Each row is 1 set
					reps: set.reps,
					weight: set.weight,
					exercises: exercise
				};
			});

			const newWorkout: Workout = {
				id: newWorkoutId,
				user_id: $user.id,
				name: newWorkoutName,
				exercises: workoutExercises
			};

			workouts.update((items) => [...items, newWorkout]);
		}
		addWorkoutModal.hide();
	}

	function startEdit(workout: Workout) {
		editingWorkout = workout;
		newWorkoutName = workout.name;
		newWorkoutSets = (workout.exercises || []).map((we: any) => ({
			id: we.id,
			exerciseId: we.exercise_id,
			exerciseName: we.exercises.name,
			weight: we.weight,
			reps: we.reps
		}));
		addWorkoutModal.show();
	}

	function viewWorkout(workout: Workout) {
		editingWorkout = workout;
		viewWorkoutModal.show();
	}

	function handleDeleteWorkout(id: string | undefined) {
		if (!id) return;
		workouts.update((items) => items.filter((item) => item.id !== id));
	}

	// Workout Exercise Management (in view modal)
	let selectedExerciseId = $state('');
	let sets = $state(3);
	let reps = $state(10);
	let weight = $state(100);

	function handleAddExerciseToWorkout(event: Event) {
		event.preventDefault();
		if (!editingWorkout || !editingWorkout.id || !selectedExerciseId) return;
		const currentWorkout = editingWorkout;

		const exercise = exercises.find((e) => e.id === selectedExerciseId);
		if (!exercise) return;

		const workoutExercise: any = {
			id: crypto.randomUUID(),
			workout_id: currentWorkout.id,
			exercise_id: selectedExerciseId,
			sets,
			reps,
			weight,
			exercises: exercise // Nest the full exercise object
		};

		currentWorkout.exercises = [...(currentWorkout.exercises || []), workoutExercise];
		workouts.update((items) =>
			items.map((item) => (item.id === currentWorkout.id ? currentWorkout : item))
		);

		selectedExerciseId = '';
		sets = 3;
		reps = 10;
		weight = 100;
	}

	function handleRemoveExerciseFromWorkout(workoutExerciseId: string) {
		if (!editingWorkout) return;
		const currentWorkout = editingWorkout;
		currentWorkout.exercises = (currentWorkout.exercises || []).filter(
			(we) => we.id !== workoutExerciseId
		);
		workouts.update((items) =>
			items.map((item) => (item.id === currentWorkout.id ? currentWorkout : item))
		);
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
		<button
			onclick={startAdd}
			type="button"
			class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
		>
			<PlusOutline class="w-6 h-6" />
			<span class="sr-only">Add Workout</span>
		</button>
	</div>

	{#if $workouts.length === 0}
		<div
			class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
		>
			<h3 class="text-xl font-semibold text-gray-800 dark:text-white">No workouts yet!</h3>
			<p class="text-gray-500 dark:text-gray-400 mt-2">Click "Add Workout" to get started.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each $workouts as workout (workout.id)}
				<div
					class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg"
				>
					<div class="p-6">
						<h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
							{workout.name}
						</h5>
					</div>
					<div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-3">
						<button
							onclick={() => viewWorkout(workout)}
							class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View</button
						>
						<button
							onclick={() => startEdit(workout)}
							class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Edit</button
						>
						<button
							onclick={() => handleDeleteWorkout(workout.id)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">Delete</button
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Workout Modal -->
<div
	id="add-workout-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-4xl max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800">
			<div
				class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600"
			>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
					{editingWorkout ? 'Edit Workout' : 'Add New Workout'}
				</h3>
				<button
					type="button"
					class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
					data-modal-hide="add-workout-modal"
				>
					<svg
						class="w-3 h-3"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 14 14"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
						/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<form onsubmit={handleAddWorkout} class="p-4 md:p-5">
				<div class="grid gap-6 mb-6 grid-cols-1">
					<div>
						<label
							for="workout-name"
							class="block mb-2 text-base font-medium text-gray-900 dark:text-white"
							>Workout Name</label
						>
						<input
							type="text"
							id="workout-name"
							bind:value={newWorkoutName}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
							placeholder="e.g. Push Day"
							required
						/>
					</div>
					<div>
						<label
							for="workout-exercise"
							class="block mb-2 text-base font-medium text-gray-900 dark:text-white"
							>Exercise</label
						>
						<select
							id="workout-exercise"
							bind:value={newWorkoutExerciseId}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
							required
						>
							<option value="" disabled>Select an exercise</option>
							{#each exercises as exercise}
								<option value={exercise.id}>{exercise.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-6">
					<div class="flex justify-end items-center mb-4">
						<button
							type="button"
							onclick={addSet}
							class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
						>
							Add Set
						</button>
					</div>
					<div class="flex flex-col gap-4">
						{#each groupedSets as group (group.exerciseId)}
							<div class="flex flex-col gap-4 mt-4">
								<h5 class="text-lg font-semibold text-gray-800 dark:text-white">
									{group.exerciseName}
								</h5>
								{#if group.sets.length > 0}
									<div
										class="grid grid-cols-5 gap-4 items-center font-medium text-gray-500 dark:text-gray-400"
									>
										<div class="text-left"></div>
										<div class="text-base text-left">Set</div>
										<div class="text-base text-left">Weight</div>
										<div class="text-base text-left">Reps</div>
										<div class="text-base text-left">Log</div>
									</div>
								{/if}
								{#each group.sets as set, i (set.id)}
									<div
										class="grid grid-cols-5 gap-4 items-center border border-gray-200 dark:border-gray-700 rounded-lg p-3"
									>
										<div class="flex justify-start">
											<button
												id="dropdownMenuIconButton-{set.id}"
												data-dropdown-toggle="dropdownDots-{set.id}"
												class="inline-flex items-center p-2 text-sm font-medium text-center text-gray-900 bg-white rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
												type="button"
											>
												<DotsVerticalOutline class="w-5 h-5 text-gray-500" />
											</button>
											<div
												id="dropdownDots-{set.id}"
												class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600"
											>
												<ul
													class="py-2 text-sm text-gray-700 dark:text-gray-200"
													aria-labelledby="dropdownMenuIconButton-{set.id}"
												>
													<li>
														<button
															type="button"
															onclick={() => removeSet(set.id)}
															class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
															>Remove</button
														>
													</li>
												</ul>
											</div>
										</div>
										<div class="text-base font-medium text-gray-900 dark:text-white text-left">
											{i + 1}
										</div>
										<div class="flex justify-start">
											<label for="weight-{set.id}" class="sr-only">Weight</label>
											<input
												type="number"
												id="weight-{set.id}"
												bind:value={set.weight}
												class="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-24 p-3 dark:bg-gray-700 dark:border-gray-600"
												placeholder="Weight"
											/>
										</div>
										<div class="flex justify-start">
											<label for="reps-{set.id}" class="sr-only">Reps</label>
											<input
												type="number"
												id="reps-{set.id}"
												bind:value={set.reps}
												class="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-24 p-3 dark:bg-gray-700 dark:border-gray-600"
												placeholder="Reps"
											/>
										</div>
										<div class="flex justify-start">
											<input
												type="checkbox"
												class="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
											/>
										</div>
									</div>
								{/each}
							</div>
						{/each}
					</div>
				</div>

				<button
					type="submit"
					class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-base px-5 py-3 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>
					{editingWorkout ? 'Save Changes' : 'Add workout'}
				</button>
			</form>
		</div>
	</div>
</div>

<!-- View Workout Modal -->
<div
	id="view-workout-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-2xl max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800">
			<div
				class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600"
			>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
					{editingWorkout?.name}
				</h3>
				<button
					type="button"
					class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
					data-modal-hide="view-workout-modal"
				>
					<svg
						class="w-3 h-3"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 14 14"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
						/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<div class="p-4 md:p-5 space-y-4">
				<form onsubmit={handleAddExerciseToWorkout} class="grid grid-cols-5 gap-4 items-end">
					<div class="col-span-2">
						<label
							for="exercise"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Exercise</label
						>
						<select
							id="exercise"
							bind:value={selectedExerciseId}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
						>
							<option value="" disabled>Select an exercise</option>
							{#each exercises as exercise}
								<option value={exercise.id}>{exercise.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="sets" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
							>Sets</label
						>
						<input
							type="number"
							id="sets"
							bind:value={sets}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<div>
						<label for="reps" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
							>Reps</label
						>
						<input
							type="number"
							id="reps"
							bind:value={reps}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<div>
						<label
							for="weight"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Weight</label
						>
						<input
							type="number"
							id="weight"
							bind:value={weight}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<button
						type="submit"
						class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
						>Add</button
					>
				</form>

				<div class="mt-4">
					<h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">
						Exercises in this workout:
					</h4>
					<ul class="space-y-2">
						{#each editingWorkout?.exercises || [] as woExercise}
							<li
								class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
							>
								<div>
									<span class="font-bold text-gray-800 dark:text-gray-200"
										>{(woExercise as any).exercises.name}</span
									>
									<span class="text-sm text-gray-500 dark:text-gray-400 ml-2"
										>{woExercise.sets} sets x {woExercise.reps} reps @ {woExercise.weight}kg</span
									>
								</div>
								<button
									onclick={() => woExercise.id && handleRemoveExerciseFromWorkout(woExercise.id)}
									class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
									>Remove</button
								>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
