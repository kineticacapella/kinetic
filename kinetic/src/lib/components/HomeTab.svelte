<script lang="ts">
  import { onMount } from 'svelte';
  import { Modal, initFlowbite } from 'flowbite';

  type Microcycle = {
    id: string;
    name: string;
    startDate: string;
  };

  let microcycles = $state<Microcycle[]>([]);
  let newMicrocycleName = $state('');
  let newMicrocycleStartDate = $state('');
  let modal: Modal;

  onMount(() => {
    initFlowbite();
    const modalElement = document.getElementById('microcycle-modal');
    if (modalElement) {
      modal = new Modal(modalElement);
    }
    loadMicrocycles();
  });

  function loadMicrocycles() {
    const stored = localStorage.getItem('microcycles');
    if (stored) {
      microcycles = JSON.parse(stored);
    }
  }

  function saveMicrocycles() {
    localStorage.setItem('microcycles', JSON.stringify(microcycles));
  }

  function openNewMicrocycleModal() {
    newMicrocycleName = '';
    newMicrocycleStartDate = new Date().toISOString().split('T')[0]; // default to today
    modal.show();
  }

  function createMicrocycle() {
    if (!newMicrocycleName || !newMicrocycleStartDate) return;

    const newMicrocycle: Microcycle = {
      id: crypto.randomUUID(),
      name: newMicrocycleName,
      startDate: newMicrocycleStartDate,
    };

    microcycles = [...microcycles, newMicrocycle];
    saveMicrocycles();
    modal.hide();
  }

  function getWeekDays(startDate: string): Date[] {
    const start = new Date(startDate);
    const dayOfWeek = start.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to start the week on Monday
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Home</h1>
        <button on:click={openNewMicrocycleModal} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            Plan Your Week
        </button>
    </div>

    {#if microcycles.length === 0}
        <div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">No training weeks planned yet.</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Click "Plan Your Week" to get started.</p>
        </div>
    {:else}
        {#each microcycles as microcycle (microcycle.id)}
            <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
                <h2 class="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{microcycle.name}</h2>
                <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {#each getWeekDays(microcycle.startDate) as day}
                        <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <p class="font-semibold text-gray-900 dark:text-white">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            <div class="mt-4">
                                <!-- Workout will be added here later -->
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>

<!-- Modal -->
<div id="microcycle-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-md max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                    New Training Week
                </h3>
                <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="microcycle-modal">
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>
            <div class="p-4 md:p-5">
                <form class="space-y-4" on:submit|preventDefault={createMicrocycle}>
                    <div>
                        <label for="microcycle-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
                        <input type="text" id="microcycle-name" bind:value={newMicrocycleName} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="e.g. Deload Week" required>
                    </div>
                    <div>
                        <label for="microcycle-start-date" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Start Date</label>
                        <input type="date" id="microcycle-start-date" bind:value={newMicrocycleStartDate} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" required>
                    </div>
                    <button type="submit" class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Create</button>
                </form>
            </div>
        </div>
    </div>
</div>