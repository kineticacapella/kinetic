<script lang="ts">
  import { Datepicker } from 'flowbite-svelte';

  let selectedDate: Date | undefined;
</script>

<div class="p-4">
  <h2 class="text-xl font-semibold mb-4">History Calendar</h2>
  <Datepicker bind:value={selectedDate} />
</div>