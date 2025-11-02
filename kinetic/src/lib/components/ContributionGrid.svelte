<script lang="ts">
  import type { WorkoutLog } from '$lib/supabase';
  export let logs: WorkoutLog[] = [];
  export let squareSize = 12; // px
  export let gap = 4; // px

  // allow switching back to the previous 52-week view
  export let weeks = 52;
  let viewMode: 'month' | 'weeks52' = 'month';
  function toggleView() {
    viewMode = viewMode === 'month' ? 'weeks52' : 'month';
  }

  import { onMount, onDestroy } from 'svelte';

  // Selected month (view). Default to current month.
  let selectedMonth = new Date();
  selectedMonth.setDate(1);

  // Custom month picker state
  let showMonthPicker = false;
  let pickerRef: HTMLElement | null = null;
  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];

  // choose a reasonable year window around the current year
  $: {
    const y = selectedMonth.getFullYear();
    const range = 5; // years before and after
    years = [] as number[];
    for (let i = y - range; i <= y + range; i++) years.push(i);
  }
  let years: number[] = [];
  let selectedYear = selectedMonth.getFullYear();
  const yearSelectId = `contrib-year-select-${Math.random().toString(36).slice(2,8)}`;

  function setMonthYear(monthIndex: number, year: number) {
    selectedMonth = new Date(year, monthIndex, 1);
    showMonthPicker = false;
  }

  function togglePicker() {
    showMonthPicker = !showMonthPicker;
  }

  function outsideClick(e: MouseEvent) {
    if (!pickerRef) return;
    const path = e.composedPath ? e.composedPath() : (e as any).path || [];
    if (path && path.indexOf(pickerRef) === -1) {
      showMonthPicker = false;
    } else if (!path) {
      // fallback
      if (!pickerRef.contains(e.target as Node)) showMonthPicker = false;
    }
  }

  onMount(() => document.addEventListener('click', outsideClick));
  onDestroy(() => document.removeEventListener('click', outsideClick));

  function monthLabel(d: Date) {
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }

  function prevMonth() {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  }

  function nextMonth() {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
  }

  // helper for <input type="month"> value and change
  $: monthValue = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  function onMonthInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    const [y, m] = v.split('-').map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      selectedMonth = new Date(y, m - 1, 1);
    }
  }

  // Helper: YYYY-MM-DD key
  function dateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Compute volume per day from logs (use started_at as the day)
  const volumeMap = new Map<string, number>();
  $: {
    volumeMap.clear();
    for (const log of logs || []) {
      if (!log.started_at) continue;
      const d = new Date(log.started_at);
      d.setHours(0, 0, 0, 0);
      const key = dateKey(d);
      let vol = 0;
      if (log.sets && Array.isArray(log.sets)) {
        for (const s of log.sets) {
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          vol += w * r;
        }
      }
      volumeMap.set(key, (volumeMap.get(key) || 0) + vol);
    }
  }

  // Build days array for the selected month. We'll display the full weeks that cover the month
  function startOfWeek(d: Date) {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    nd.setDate(nd.getDate() - nd.getDay()); // Sunday as week start
    return nd;
  }

  function endOfWeek(d: Date) {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    nd.setDate(nd.getDate() + (6 - nd.getDay()));
    return nd;
  }

  $: monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  $: monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

  $: calendarStart = startOfWeek(monthStart);
  $: calendarEnd = endOfWeek(monthEnd);

  // Build days for either mode: month (full weeks covering the month) or last N weeks ending today
  function buildDaysWeeks() {
    const daysArr: Date[] = [];
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const totalDays = weeks * 7;
    const start = new Date(end);
    start.setDate(end.getDate() - (totalDays - 1));

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      daysArr.push(d);
    }
    return daysArr;
  }

  $: days = (viewMode === 'month')
    ? (() => {
        const arr: Date[] = [];
        for (let d = new Date(calendarStart); d <= calendarEnd; d.setDate(d.getDate() + 1)) {
          arr.push(new Date(d));
        }
        return arr;
      })()
    : buildDaysWeeks();

  // Group into week-columns of 7 days
  $: columns = [] as Date[][];
  $: {
    columns = [];
    const totalWeeks = Math.ceil(days.length / 7);
    for (let i = 0; i < totalWeeks; i++) {
      const start = i * 7;
      columns.push(days.slice(start, start + 7));
    }
  }

  // Determine thresholds for coloring
  $: maxVolume = Math.max(0, ...Array.from(volumeMap.values()));
  $: thresholds = [0, Math.ceil(maxVolume * 0.25), Math.ceil(maxVolume * 0.5), Math.ceil(maxVolume * 0.75)];

  function intensityFor(vol: number) {
    if (!vol || vol <= thresholds[0]) return 0;
    if (vol <= thresholds[1]) return 1;
    if (vol <= thresholds[2]) return 2;
    return 3;
  }

  const colorClasses = ['bg-gray-200 dark:bg-gray-700', 'bg-green-200 dark:bg-green-700', 'bg-green-500 dark:bg-green-500', 'bg-green-800 dark:bg-green-400'];

  function infoFor(day: Date) {
    const key = dateKey(day);
    const vol = volumeMap.get(key) || 0;
    const idx = intensityFor(vol);
    return { key, vol, idx };
  }
