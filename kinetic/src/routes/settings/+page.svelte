<script lang="ts">
    import { exerciseTypes, equipmentTypes } from '$lib/stores.ts';

    let newExerciseType = '';
    let newEquipmentType = '';

    function addExerciseType() {
        if (newExerciseType.trim()) {
            $exerciseTypes = [...$exerciseTypes, newExerciseType.trim()];
            newExerciseType = '';
        }
    }

    function removeExerciseType(typeToRemove: string) {
        $exerciseTypes = $exerciseTypes.filter(t => t !== typeToRemove);
    }

    function addEquipmentType() {
        if (newEquipmentType.trim()) {
            $equipmentTypes = [...$equipmentTypes, newEquipmentType.trim()];
            newEquipmentType = '';
        }
    }

    function removeEquipmentType(typeToRemove: string) {
        $equipmentTypes = $equipmentTypes.filter(t => t !== typeToRemove);
    }
</script>

<h1 class="text-2xl font-bold">Settings</h1>

<div class="mt-4">
	<h2 class="text-xl font-semibold">Exercise Types</h2>
	<ul class="list-disc list-inside mt-2">
        {#each $exerciseTypes as type}
            <li class="flex items-center justify-between py-1">
                <span>{type}</span>
                <button on:click={() => removeExerciseType(type)} class="text-red-600 dark:text-red-500 hover:underline">Remove</button>
            </li>
        {/each}
    </ul>
    <form on:submit|preventDefault={addExerciseType} class="mt-2">
        <input bind:value={newExerciseType} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="New exercise type" />
        <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-2">Add Exercise Type</button>
    </form>
</div>

<div class="mt-8">
	<h2 class="text-xl font-semibold">Equipment</h2>
	<ul class="list-disc list-inside mt-2">
        {#each $equipmentTypes as type}
            <li class="flex items-center justify-between py-1">
                <span>{type}</span>
                <button on:click={() => removeEquipmentType(type)} class="text-red-600 dark:text-red-500 hover:underline">Remove</button>
            </li>
        {/each}
    </ul>
    <form on:submit|preventDefault={addEquipmentType} class="mt-2">
        <input bind:value={newEquipmentType} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="New equipment type" />
        <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-2">Add Equipment Type</button>
    </form>
</div>