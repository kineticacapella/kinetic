<script lang="ts">
	import { onMount } from 'svelte';
	import { user, session } from '$lib/stores';
	import { supabase, getUserSettings, upsertUserSettings } from '$lib/supabase';

	let newExerciseType = '';
	let newEquipmentType = '';
	let exerciseTypes: string[] = $state([
		'Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Strongman', 'Olympic Weightlifting'
	]);
	let equipmentTypes: string[] = $state([
		'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Bands', 'Medicine Ball', 'Other'
	]);
	let settingsError = $state('');
	let email = '';
	let password = '';
	let isSignUp = false;
	let authError = '';


	async function loadUserSettings() {
		if ($user) {
			try {
				const settings = await getUserSettings($user);
				if (settings) {
					exerciseTypes = settings.exercise_types;
					equipmentTypes = settings.equipment_types;
				}
			} catch (err) {
				settingsError = 'Could not load settings.';
			}
		}
	}

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			session.set(newSession);
			user.set(newSession?.user ?? null);
		});
		loadUserSettings();
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
			await upsertUserSettings($user, exerciseTypes, equipmentTypes);
			await loadUserSettings();
		} catch (err) {
			settingsError = 'Could not save exercise types.';
		}
	}

	async function removeExerciseType(typeToRemove: string) {
		exerciseTypes = exerciseTypes.filter((t: string) => t !== typeToRemove);
		if ($user) {
			try {
				await upsertUserSettings($user, exerciseTypes, equipmentTypes);
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
			await upsertUserSettings($user, exerciseTypes, equipmentTypes);
			await loadUserSettings();
		} catch (err) {
			settingsError = 'Could not save equipment types.';
		}
	}

	async function removeEquipmentType(typeToRemove: string) {
		equipmentTypes = equipmentTypes.filter((t: string) => t !== typeToRemove);
		if ($user) {
			try {
				await upsertUserSettings($user, exerciseTypes, equipmentTypes);
				await loadUserSettings();
			} catch (err) {
				settingsError = 'Could not save equipment types.';
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
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
            Manage your application settings.
        </p>
    </div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
							>Sign Up</button>
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
							>Sign In</button>
						<button type="button" class="ml-2 text-green-600 underline" onclick={() => { isSignUp = true; authError = ''; }}>Need an account? Sign Up</button>
					</form>
				{/if}
			{/if}
		</div>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">
				Exercise Types
			</h2>
			{#if settingsError}
				<p class="text-red-600 text-sm mb-2">{settingsError}</p>
			{/if}
			<ul class="space-y-3 mb-6">
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

		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-.6">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Equipment</h2>
			<ul class="space-y-3 mb-6">
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
	</div>
</div>