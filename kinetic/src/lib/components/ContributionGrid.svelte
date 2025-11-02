<script lang="ts">
  import type { WorkoutLog } from '$lib/supabase';
  export let logs: WorkoutLog[] = [];
  export let weeks = 52;
  export let squareSize = 12; // px
  export let gap = 4; // px

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

  // Build days array from earliest to today (weeks * 7 days)
  function buildDays() {
    const days: Date[] = [];
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const totalDays = weeks * 7;
    const start = new Date(end);
    start.setDate(end.getDate() - (totalDays - 1));

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  $: days = buildDays();

  // Group into weeks (columns)
  $: columns = [] as Date[][];
  $: {
    columns = [];
    for (let i = 0; i < weeks; i++) {
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
    <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Activity</h3>
    <div class="text-sm text-gray-500 dark:text-gray-300">Last {weeks} weeks</div>
  </div>

  <div class="grid-scroll border rounded-lg p-3 bg-white dark:bg-gray-800">
    <div class="flex gap-2" style="padding-bottom: 6px;">
      {#each columns as col, colIndex}
        <div class="column" style="gap: {gap}px;">
          {#each col as day}
            {#key day.toISOString()}
              <div
                class="square {colorClasses[intensityFor(volumeMap.get(dateKey(day)) || 0)]}"
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
