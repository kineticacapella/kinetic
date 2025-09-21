<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Modal, initFlowbite } from 'flowbite';
  import { ChevronLeftOutline, ChevronRightOutline, PlusOutline, TrashBinOutline, ChevronDownOutline, ChevronUpOutline, EditSolid } from 'flowbite-svelte-icons';
  import { workouts, user, workoutToStart } from '$lib/stores';
  import { getWorkouts } from '$lib/supabase';
  import type { Workout } from '$lib/supabase';

  type Day = {
    date: string;
    workoutIds: string[];
  };

  type Microcycle = {
    id: string;
    name: string;
    startDate: string;
    days: Day[];
    isCollapsed?: boolean;
  };

  let microcycles = $state<Microcycle[]>([]);
  let newMicrocycleName = $state('');
  let newMicrocycleStartDate = $state('');
  let modal: Modal;
  let workoutModal: Modal;
  let selectedDay: Day | null = $state(null);
  let editingMicrocycle: Microcycle | null = $state(null);

  let scrollContainer = $state<HTMLElement | undefined>();
  let showLeftButton = $state(false);
  let showRightButton = $state(true);

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

  onMount(async () => {
    initFlowbite();
    const modalElement = document.getElementById('microcycle-modal');
    if (modalElement) {
      modal = new Modal(modalElement);
    }
    const workoutModalElement = document.getElementById('workout-modal');
    if (workoutModalElement) {
        workoutModal = new Modal(workoutModalElement);
    }
    loadMicrocycles();
    if ($user) {
        loadWorkouts();
    }
    await tick();
    handleScroll();
  });

  $effect(() => {
    if ($user) {
        loadWorkouts();
    }
  });

  function handleScroll() {
    if (!scrollContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    showLeftButton = scrollLeft > 0;
    showRightButton = scrollLeft < scrollWidth - clientWidth;
  }

  function scroll(direction: 'left' | 'right') {
    if (!scrollContainer) return;
    const scrollAmount = direction === 'left' ? -300 : 300; // scroll by 300px
    scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

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
    editingMicrocycle = null;
    newMicrocycleName = '';
    newMicrocycleStartDate = new Date().toISOString().split('T')[0]; // default to today
    modal.show();
  }

  function openEditMicrocycleModal(microcycle: Microcycle) {
    editingMicrocycle = microcycle;
    newMicrocycleName = microcycle.name;
    newMicrocycleStartDate = microcycle.startDate;
    modal.show();
  }

  function saveMicrocycle() {
    if (!newMicrocycleName || !newMicrocycleStartDate) return;

    if (editingMicrocycle) {
        const toUpdate = editingMicrocycle;
        microcycles = microcycles.map(mc => {
            if (mc.id === toUpdate.id) {
                return { ...mc, name: newMicrocycleName, startDate: newMicrocycleStartDate };
            }
            return mc;
        });
    } else {
        const weekDays = getWeekDays(newMicrocycleStartDate);
        const newMicrocycle: Microcycle = {
          id: crypto.randomUUID(),
          name: newMicrocycleName,
          startDate: newMicrocycleStartDate,
          days: weekDays.map(date => ({
            date: date.toISOString(),
            workoutIds: [],
          })),
          isCollapsed: false,
        };
        microcycles = [...microcycles, newMicrocycle];
    }
    saveMicrocycles();
    modal.hide();
    editingMicrocycle = null;
    newMicrocycleName = '';
    newMicrocycleStartDate = '';
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

  function openWorkoutModal(day: Day) {
    selectedDay = day;
    workoutModal.show();
  }

  function assignWorkout(workoutId: string) {
    if (!selectedDay) return;

    microcycles = microcycles.map(mc => {
        const dayIndex = mc.days.findIndex(d => d.date === selectedDay?.date);
        if (dayIndex > -1) {
            mc.days[dayIndex].workoutIds.push(workoutId);
        }
        return mc;
    });

    saveMicrocycles();
    workoutModal.hide();
    selectedDay = null;
  }

  function removeWorkout(day: Day, workoutId: string) {
    microcycles = microcycles.map(mc => {
        const dayIndex = mc.days.findIndex(d => d.date === day.date);
        if (dayIndex > -1) {
            mc.days[dayIndex].workoutIds = mc.days[dayIndex].workoutIds.filter(id => id !== workoutId);
        }
        return mc;
    });
    saveMicrocycles();
  }

  function deleteMicrocycle(id: string) {
    microcycles = microcycles.filter(mc => mc.id !== id);
    saveMicrocycles();
  }

  function toggleMicrocycleCollapse(id: string) {
    microcycles = microcycles.map(mc => {
      if (mc.id === id) {
        return { ...mc, isCollapsed: !mc.isCollapsed };
      }
      return mc;
    });
    saveMicrocycles();
  }

  function startWorkoutFromHome(workoutId: string) {
    const workout = $workouts.find(w => w.id === workoutId);
    if (workout) {
        workoutToStart.set(workout as Workout);
        const tab = document.getElementById('workouts-tab');
        if (tab) {
            tab.click();
        }
    }
  }
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Microcycles</h2>
        <button onclick={openNewMicrocycleModal} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            <PlusOutline class="w-6 h-6" />
            <span class="sr-only">New Microcycle</span>
        </button>
    </div>
    {#if microcycles.length === 0}
        <div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">No training weeks planned yet.</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Click "New Microcycle" to get started.</p>
        </div>
    {:else}
        {#each microcycles as microcycle (microcycle.id)}
            <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-700 dark:border-blue-600">
                <div class="flex items-center w-full">
                        <button onclick={() => toggleMicrocycleCollapse(microcycle.id)} type="button" class="mr-4 text-gray-500 dark:text-gray-400">
                            {#if microcycle.isCollapsed}
                                <ChevronDownOutline class="w-6 h-6" />
                            {:else}
                                <ChevronUpOutline class="w-6 h-6" />
                            {/if}
                        </button>
                        <h2 class="text-xl font-semibold text-gray-700 dark:text-gray-300 flex-grow">{microcycle.name}</h2>
                        <div class="flex items-center">
                            <button onclick={() => openEditMicrocycleModal(microcycle)} type="button" class="text-blue-500 hover:text-blue-700 mr-4">
                                <EditSolid class="shrink-0 h-6 w-6" />
                            </button>
                            <button onclick={() => deleteMicrocycle(microcycle.id)} class="text-red-500 hover:text-red-700">
                                <TrashBinOutline class="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                {#if microcycle.isCollapsed}
                    {@const totalWorkouts = microcycle.days.reduce((acc, day) => acc + day.workoutIds.length, 0)}
                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-10">
                        <span>{microcycle.days.length} days</span>
                        <span class="mx-2">|</span>
                        <span>Starts on {new Date(microcycle.startDate).toLocaleDateString()}</span>
                        <span class="mx-2">|</span>
                        <span>{totalWorkouts > 0 ? `${totalWorkouts} ${totalWorkouts === 1 ? 'workout' : 'workouts'}` : 'Empty'}</span>
                    </div>
                {/if}

                {#if !microcycle.isCollapsed}
                <div class="relative mt-4">
                    <div bind:this={scrollContainer} onscroll={handleScroll} class="flex overflow-x-auto space-x-4 p-2 scrollbar-hide">
                        {#each microcycle.days as day (day.date)}
                            <div class="relative flex-shrink-0 w-96 h-64 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 flex flex-col border border-gray-200 dark:border-gray-600">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold text-gray-900 dark:text-white">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                        <p class="text-sm text-gray-500 dark:text-gray-400">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>

                                <div class="mt-4 flex-grow overflow-y-auto">
                                    <ul class="space-y-2">
                                        {#if day.workoutIds.length === 0}
                                            <li class="text-center text-gray-500 p-4">No workouts assigned.</li>
                                        {/if}
                                        {#each day.workoutIds as workoutId (workoutId)}
                                            {@const workout = $workouts.find(w => w.id === workoutId)}
                                            <li class="flex justify-between items-center bg-gray-100 dark:bg-gray-600 px-2 rounded-lg h-9">
                                                <button onclick={() => startWorkoutFromHome(workoutId)} class="font-semibold text-sm text-left w-full text-blue-500">{workout?.name || 'Workout not found'}</button>
                                                <button onclick={() => removeWorkout(day, workoutId)} class="text-red-500 hover:text-red-700">
                                                    <TrashBinOutline class="w-4 h-4" />
                                                </button>
                                            </li>
                                        {/each}
                                        <li>
                                            <button onclick={() => openWorkoutModal(day)} class="w-full flex items-center justify-center px-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-500 dark:text-gray-400 h-9">
                                                <PlusOutline class="w-5 h-5" />
                                                <span class="ml-2 font-semibold">Add Workout</span>
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        {/each}
                    </div>
                    {#if showLeftButton}
                        <button onclick={() => scroll('left')} class="absolute top-1/2 left-0 transform -translate-y-1/2 bg-white/50 hover:bg-white/80 p-2 rounded-full shadow-md">
                            <ChevronLeftOutline class="w-6 h-6" />
                        </button>
                    {/if}
                    {#if showRightButton}
                        <button onclick={() => scroll('right')} class="absolute top-1/2 right-0 transform -translate-y-1/2 bg-white/50 hover:bg-white/80 p-2 rounded-full shadow-md">
                            <ChevronRightOutline class="w-6 h-6" />
                        </button>
                    {/if}
                </div>
                {/if}
            </div>
        {/each}
    {/if}
</div>

<!-- Microcycle Modal -->
<div id="microcycle-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-md max-h-full">
        <div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2 border-blue-700 dark:border-blue-600">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingMicrocycle ? 'Edit Microcycle' : 'New Microcycle'}
                </h3>
                <button type="button" class="text-blue-500 bg-transparent hover:bg-blue-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-blue-400 dark:hover:bg-blue-900" data-modal-hide="microcycle-modal">
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>
            <div class="p-4 md:p-5">
                <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); saveMicrocycle(); }}>
                    <div>
                        <label for="microcycle-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
                        <input type="text" id="microcycle-name" bind:value={newMicrocycleName} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="e.g. Deload Week" required>
                    </div>
                    <div>
                        <label for="microcycle-start-date" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Start Date</label>
                        <input type="date" id="microcycle-start-date" bind:value={newMicrocycleStartDate} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" required>
                    </div>
                    <button type="submit" class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">{editingMicrocycle ? 'Save Changes' : 'Create'}</button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Workout Selection Modal -->
<div id="workout-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-md max-h-full">
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                    Select a Workout
                </h3>
                <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="workout-modal">
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
            </div>
            <div class="p-4 md:p-5">
                <ul class="space-y-2">
                    {#each $workouts.filter(w => w.id) as workout (workout.id)}
                        <li>
                            <button onclick={() => assignWorkout(workout.id as string)} class="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                {workout.name}
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </div>
</div>