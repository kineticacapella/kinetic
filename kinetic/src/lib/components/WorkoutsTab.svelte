<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { initFlowbite, Modal, Dropdown } from 'flowbite';
	import {
		workoutLogs,
		workouts,
		addWorkoutLog,
		updateWorkoutLog,
		activeWorkout,
		activeWorkoutLog,
		sessionTimer,
		formatTime,
		startSessionTimer,
		stopSessionTimer,
		resetSessionTimer,
		workoutToStart
	} from '$lib/stores';
	import {
		getExercises,
		getWorkouts,
		getWorkout,
		addWorkout,
		updateWorkout,
		deleteWorkout,
		addExerciseToWorkout,
		removeExerciseFromWorkout,
		updateExerciseInWorkout
	} from '$lib/supabase';
	import type { Workout, Exercise, WorkoutExercise, WorkoutLog, LoggedSet } from '$lib/supabase';
	import {
		PlusOutline,
		DotsVerticalOutline,
		TrashBinOutline,
		EyeOutline,
		PenOutline,
		ArrowDownOutline,
		CheckOutline,
		CloseOutline,
		PauseSolid,
		HeartSolid,
		PlaySolid
	} from 'flowbite-svelte-icons';
	import { user } from '$lib/stores';

	let exercises: Exercise[] = $state([]);
	let editingWorkout: Workout | null = $state(null);
	let workoutError = $state('');
	let workoutSuccess = $state('');
	let viewWorkoutModal: Modal;
	let addWorkoutModal: Modal;
	let dropSetModal: Modal;
	let confirmEndSessionModal: Modal;
	let confirmDeleteModal: Modal;
	let workoutToDeleteId: string | null = $state(null);
	let workoutMode: 'edit' | 'play' = $state('edit');
	let isEndingSession = $state(false);

	function isSetLogged(setId: string) {
		if (!$activeWorkoutLog || !$activeWorkoutLog.sets) {
			return false;
		}
		return $activeWorkoutLog.sets.some((s: any) => s.set_id === setId);
	}

	let lastSelectedExercise: Exercise | null = $state(null);
	let initialWorkoutState = $state('');
	let hasWorkoutChanged = $state(false);
	$effect(() => {
		hasWorkoutChanged = !!(
			workoutMode === 'play' &&
			initialWorkoutState &&
			initialWorkoutState !== JSON.stringify(newWorkoutSets)
		);
	});

	let addExerciseModal: Modal;
	let exerciseSearchText = $state('');
	let filteredExercises = $derived(
		exercises.filter(
			(e) => e.id && e.name.toLowerCase().includes(exerciseSearchText.toLowerCase())
		)
	);

	// Add workout state
	let newWorkoutName = $state('');
	let newWorkoutExerciseId = $state('');
	let newWorkoutSets = $state<
		{
			id: string;
			exercise_id: string;
			exercise_name: string;
			weight: number;
			reps: number;
			is_drop_set?: boolean;
			myo_rep?: 'start' | 'match' | null;
		}[]
	>([]);

	// New state for drop set feature
	let activeSetForDropSet: { id: string; exerciseId: string } | null = $state(null);
	let dropEachSubsequentSet = $state(false);
	let reductionType = $state<'percent' | 'weight'>('percent');
	let weightReductionPercentage = $state(10);
	let weightReductionAmount = $state(5);
	type DropSetReduction = { type: 'percent'; value: number } | { type: 'weight'; value: number };
	let exerciseDropSetInfo: { [exerciseId: string]: { auto: boolean; reduction: DropSetReduction } } = $state(
		{}
	);

	let groupedSets = $derived(
		newWorkoutSets.reduce(
			(acc, set) => {
				let group = acc.find((g) => g.exercise_id === set.exercise_id);
				if (!group) {
					group = {
						exercise_id: set.exercise_id,
						exercise_name: set.exercise_name,
						sets: []
					};
					acc.push(group);
				}
				group.sets.push(set);
				return acc;
			},
			[] as {
				exercise_id: string;
				exercise_name: string;
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

	async function loadWorkouts() {
		if (!$user) return;
		try {
			const data = await getWorkouts($user);
			workouts.set(data || []);
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error fetching workouts:', error.message);
			} else {
				console.error('Unknown error fetching workouts:', error);
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
					if (workoutMode !== 'play') {
						editingWorkout = null;
						newWorkoutName = '';
						newWorkoutSets = [];
						newWorkoutExerciseId = '';
						workoutMode = 'edit';
						if (!$activeWorkoutLog) {
							resetSessionTimer();
							activeWorkout.set(null);
						}
					}
				}
			});
		}
		const dropSetModalEl = document.getElementById('drop-set-modal');
		if (dropSetModalEl) {
			dropSetModal = new Modal(dropSetModalEl);
		}
		const confirmEndSessionModalEl = document.getElementById('confirm-end-session-modal');
		if (confirmEndSessionModalEl) {
			confirmEndSessionModal = new Modal(confirmEndSessionModalEl);
		}
		const confirmDeleteModalEl = document.getElementById('confirm-delete-modal');
		if (confirmDeleteModalEl) {
			confirmDeleteModal = new Modal(confirmDeleteModalEl);
		}
		const addExerciseModalEl = document.getElementById('add-exercise-to-workout-modal');
		if (addExerciseModalEl) {
			addExerciseModal = new Modal(addExerciseModalEl);
		}
	});

	$effect(() => {
		if ($user) {
			void loadExercises();
			void loadWorkouts();
		}
	});

	$effect(() => {
		const workout = $workoutToStart;
		if (workout) {
			startWorkout(workout);
			workoutToStart.set(null); // Reset the store
		}
	});

	$effect(() => {
		if (isEndingSession) return;
		if ($workoutLogs) {
			const ongoing = $workoutLogs.filter((log: WorkoutLog) => !log.ended_at);
			if (ongoing.length > 0) {
				const latestOngoing = ongoing.sort(
					(a: WorkoutLog, b: WorkoutLog) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
				)[0];

				const workout = ($workouts || []).find((w: Workout) => w.name === latestOngoing.workout_name);

				if (workout && workout.id) {
					activeWorkout.set(workout);
					activeWorkoutLog.set(latestOngoing);
					const elapsed = (new Date().getTime() - new Date(latestOngoing.started_at).getTime()) / 1000;
					sessionTimer.set(Math.floor(elapsed));
					startSessionTimer();
				}
			} else {
				if (workoutMode === 'play') {
					activeWorkout.set(null);
					activeWorkoutLog.set(null);
					workoutMode = 'edit';
					resetSessionTimer();
					if (addWorkoutModal) addWorkoutModal.hide();
				}
			}
		}
	});

	function startAdd() {
		editingWorkout = null;
		newWorkoutName = '';
		newWorkoutExerciseId = '';
		newWorkoutSets = [];
		workoutMode = 'edit';
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

		const setsForExercise = newWorkoutSets.filter((s) => s.exercise_id === newWorkoutExerciseId);
		const lastSet = setsForExercise.length > 0 ? setsForExercise[setsForExercise.length - 1] : null;

		let isDrop = false;
		let weight = 0;
		let reps = 0;
		let myoRep: 'start' | 'match' | null = null;

		// Inherit weight and reps from the last set if it exists
		if (lastSet) {
			weight = lastSet.weight;
			reps = lastSet.reps;
		}

		const myoStartSet = setsForExercise.find((s) => s.myo_rep === 'start');

		if (myoStartSet) {
			myoRep = 'match';
			reps = myoStartSet.reps;
			weight = myoStartSet.weight;
		} else {
			const config = exerciseDropSetInfo[newWorkoutExerciseId];
			if (lastSet && config?.auto && lastSet.is_drop_set) {
				isDrop = true;
				let calculatedWeight = 0;
				if (config.reduction.type === 'percent') {
					const reductionFactor = 1 - (config.reduction.value || 0) / 100;
					calculatedWeight = Math.round(lastSet.weight * reductionFactor);
				} else {
					// type is 'weight'
					calculatedWeight = lastSet.weight - (config.reduction.value || 0);
				}

				if (calculatedWeight <= 0) {
					return; // Do not add set if weight is 0 or less
				}
				weight = calculatedWeight;
				reps = lastSet.reps;
			}
		}

		newWorkoutSets = [
			...newWorkoutSets,
			{
				id: crypto.randomUUID(),
				exercise_id: newWorkoutExerciseId,
				exercise_name: exercise?.name || '',
				weight: weight,
				reps: reps,
				is_drop_set: isDrop,
				myo_rep: myoRep
			}
		];
		await tick();
		initFlowbite();
	}

	function removeSet(id: string) {
		newWorkoutSets = newWorkoutSets.filter((set) => set.id !== id);
	}

	function toggleMyoRep(setId: string) {
		const setIndex = newWorkoutSets.findIndex((s) => s.id === setId);
		if (setIndex === -1) return;

		const exerciseId = newWorkoutSets[setIndex].exercise_id;
		const isCurrentlyStart = newWorkoutSets[setIndex].myo_rep === 'start';

		// Reset all myo-reps for this exercise first
		newWorkoutSets = newWorkoutSets.map((s) => {
			if (s.exercise_id === exerciseId) {
				return { ...s, myo_rep: null };
			}
			return s;
		});

		// If it wasn't the start, make it the start.
		if (!isCurrentlyStart) {
			newWorkoutSets[setIndex].myo_rep = 'start';
			// Disable drop sets for this exercise
			delete exerciseDropSetInfo[exerciseId];
			newWorkoutSets = newWorkoutSets.map((s) =>
				s.exercise_id === exerciseId ? { ...s, is_drop_set: false } : s
			);
		}

		newWorkoutSets = [...newWorkoutSets];
	}

	function handleDropSetClick(setId: string, exerciseId: string) {
		activeSetForDropSet = { id: setId, exerciseId: exerciseId };

		if (exerciseDropSetInfo[exerciseId]) {
			const config = exerciseDropSetInfo[exerciseId];
			dropEachSubsequentSet = config.auto;
			reductionType = config.reduction.type;
			if (config.reduction.type === 'percent') {
				weightReductionPercentage = config.reduction.value;
				weightReductionAmount = 5; // reset other
			} else {
				weightReductionAmount = config.reduction.value;
				weightReductionPercentage = 10; // reset other
			}
		} else {
			// Reset to defaults
			dropEachSubsequentSet = false;
			reductionType = 'percent';
			weightReductionPercentage = 10;
			weightReductionAmount = 5;
		}

		dropSetModal.show();
	}

	function confirmDropSet() {
		if (!activeSetForDropSet) return;

		const { id, exerciseId } = activeSetForDropSet;

		const setIndex = newWorkoutSets.findIndex((s) => s.id === id);
		if (setIndex > -1) {
			newWorkoutSets[setIndex].is_drop_set = true;
		}

		if (dropEachSubsequentSet) {
			exerciseDropSetInfo[exerciseId] = {
				auto: true,
				reduction: {
					type: reductionType,
					value: reductionType === 'percent' ? weightReductionPercentage : weightReductionAmount
				}
			};
		} else {
			delete exerciseDropSetInfo[exerciseId];
		}

		// Disable myo-reps for this exercise
		newWorkoutSets = newWorkoutSets.map((s) => {
			if (s.exercise_id === exerciseId) {
				return { ...s, myo_rep: null };
			}
			return s;
		});

		newWorkoutSets = [...newWorkoutSets];

		dropSetModal.hide();
		activeSetForDropSet = null;
	}

	function selectExercise(exerciseId: string | undefined) {
		if (!exerciseId) return;
		const exercise = exercises.find((e) => e.id === exerciseId);
		if (exercise) {
			lastSelectedExercise = exercise;
		}
		newWorkoutExerciseId = exerciseId;
		addSet();
		addExerciseModal.hide();
		exerciseSearchText = '';
	}

	function addSetForLastSelected() {
		if (lastSelectedExercise && lastSelectedExercise.id) {
			newWorkoutExerciseId = lastSelectedExercise.id;
			addSet();
		}
	}

	async function saveWorkout() {
		if (!newWorkoutName.trim() || !$user || newWorkoutSets.length === 0) return;

		const currentWorkout = editingWorkout;
		try {
			if (currentWorkout && currentWorkout.id) {
				// Update existing workout
				await updateWorkout(currentWorkout.id, { name: newWorkoutName });

				// Simple update: delete all exercises and re-add them
				for (const we of currentWorkout.workout_exercises || []) {
					await removeExerciseFromWorkout(we.id);
				}

				for (const set of newWorkoutSets) {
					await addExerciseToWorkout({
						workout_id: currentWorkout.id,
						exercise_id: set.exercise_id,
						sets: 1, // Each row is 1 set
						weight: set.weight,
						reps: set.reps,
						is_drop_set: set.is_drop_set,
						myo_rep: set.myo_rep
					});
				}
			} else {
				// Add new workout
				const newWorkout = await addWorkout({ name: newWorkoutName }, $user);
				if (newWorkout && newWorkout.id) {
					for (const set of newWorkoutSets) {
						await addExerciseToWorkout({
							workout_id: newWorkout.id,
							exercise_id: set.exercise_id,
							sets: 1, // Each row is 1 set
							reps: set.reps,
							weight: set.weight,
							is_drop_set: set.is_drop_set,
							myo_rep: set.myo_rep
						});
					}
				}
			}
			await loadWorkouts();
		} catch (error) {
			if (error instanceof Error) {
				workoutError = error.message;
			} else {
				workoutError = 'An unknown error occurred.';
			}
			console.error('Error saving workout:', error);
		}
	}

	async function handleAddWorkout(event: Event) {
		event.preventDefault();
		await saveWorkout();
		addWorkoutModal.hide();
	}

	async function saveAndEndSession() {
		await saveWorkout();
		confirmEndSession();
	}

	function handleEndSession() {
		confirmEndSessionModal.show();
	}

	async function confirmEndSession() {
		confirmEndSessionModal.hide();
		isEndingSession = true;
		stopSessionTimer();
		addWorkoutModal.hide();

		if ($activeWorkoutLog && $activeWorkoutLog.id) {
			const logId = $activeWorkoutLog.id;
			const currentEndedAt = new Date().toISOString();
			const currentSets = $activeWorkoutLog.sets;

			// Always update ended_at first
			await updateWorkoutLog(logId, { ended_at: currentEndedAt });

			// If there are sets, update them separately
			if (currentSets && currentSets.length > 0) {
				await updateWorkoutLog(logId, { sets: currentSets });
			}

			activeWorkoutLog.set(null); // Clear current log
			activeWorkout.set(null);
		}
		isEndingSession = false;
	}

	async function startEdit(workout: Workout) {
		editingWorkout = workout;
		newWorkoutName = workout.name;
		newWorkoutSets = (workout.workout_exercises || []).map((we: WorkoutExercise) => ({
			id: we.id || '',
			exercise_id: we.exercise_id,
			exercise_name: we.exercises?.name || '',
			weight: we.weight,
			reps: we.reps,
			is_drop_set: we.is_drop_set || false,
			myo_rep: we.myo_rep || null
		}));
		workoutMode = 'edit';
		addWorkoutModal.show();
		await tick();
		initFlowbite();
	}

	async function startWorkout(workout: Workout) {
		editingWorkout = workout;
		newWorkoutName = workout.name;
		newWorkoutSets = (workout.workout_exercises || []).map((we: WorkoutExercise) => ({
			id: we.id || '',
			exercise_id: we.exercise_id,
			exercise_name: we.exercises?.name || '',
			weight: we.weight,
			reps: we.reps,
			is_drop_set: we.is_drop_set || false,
			myo_rep: we.myo_rep || null
		}));
		initialWorkoutState = JSON.stringify(newWorkoutSets);
		workoutMode = 'play';
		activeWorkout.set(workout);

		addWorkoutModal.show();

		await tick();
		initFlowbite();

		// If there's already an ongoing log for this workout, use it.
		if ($activeWorkoutLog && $activeWorkoutLog.workout_name === workout.name) {
			const elapsed = (new Date().getTime() - new Date($activeWorkoutLog.started_at).getTime()) / 1000;
			sessionTimer.set(Math.floor(elapsed));
			startSessionTimer();
			return;
		}

		// If we are here, it's a new session.
		resetSessionTimer();
		startSessionTimer();

		// New logging logic
		const newLog = await addWorkoutLog({
			workout_name: workout.name,
			started_at: new Date().toISOString(),
			ended_at: null,
			sets: []
		});
		activeWorkoutLog.set(newLog);
	}

	function viewWorkout(workout: Workout) {
		editingWorkout = workout;
		viewWorkoutModal.show();
	}

	function handleDeleteWorkout(id: string | undefined) {
		if (!id) return;
		workoutToDeleteId = id;
		confirmDeleteModal.show();
	}

	async function confirmDeleteWorkout() {
		if (!workoutToDeleteId) return;
		try {
			await deleteWorkout(workoutToDeleteId);
			await loadWorkouts();
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error deleting workout:', error.message);
			} else {
				console.error('Unknown error deleting workout:', error);
			}
		}
		workoutToDeleteId = null;
		confirmDeleteModal.hide();
	}

	// Workout Exercise Management (in view modal)
	let selectedExerciseId = $state('');
	let sets = $state(3);
	let reps = $state(10);
	let weight = $state(100);

	async function handleAddExerciseToWorkout(event: Event) {
		event.preventDefault();

		const currentWorkout = editingWorkout;
		if (!currentWorkout || !currentWorkout.id || !selectedExerciseId) return;

		const exercise = exercises.find((e) => e.id === selectedExerciseId);
		if (!exercise) return;

		try {
			await addExerciseToWorkout({
				workout_id: currentWorkout.id,
				exercise_id: selectedExerciseId,
				sets,
				reps,
				weight
			});
			await loadWorkouts(); // Refresh workouts to show the new exercise
			// Also update the editingWorkout object to reflect the change immediately in the modal
			const updatedWorkout = await getWorkout(currentWorkout.id); // Assuming getWorkout fetches a single workout
			if (updatedWorkout) {
				editingWorkout = updatedWorkout;
			}
		} catch (error) {
			console.error('Error adding exercise to workout:', error);
		}

		selectedExerciseId = '';
		sets = 3;
		reps = 10;
		weight = 100;
	}

	async function handleRemoveExerciseFromWorkout(workoutExerciseId: string | undefined) {
		if (!workoutExerciseId || !editingWorkout || !editingWorkout.id) return;
		try {
			await removeExerciseFromWorkout(workoutExerciseId);
			await loadWorkouts(); // Refresh workouts
			// Also update the editingWorkout object
			const updatedWorkout = await getWorkout(editingWorkout.id);
			if (updatedWorkout) {
				editingWorkout = updatedWorkout;
			} else {
				// If the workout is gone, close the modal
				viewWorkoutModal.hide();
			}
		} catch (error) {
			console.error('Error removing exercise from workout:', error);
		}
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
				{@const hasDropSet = (workout.workout_exercises || []).some((ex: WorkoutExercise) => ex.is_drop_set)}
				{@const hasMyoRep = (workout.workout_exercises || []).some((ex: WorkoutExercise) => ex.myo_rep)}
				{@const totalVolume = (workout.workout_exercises || []).reduce(
					(total, ex) => total + ex.weight * ex.reps,
					0
				)}
				{@const numExercises = new Set((workout.workout_exercises || []).map((e) => e.exercise_id)).size}
				{@const numSets = (workout.workout_exercises || []).length}
				<div
					class="relative flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg border-2 border-blue-700 dark:border-blue-600"
				>
					<div class="p-6">
						<div class="flex justify-between items-center mb-3">
							<h5 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
								{workout.name}
							</h5>
							{#if $activeWorkout?.id === workout.id}
								<button
									onclick={() => startWorkout(workout)}
									class="text-green-600 dark:text-green-400"
								>
									<HeartSolid class="shrink-0 h-6 w-6 beat-animation" />
								</button>
							{:else}
								<button
									onclick={() => startWorkout(workout)}
									class="text-green-600 dark:text-green-400"
								>
									<PlaySolid class="shrink-0 h-7 w-7" />
								</button>
							{/if}
						</div>

						<div class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
							<span>&bull; {numExercises} {numExercises === 1 ? 'exercise' : 'exercises'}</span>
							<span class="mx-1">&bull;</span>
							<span>{numSets} {numSets === 1 ? 'set' : 'sets'}</span>
						</div>

						<div class="mb-3 text-sm">
							<p class="font-semibold text-gray-700 dark:text-gray-300 truncate">
								{Array.from(new Set((workout.workout_exercises || []).map((e) => e.exercises?.name))).join(', ')}
							</p>
						</div>

						<div class="pt-2 min-h-[34px]">
							<span
								class="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-green-900 dark:text-green-300"
							>
								{totalVolume.toLocaleString()} kg
							</span>
							{#if hasDropSet}
								<span
									class="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300"
									>Drop Set</span
								>
							{/if}
							{#if hasMyoRep}
								<span
									class="inline-flex items-center bg-purple-100 text-purple-800 text-xs font-medium me-2 px-2.5 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300"
									>Myo-reps</span
								>
							{/if}
						</div>
					</div>
					<div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-6">
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
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<div
				class="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
					{#if workoutMode === 'play'}
						<span class="text-green-600 dark:text-green-400">Active Session {formatTime($sessionTimer)}</span>
					{:else if editingWorkout}
						Edit Workout
					{:else}
						Add New Workout
					{/if}
				</h3>
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
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
			<form onsubmit={handleAddWorkout} class="p-4">
				<div class="grid gap-4 mb-4 grid-cols-1">
					<div>
						<label
							for="workout-name"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
							>Workout Name</label
						>
						<input
							type="text"
							id="workout-name"
							bind:value={newWorkoutName}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
							placeholder="e.g. Push Day"
							required
						/>
					</div>
				</div>

				<div class="mb-4">
					<div class="flex justify-between items-center mb-2">
						<h4 class="text-md font-semibold text-gray-800 dark:text-white">Exercises</h4>
						<div class="flex items-center gap-2">
							{#if lastSelectedExercise}
								<span
									class="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500"
								>
									{lastSelectedExercise.name}
									<button
										type="button"
										aria-label="Remove exercise filter"
										onclick={() => (lastSelectedExercise = null)}
										class="flex-shrink-0 h-4 w-4 inline-flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-800 focus:outline-none focus:bg-blue-200 focus:text-blue-800 dark:text-blue-500 dark:hover:bg-blue-900"
									>
										<svg
											class="flex-shrink-0 h-3 w-3"
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
										>
									</button>
								</span>
								<button
									type="button"
									onclick={addSetForLastSelected}
									class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
								>
									<PlusOutline class="w-6 h-6" />
									<span class="sr-only">Add Set</span>
								</button>
							{:else}
								<button
									type="button"
									onclick={() => addExerciseModal.show()}
									class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm text-center inline-flex items-center justify-center w-[42px] h-[42px] dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
								>
									<PlusOutline class="w-6 h-6" />
									<span class="sr-only">Add Exercise</span>
								</button>
							{/if}
						</div>
					</div>
					<div class="flex flex-col gap-3">
						{#each groupedSets as group (group.exercise_id)}
							<div
								class="flex flex-col gap-3 mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
							>
								<h5 class="text-md font-semibold text-gray-800 dark:text-white">
									{group.exercise_name}
								</h5>
								{#if group.sets.length > 0}
									<div
										class="grid grid-cols-5 gap-3 items-center font-medium text-gray-500 dark:text-gray-400"
									>
										<div class="text-left"></div>
										<div class="text-sm text-left">Set</div>
										<div class="text-sm text-left">Weight</div>
										<div class="text-sm text-left">Reps</div>
										<div class="text-sm flex justify-center relative right-2.5">Log</div>
									</div>
								{/if}
								{#each group.sets as set, i (set.id)}
									<div
										class="grid grid-cols-5 gap-3 items-center border border-gray-200 dark:border-gray-700 rounded-lg p-2"
									>
										<div class="flex justify-start items-center">
											<button
												id="dropdownMenuIconButton-{set.id}"
												data-dropdown-toggle="dropdownDots-{set.id}"
												class="inline-flex items-center p-1.5 text-sm font-medium text-center text-gray-900 bg-white rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none dark:text-white focus:ring-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
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
													<li>
														<button
															type="button"
															onclick={() => handleDropSetClick(set.id, group.exercise_id)}
															class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
															>Drop set</button
														>
													</li>
													<li>
														<button
															type="button"
															onclick={() => toggleMyoRep(set.id)}
															class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
															>Myo-reps</button
														>
													</li>
												</ul>
											</div>
											<div class="w-5 h-5 ml-2">
												{#if set.is_drop_set}
													<ArrowDownOutline class="w-5 h-5 text-blue-500" />
												{/if}
											</div>
											<div class="w-5 h-5 ml-1">
												{#if set.myo_rep === 'start'}
													<span class="text-lg font-bold text-purple-800">m</span>
												{:else if set.myo_rep === 'match'}
													<span class="text-lg font-bold text-purple-800">mm</span>
												{/if}
											</div>
										</div>
										<div class="text-sm font-medium text-gray-900 dark:text-white text-left">
											{i + 1}
										</div>
										<div class="flex justify-start">
											<label for="weight-{set.id}" class="sr-only">Weight</label>
											<input
												type="number"
												id="weight-{set.id}"
												bind:value={set.weight}
												class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-20 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white {workoutMode === 'play' ? 'opacity-50' : ''}"
											/>
										</div>
										<div class="flex justify-start">
											<label for="reps-{set.id}" class="sr-only">Reps</label>
											<input
												type="number"
												id="reps-{set.id}"
												bind:value={set.reps}
												class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-20 p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white {workoutMode === 'play' ? 'opacity-50' : ''}"
											/>
										</div>
										<div class="flex justify-center">
											<input
												type="checkbox"
												class="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
												disabled={workoutMode === 'edit' || isSetLogged(set.id)}
												checked={isSetLogged(set.id)}
												onchange={async (e) => {
													const target = e.target as HTMLInputElement;
													if (target.checked && $activeWorkoutLog && $activeWorkoutLog.id) {
														const loggedSet: any = {
															set_id: set.id,
															exercise_id: set.exercise_id,
															exercise_name: set.exercise_name,
															weight: set.weight,
															reps: set.reps,
															is_drop_set: set.is_drop_set || false,
															myo_rep: set.myo_rep || null,
															timer_time: $sessionTimer,
															logged_at: new Date().toISOString()
														};
														if (!$activeWorkoutLog.sets) {
															$activeWorkoutLog.sets = [];
														}
														$activeWorkoutLog.sets.push(loggedSet);
														$activeWorkoutLog = $activeWorkoutLog;
														await updateWorkoutLog($activeWorkoutLog.id, {
															sets: $activeWorkoutLog.sets
														});
													}
												}}
											/>
										</div>
									</div>
								{/each}
							</div>
						{/each}
					</div>
				</div>

				{#if workoutMode === 'play'}
					<button
						type="button"
						onclick={handleEndSession}
						class="text-white bg-red-800 hover:bg-red-900 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-900"
					>
						End Session
					</button>
				{:else}
					<button
						type="submit"
						class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
					>
						{editingWorkout ? 'Save Changes' : 'Add workout'}
					</button>
				{/if}
			</form>
		</div>
	</div>
</div>

<!-- Drop Set Modal -->
<div
	id="drop-set-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-md max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
					Drop Set Options
				</h3>
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
					data-modal-hide="drop-set-modal"
				>
					<svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<div class="p-4 md:p-5">
				<p class="text-gray-500 dark:text-gray-400 mb-4">Configure the drop set behavior:</p>
				<div class="flex items-center ps-4 border border-gray-200 rounded dark:border-gray-700">
					<input bind:checked={dropEachSubsequentSet} id="drop-each-set-checkbox" type="checkbox" value="" name="bordered-checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
					<label for="drop-each-set-checkbox" class="w-full py-4 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Drop each subsequent set</label>
				</div>
				{#if dropEachSubsequentSet}
				<fieldset class="mt-4">
					<legend class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Reduction Type</legend>
					<div class="flex gap-4">
						<div class="flex items-center">
							<input bind:group={reductionType} type="radio" id="percent-reduction" value="percent" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
							<label for="percent-reduction" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Percentage</label>
						</div>
						<div class="flex items-center">
							<input bind:group={reductionType} type="radio" id="weight-reduction" value="weight" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
							<label for="weight-reduction" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Fixed Weight</label>
						</div>
					</div>
				</fieldset>

				{#if reductionType === 'percent'}
				<div class="mt-4">
					<label for="drop-set-weight-reduction-percent" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Weight reduction (%)</label>
					<input bind:value={weightReductionPercentage} type="number" id="drop-set-weight-reduction-percent" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="e.g. 10" />
				</div>
				{:else}
				<div class="mt-4">
					<label for="drop-set-weight-reduction-amount" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Weight reduction (amount)</label>
					<input bind:value={weightReductionAmount} type="number" id="drop-set-weight-reduction-amount" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="e.g. 5" />
				</div>
				{/if}
				{/if}
			</div>
			<div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
				<button onclick={confirmDropSet} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Save</button>
				<button data-modal-hide="drop-set-modal" type="button" class="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Cancel</button>
			</div>
		</div>
	</div>
</div>

<!-- Confirm End Session Modal -->
<div
	id="confirm-end-session-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-md max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-red-700 dark:border-red-600">
			<div class="p-4 text-center">
				<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
					{#if hasWorkoutChanged}
						You have unsaved changes. Do you want to save them before ending the session?
					{:else}
						Are you sure you want to end this workout session?
					{/if}
				</h3>
				<div class="flex justify-center gap-4">
					{#if hasWorkoutChanged}
						<button
							onclick={saveAndEndSession}
							type="button"
							class="text-white bg-blue-600 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center"
						>
							Save & End
						</button>
						<button
							onclick={confirmEndSession}
							type="button"
							class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center"
						>
							End without saving
						</button>
					{:else}
						<button
							onclick={confirmEndSession}
							type="button"
							class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center"
						>
							Yes, end it
						</button>
					{/if}

					<button
						data-modal-hide="confirm-end-session-modal"
						type="button"
						class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
						>No, cancel</button
					>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Confirm Delete Modal -->
<div
	id="confirm-delete-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-sm max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-red-700 dark:border-red-600">
			<div class="flex items-center justify-between p-4 rounded-t dark:border-gray-600">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Delete workout?</h3>
				<div class="flex items-center gap-2">
					<button
						onclick={confirmDeleteWorkout}
						type="button"
						class="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2 text-center inline-flex items-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
					>
						<CheckOutline class="w-5 h-5" />
						<span class="sr-only">Confirm</span>
					</button>
					<button
						data-modal-hide="confirm-delete-modal"
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

<!-- Add Exercise Modal -->
<div
	id="add-exercise-to-workout-modal"
	tabindex="-1"
	aria-hidden="true"
	class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
>
	<div class="relative p-4 w-full max-w-md max-h-full">
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Add Exercise</h3>
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
					data-modal-hide="add-exercise-to-workout-modal"
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
			<div class="p-4 md:p-5">
				<div class="mb-4">
					<label for="exercise-search" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
						>Search</label
					>
					<input
						type="text"
						id="exercise-search"
						bind:value={exerciseSearchText}
						class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
						placeholder="Search for an exercise"
					/>
				</div>
				<div class="flex flex-col gap-2 max-h-60 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600 p-2">
					{#each filteredExercises as exercise (exercise.id)}
						<button
							type="button"
							onclick={() => selectExercise(exercise.id)}
							class="text-left w-full text-sm font-medium text-gray-900 dark:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700"
						>
							{exercise.name}
						</button>
					{/each}
				</div>
			</div>
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
		<div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
			<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
					{editingWorkout ? editingWorkout.name : 'Workout'}
				</h3>
				<button
					type="button"
					class="text-red-500 bg-transparent hover:bg-red-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-red-400 dark:hover:bg-red-900"
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
			<div class="p-4 md:p-5">
				{#if editingWorkout && editingWorkout.workout_exercises && editingWorkout.workout_exercises.length > 0}
					<ul class="space-y-4">
						{#each editingWorkout.workout_exercises as we (we.id)}
							<li
								class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm flex justify-between items-center"
							>
								<div>
									<p class="font-semibold text-gray-900 dark:text-white">{we.exercises?.name}</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{we.sets} sets of {we.reps} reps at {we.weight}kg
									</p>
								</div>
								<button
									onclick={() => handleRemoveExerciseFromWorkout(we.id)}
									class="text-red-600 dark:text-red-400 hover:underline"
								>
									<TrashBinOutline class="w-5 h-5" />
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-gray-500 dark:text-gray-400">No exercises in this workout yet.</p>
				{/if}

				<form onsubmit={handleAddExerciseToWorkout} class="mt-6 pt-6 border-t dark:border-gray-600">
					<h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Add Exercise to Workout
					</h4>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-3">
							<label
								for="exercise-select"
								class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>Exercise</label
							>
							<select
								id="exercise-select"
								bind:value={selectedExerciseId}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
								required
							>
								<option value="" disabled>Select an exercise</option>
								{#each exercises as exercise (exercise.id)}
									<option value={exercise.id}>{exercise.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="sets-input"
								class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>Sets</label
							>
							<input
								type="number"
								id="sets-input"
								bind:value={sets}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
								required
							/>
						</div>
						<div>
							<label
								for="reps-input"
								class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>Reps</label
							>
							<input
								type="number"
								id="reps-input"
								bind:value={reps}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
								required
							/>
						</div>
						<div>
							<label
								for="weight-input"
								class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>Weight (kg)</label
							>
							<input
								type="number"
								id="weight-input"
								bind:value={weight}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600"
								required
							/>
						</div>
					</div>
					<button
						type="submit"
						class="mt-6 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
					>
						Add Exercise
					</button>
				</form>
			</div>
		</div>
	</div>
</div>