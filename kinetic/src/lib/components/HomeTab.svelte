<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Modal, initFlowbite } from 'flowbite';
  import { ChevronLeftOutline, ChevronRightOutline, PlusOutline, TrashBinOutline, ChevronDownOutline, ChevronUpOutline, EditSolid } from 'flowbite-svelte-icons';
  import { workouts, user, workoutToStart, activeTab } from '$lib/stores';
  import { getWorkouts } from '$lib/supabase';
  import type { Workout } from '$lib/supabase';

  type Day = {
    dayIndex: number; // 0 for Monday, 6 for Sunday
    workoutIds: string[];
  };

  type Microcycle = {
    id: string;
    name: string;
    days: Day[];
    isCollapsed?: boolean;
    color?: string;
  };

  let microcycles = $state<Microcycle[]>([]);
  let newMicrocycleName = $state('');
  let newMicrocycleColor = $state('#3b82f6'); // Default to blue
  let modal: Modal;
  let workoutModal: Modal;
  let selectedDay: Day | null = $state(null);
  let selectedMicrocycleId: string | null = $state(null);
  let editingMicrocycle: Microcycle | null = $state(null);

  let scrollContainer = $state<HTMLElement | undefined>();
  let showLeftButton = $state(false);
  let showRightButton = $state(true);
  
  let currentWeekDates = $state<Date[]>([]);

  const todayString = new Date().toISOString().split('T')[0];
  const presetColors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#eab308' },
    { name: 'Lime', hex: '#84cc16' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Fuchsia', hex: '#d946ef' },
  ];

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
    calculateCurrentWeekDates();
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
      try {
        const parsed = JSON.parse(stored);
        // Validate the data structure before loading it into state
        if (Array.isArray(parsed) && (parsed.length === 0 || (parsed[0].days && parsed[0].days.length > 0 && typeof parsed[0].days[0].dayIndex === 'number'))) {
          microcycles = parsed;
        } else {
          // Data is in an old format or corrupted, clear it
          console.warn('Old or invalid microcycle data format detected. Clearing localStorage.');
          localStorage.removeItem('microcycles');
          microcycles = [];
        }
      } catch (e) {
        console.error('Failed to parse microcycles from localStorage', e);
        // Clear corrupted data
        localStorage.removeItem('microcycles');
        microcycles = [];
      }
    }
  }

  function saveMicrocycles() {
    localStorage.setItem('microcycles', JSON.stringify(microcycles));
  }

  function openNewMicrocycleModal() {
    editingMicrocycle = null;
    newMicrocycleName = '';
    newMicrocycleColor = '#3b82f6'; // Default to blue
    modal.show();
  }

  function openEditMicrocycleModal(microcycle: Microcycle) {
    editingMicrocycle = microcycle;
    newMicrocycleName = microcycle.name;
    newMicrocycleColor = microcycle.color || '#3b82f6'; // Fallback to blue
    modal.show();
  }

  function saveMicrocycle() {
    if (!newMicrocycleName) return;

    if (editingMicrocycle) {
        const microcycleToEdit = editingMicrocycle;
        microcycles = microcycles.map(mc => {
            if (mc.id === microcycleToEdit.id) {
                return { ...mc, name: newMicrocycleName, color: newMicrocycleColor };
            }
            return mc;
        });
    } else {
        const newMicrocycle: Microcycle = {
          id: crypto.randomUUID(),
          name: newMicrocycleName,
          days: Array.from({ length: 7 }, (_, i) => ({
            dayIndex: i, // 0 = Monday, 6 = Sunday
            workoutIds: [],
          })),
          isCollapsed: false,
          color: newMicrocycleColor,
        };
        microcycles = [...microcycles, newMicrocycle];
    }
    saveMicrocycles();
    modal.hide();
    editingMicrocycle = null;
    newMicrocycleName = '';
  }

  function calculateCurrentWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to start the week on Monday
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    currentWeekDates = week;
  }

  function openWorkoutModal(day: Day, microcycleId: string) {
    selectedDay = day;
    selectedMicrocycleId = microcycleId;
    workoutModal.show();
  }

  function assignWorkout(workoutId: string) {
    if (!selectedDay || !selectedMicrocycleId) return;

    microcycles = microcycles.map(mc => {
        if (mc.id === selectedMicrocycleId) {
            const day = mc.days.find(d => d.dayIndex === selectedDay?.dayIndex);
            if (day) {
                day.workoutIds.push(workoutId);
            }
        }
        return mc;
    });

    saveMicrocycles();
    workoutModal.hide();
    selectedDay = null;
    selectedMicrocycleId = null;
  }

  function removeWorkout(day: Day, workoutId: string, microcycleId: string) {
    microcycles = microcycles.map(mc => {
        if (mc.id === microcycleId) {
            const dayToUpdate = mc.days.find(d => d.dayIndex === day.dayIndex);
            if (dayToUpdate) {
                dayToUpdate.workoutIds = dayToUpdate.workoutIds.filter(id => id !== workoutId);
            }
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
        activeTab.set('workouts');
    }
  }
</script>

<div class="container mx-auto p-4 md:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Microcycles</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                Plan your training weeks and assign workouts to specific days.
            </p>
        </div>
        <button onclick={openNewMicrocycleModal} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
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
            <div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2" style="border-color: {microcycle.color || '#3b82f6'}">
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
                    {@const startDate = currentWeekDates[0]}
                    {@const endDate = currentWeekDates[6]}
                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-10">
                        <span>{microcycle.days.length} days</span>
                        <span class="mx-2">|</span>
                        <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
                        <span class="mx-2">|</span>
                        <span>{totalWorkouts > 0 ? `${totalWorkouts} ${totalWorkouts === 1 ? 'workout' : 'workouts'}` : 'Empty'}</span>
                    </div>
                {/if}

                {#if !microcycle.isCollapsed}
                <div class="relative mt-4">
                    <div bind:this={scrollContainer} onscroll={handleScroll} class="flex overflow-x-auto space-x-4 p-2 scrollbar-hide">
                        {#if currentWeekDates.length > 0}
                            {#each microcycle.days as day (day.dayIndex)}
                                {@const currentDate = currentWeekDates[day.dayIndex]}
                                {@const isToday = currentDate.toISOString().split('T')[0] === todayString}
                                {@const borderClass = isToday ? 'border-2 border-green-500' : 'border border-gray-200 dark:border-gray-600'}
                                <div class="relative flex-shrink-0 w-96 h-64 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 flex flex-col {borderClass}">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="font-semibold text-gray-900 dark:text-white">{currentDate.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">{currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    <div class="mt-4 flex-grow overflow-y-auto">
                                        <ul class="space-y-2">
                                            {#each day.workoutIds as workoutId (workoutId)}
                                                {@const workout = $workouts.find(w => w.id === workoutId)}
                                                <li class="flex justify-between items-center bg-gray-100 dark:bg-gray-600 px-2 rounded-lg h-9">
                                                    <button onclick={() => startWorkoutFromHome(workoutId)} class="font-semibold text-sm text-left w-full text-blue-500">{workout?.name || 'Workout not found'}</button>
                                                    <button onclick={() => removeWorkout(day, workoutId, microcycle.id)} class="text-red-500 hover:text-red-700">
                                                        <TrashBinOutline class="w-4 h-4" />
                                                    </button>
                                                </li>
                                            {/each}
                                            <li>
                                                <button onclick={() => openWorkoutModal(day, microcycle.id)} class="w-full flex items-center justify-center px-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-500 dark:text-gray-400 h-9">
                                                    <PlusOutline class="w-5 h-5" />
                                                    <span class="ml-2 font-semibold text-sm">Add Workout</span>
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            {/each}
                        {/if}
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
        <div class="relative bg-white rounded-lg shadow-xl dark:bg-gray-800 border-2" style="border-color: {newMicrocycleColor || '#3b82f6'}">
            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingMicrocycle ? 'Edit Microcycle' : 'New Microcycle'}
                </h3>
                <button type="button" class="text-blue-500 bg-transparent hover:bg-blue-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:text-blue-400 dark:hover:bg-blue-900" onclick={() => modal.hide()}>
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
                    <fieldset>
                        <legend class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</legend>
                        <div class="flex flex-wrap gap-2">
                            {#each presetColors as color (color.hex)}
                                <button
                                    type="button"
                                    onclick={() => newMicrocycleColor = color.hex}
                                    class="w-8 h-8 rounded-full border border-gray-300"
                                    style="background-color: {color.hex}"
                                    class:ring-2={newMicrocycleColor === color.hex}
                                    class:ring-offset-2={newMicrocycleColor === color.hex}
                                    class:ring-gray-800={newMicrocycleColor === color.hex}
                                    title={color.name}
                                    aria-label="Select color {color.name}"
                                ></button>
                            {/each}
                        </div>
                        <div class="mt-4 flex items-center gap-2">
                             <label for="custom-color-picker" class="text-sm font-medium text-gray-900 dark:text-white">Custom:</label>
                             <input type="color" id="custom-color-picker" bind:value={newMicrocycleColor} class="p-1 h-10 w-14 block bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none">
                             <input type="text" bind:value={newMicrocycleColor} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="#RRGGBB">
                        </div>
                    </fieldset>
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
                <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" onclick={() => workoutModal.hide()}>
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