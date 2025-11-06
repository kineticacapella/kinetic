<script lang="ts">
	import { onMount } from 'svelte';
	import { user, session } from '$lib/stores';
	import { supabase, getUserSettings, upsertUserSettings, deleteUserAccount } from '$lib/supabase';
	import { Modal, initFlowbite } from 'flowbite';

	let newExerciseType = $state('');
	let newEquipmentType = $state('');
	let newWorkoutType = $state('');
	let exerciseTypes: string[] = $state([
		'Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Strongman', 'Olympic Weightlifting'
	]);
	let equipmentTypes: string[] = $state([
		'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Bands', 'Medicine Ball', 'Other'
	]);
	let workoutTypes: string[] = $state([
		'Full Body', 'Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs', 'Cardio'
	]);
	let settingsError = $state('');
	let email = $state('');
	let password = $state('');
	let isSignUp = $state(false);
	let authError = $state('');
	let deleteModal: Modal;


	async function loadUserSettings() {
		if ($user) {
			try {
				const settings = await getUserSettings($user);
				if (settings) {
					exerciseTypes = settings.exercise_types;
					equipmentTypes = settings.equipment_types;
					workoutTypes = settings.workout_types ?? workoutTypes;
				}
			} catch (err) {
				settingsError = 'Could not load settings.';
			}
		}
	}

	onMount(() => {
		initFlowbite();
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			session.set(newSession);
			user.set(newSession?.user ?? null);
		});
		loadUserSettings();
		const modalElement = document.getElementById('delete-account-modal');
		if (modalElement) {
			deleteModal = new Modal(modalElement);
		}
	});

	$effect(() => {
		loadUserSettings();
	});

	async function addExerciseType(event?: Event) {
		event?.preventDefault();
		if (!newExerciseType.trim() || !$user) return;
		exerciseTypes = [...exerciseTypes, newExerciseType.trim()];
		newExerciseType = '';
		try {
			await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
			await loadUserSettings();
		} catch (err) {
			settingsError = 'Could not save exercise types.';
		}
	}

	async function removeExerciseType(typeToRemove: string) {
		exerciseTypes = exerciseTypes.filter((t: string) => t !== typeToRemove);
		if ($user) {
			try {
				await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
				await loadUserSettings();
			} catch (err) {
				settingsError = 'Could not save exercise types.';
			}
		}
	}

	async function addEquipmentType(event?: Event) {
		event?.preventDefault();
		if (!newEquipmentType.trim() || !$user) return;
		equipmentTypes = [...equipmentTypes, newEquipmentType.trim()];
		newEquipmentType = '';
		try {
			await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
			await loadUserSettings();
		} catch (err) {
			settingsError = 'Could not save equipment types.';
		}
	}

	async function removeEquipmentType(typeToRemove: string) {
		equipmentTypes = equipmentTypes.filter((t: string) => t !== typeToRemove);
		if ($user) {
			try {
				await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
				await loadUserSettings();
			} catch (err) {
				settingsError = 'Could not save equipment types.';
			}
		}
	}

	async function addWorkoutType(event?: Event) {
		event?.preventDefault();
		if (!newWorkoutType.trim() || !$user) return;
		workoutTypes = [...workoutTypes, newWorkoutType.trim()];
		newWorkoutType = '';
		try {
			await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
			await loadUserSettings();
		} catch (err) {
			settingsError = 'Could not save workout types.';
		}
	}

	async function removeWorkoutType(typeToRemove: string) {
		workoutTypes = workoutTypes.filter((t: string) => t !== typeToRemove);
		if ($user) {
			try {
				await upsertUserSettings($user, exerciseTypes, equipmentTypes, workoutTypes);
				await loadUserSettings();
			} catch (err) {
				settingsError = 'Could not save workout types.';
			}
		}
	}


	async function signIn(event?: Event) {
		event?.preventDefault();
		authError = '';
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		if (error) {
			authError = error.message;
			console.error('Error signing in:', error.message);
		}
	}

	async function signUp(event?: Event) {
		event?.preventDefault();
		authError = '';
		const { error } = await supabase.auth.signUp({
			email,
			password
		});
		if (error) {
			authError = error.message;
			console.error('Error signing up:', error.message);
		} else {
			isSignUp = false;
			// Optionally, auto-login or show a message
		}
	}

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('Error signing out:', error.message);
		}
	}

	function openDeleteModal() {
		deleteModal.show();
	}

	async function deleteAccount() {
		if (!$user) return;
		try {
			await deleteUserAccount($user.id);
			await signOut();
		} catch (error) {
			if (error instanceof Error) {
				authError = error.message;
			}
		}
		deleteModal.hide();
	}
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
            Manage your application settings.
        </p>
    </div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Account</h2>
			{#if $user}
				<div class="flex items-center justify-between">
					<p class="text-gray-800 dark:text-gray-200">Logged in as {$user?.email}</p>
					<button
						onclick={signOut}
						class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-800 transition-colors"
						>Sign Out</button
					>
				</div>
				<div class="mt-8">
					<h3 class="text-lg font-semibold text-gray-800 dark:text-white">Delete Account</h3>
					<p class="text-gray-500 dark:text-gray-400 mt-1 mb-4">Permanently delete your account and all of your data. This action is irreversible.</p>
					<button
						onclick={openDeleteModal}
						class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-800 transition-colors"
						>Delete Account</button
					>
				</div>
			{:else}
				{#if isSignUp}
					<form onsubmit={signUp} class="space-y-4">
						<div>
							<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email</label>
							<input
								type="email"
								id="email"
								bind:value={email}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
								placeholder="your@email.com"
								required
							/>
						</div>
						<div>
							<label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
							<input
								type="password"
								id="password"
								bind:value={password}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
								placeholder="••••••••"
								required
							/>
						</div>
						{#if authError}
							<p class="text-red-600 text-sm">{authError}</p>
						{/if}
						<button
							type="submit"
							class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-800 transition-colors"
							>Sign Up</button
						>
						<button type="button" class="ml-2 text-blue-600 underline" onclick={() => { isSignUp = false; authError = ''; }}>Already have an account? Sign In</button>
					</form>
				{:else}
					<form onsubmit={signIn} class="space-y-4">
						<div>
							<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email</label>
							<input
								type="email"
								id="email"
								bind:value={email}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
								placeholder="your@email.com"
								required
							/>
						</div>
						<div>
							<label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
							<input
								type="password"
								id="password"
								bind:value={password}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
								placeholder="••••••••"
								required
							/>
						</div>
						{#if authError}
							<p class="text-red-600 text-sm">{authError}</p>
						{/if}
						<button
							type="submit"
							class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
							>Sign In</button
						>
						<button type="button" class="ml-2 text-green-600 underline" onclick={() => { isSignUp = true; authError = ''; }}>Need an account? Sign Up</button>
					</form>
				{/if}
			{/if}
		</div>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">
				Exercise Types
			</h2>
			{#if settingsError}
				<p class="text-red-600 text-sm mb-2">{settingsError}</p>
			{/if}
			<ul class="space-y-3 mb-4">
				{#each exerciseTypes as type}
					<li
						class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
					>
						<span class="text-gray-800 dark:text-gray-200">{type}</span>
						<button
							onclick={() => removeExerciseType(type)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
							>Remove</button
						>
					</li>
				{/each}
			</ul>
			<form onsubmit={addExerciseType} class="flex items-center gap-3">
				<input
					bind:value={newExerciseType}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="New exercise type"
				/>
				<button
					type="submit"
					class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
					>Add</button
				>
			</form>
		</div>

		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Equipment</h2>
			<ul class="space-y-3 mb-4">
				{#each equipmentTypes as type}
					<li
						class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
					>
						<span class="text-gray-800 dark:text-gray-200">{type}</span>
						<button
							onclick={() => removeEquipmentType(type)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
							>Remove</button
						>
					</li>
				{/each}
			</ul>
			<form onsubmit={addEquipmentType} class="flex items-center gap-3">
				<input
					bind:value={newEquipmentType}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="New equipment type"
				/>
				<button
					type="submit"
					class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
					>Add</button
				>
			</form>
		</div>

		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Workout Types</h2>
			<ul class="space-y-3 mb-4">
				{#each workoutTypes as type}
					<li
						class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
					>
						<span class="text-gray-800 dark:text-gray-200">{type}</span>
						<button
							onclick={() => removeWorkoutType(type)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
							>Remove</button
						>
					</li>
				{/each}
			</ul>
			<form onsubmit={addWorkoutType} class="flex items-center gap-3">
				<input
					bind:value={newWorkoutType}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="New workout type"
				/>
				<button
					type="submit"
					class="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 transition-colors"
					>Add</button
				>
			</form>
		</div>
	</div>
</div>

<!-- Delete Account Modal -->
<div id="delete-account-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-md max-h-full">
        <div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-red-600">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Account
                </h3>
                <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" onclick={() => deleteModal.hide()}>
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>
            <div class="p-4 md:p-5 text-center">
				<p class="mb-4 text-gray-500 dark:text-gray-400">Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.</p>
				<button
					onclick={deleteAccount}
					class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-800 transition-colors"
					>Yes, I'm sure</button
				>
				<button
					onclick={() => deleteModal.hide()}
					class="ml-2 text-gray-900 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
					>No, cancel</button
				>
            </div>
        </div>
    </div>
</div>