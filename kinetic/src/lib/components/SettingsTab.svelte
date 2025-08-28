<script lang="ts">
	import { exerciseTypes, equipmentTypes } from '$lib/stores';

	let newExerciseType = '';
	let newEquipmentType = '';

	function addExerciseType() {
		if (newExerciseType.trim()) {
			$exerciseTypes = [...$exerciseTypes, newExerciseType.trim()];
			newExerciseType = '';
		}
	}

	function removeExerciseType(typeToRemove: string) {
		$exerciseTypes = $exerciseTypes.filter((t) => t !== typeToRemove);
	}

	function addEquipmentType() {
		if (newEquipmentType.trim()) {
			$equipmentTypes = [...$equipmentTypes, newEquipmentType.trim()];
			newEquipmentType = '';
		}
	}

	function removeEquipmentType(typeToRemove: string) {
		$equipmentTypes = $equipmentTypes.filter((t) => t !== typeToRemove);
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
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">
				Exercise Types
			</h2>
			<ul class="space-y-3 mb-6">
				{#each $exerciseTypes as type}
					<li
						class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
					>
						<span class="text-gray-800 dark:text-gray-200">{type}</span>
						<button
							on:click={() => removeExerciseType(type)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
							>Remove</button
						>
					</li>
				{/each}
			</ul>
			<form on:submit|preventDefault={addExerciseType} class="flex items-center gap-3">
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

		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-300">Equipment</h2>
			<ul class="space-y-3 mb-6">
				{#each $equipmentTypes as type}
					<li
						class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
					>
						<span class="text-gray-800 dark:text-gray-200">{type}</span>
						<button
							on:click={() => removeEquipmentType(type)}
							class="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
							>Remove</button
						>
					</li>
				{/each}
			</ul>
			<form on:submit|preventDefault={addEquipmentType} class="flex items-center gap-3">
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