</script>

<style>
  .column {
    display: flex;
    flex-direction: column;
  }

  .square {
    border-radius: 3px;
    display: inline-block;
  }

  .grid-scroll {
    overflow-x: auto;
  }
</style>

<div class="mb-6">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-3">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Activity</h3>
      <button class="text-sm px-2 py-1 rounded border bg-gray-50 dark:bg-gray-700" on:click={toggleView} aria-pressed={viewMode === 'weeks52'} aria-label="Toggle month / 52-week view">{viewMode === 'month' ? 'Month' : '52w'}</button>
    </div>

    {#if viewMode === 'month'}
      <div class="flex items-center gap-2">
        <button class="px-2 py-1 rounded border bg-gray-100 dark:bg-gray-700" on:click={prevMonth} aria-label="Previous month">◀</button>
        <div class="text-sm text-gray-700 dark:text-gray-200 font-medium">{monthLabel(selectedMonth)}</div>
        <button class="px-2 py-1 rounded border bg-gray-100 dark:bg-gray-700" on:click={nextMonth} aria-label="Next month">▶</button>
        <!-- Custom month picker (styled) -->
        <div class="ml-2 relative" bind:this={pickerRef}>
          <button class="text-sm flex items-center gap-2 px-3 py-1 border rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200" on:click={togglePicker} aria-haspopup="dialog" aria-expanded={showMonthPicker}>
            <span>{monthLabel(selectedMonth)}</span>
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
          </button>

          {#if showMonthPicker}
            <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 border rounded shadow-lg z-10 p-2">
              <div class="grid grid-cols-3 gap-1">
                {#each monthNames as m, idx}
                  <button class="text-sm text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 {selectedMonth.getMonth() === idx ? 'font-semibold underline' : ''}"
                    on:click={() => setMonthYear(idx, selectedMonth.getFullYear())}>
                    {m}
                  </button>
                {/each}
              </div>
              <div class="mt-2">
                <label class="sr-only" for={yearSelectId}>Year</label>
                <div class="flex gap-1 items-center">
                  <button class="px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" on:click={() => setMonthYear(selectedMonth.getMonth(), selectedMonth.getFullYear() - 1)} aria-label="Previous year">«</button>
                  <select id={yearSelectId} class="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm" bind:value={selectedYear} on:change={() => setMonthYear(selectedMonth.getMonth(), +selectedYear)}>
                    {#each years as y}
                      <option value={y} selected={y === selectedMonth.getFullYear()}>{y}</option>
                    {/each}
                  </select>
                  <button class="px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" on:click={() => setMonthYear(selectedMonth.getMonth(), selectedMonth.getFullYear() + 1)} aria-label="Next year">»</button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="text-sm text-gray-500 dark:text-gray-300">Last {weeks} weeks</div>
    {/if}
  </div>

  <div class="grid-scroll border rounded-lg p-3 bg-white dark:bg-gray-800">
    <div class="flex gap-2" style="padding-bottom: 6px;">
      {#each columns as col, colIndex}
        <div class="column" style="gap: {gap}px;">
          {#each col as day}
            {#key day.toISOString()}
              <div
                class="square {colorClasses[intensityFor(volumeMap.get(dateKey(day)) || 0)]} { (day < monthStart || day > monthEnd) ? 'opacity-40' : '' }"
                title="{day.toDateString()}: {volumeMap.get(dateKey(day)) || 0} volume"
                aria-label="{day.toDateString()}: {volumeMap.get(dateKey(day)) || 0} volume"
                style="width: {squareSize}px; height: {squareSize}px;"
              ></div>
            {/key}
          {/each}
        </div>
      {/each}
    </div>

    <!-- Legend -->
    <div class="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <span class="mr-2">Less</span>
      {#each colorClasses as c, i}
        <div class="{c}" style="width: 14px; height: 14px; border-radius: 3px;"></div>
      {/each}
      <span class="ml-2">More</span>
    </div>
  </div>
</div>
