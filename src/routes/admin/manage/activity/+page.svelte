<script lang="ts">
	import Icon from '@iconify/svelte';

	let { data, form } = $props();

	function formatTime(value: string | Date): string {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<div class="flex items-center justify-between gap-3">
	<p class="text-sm text-muted">
		{data.entries.length}
		{data.entries.length === 1 ? 'event' : 'events'} (most recent first)
	</p>
	{#if data.isOwner && data.entries.length > 0}
		<form
			method="POST"
			action="?/clear"
			onsubmit={(event) => {
				if (!confirm('Clear the entire activity log? This cannot be undone.')) {
					event.preventDefault();
				}
			}}
		>
			<button class="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
				<Icon icon="mdi:trash-can-outline" width="16" />
				Clear log
			</button>
		</form>
	{/if}
</div>

{#if form?.error}
	<p class="alert-error mt-3">{form.error}</p>
{/if}

<div class="card mt-4 overflow-hidden">
	{#if data.entries.length === 0}
		<div class="empty-state">
			<Icon icon="mdi:history" width="32" class="text-slate-300" />
			<p>No activity recorded yet.</p>
		</div>
	{:else}
		<ul class="divide-y divide-slate-100">
			{#each data.entries as entry (entry.id)}
				<li class="flex items-start gap-3 px-5 py-3">
					<Icon icon="mdi:circle-small" width="20" class="mt-0.5 shrink-0 text-gmu-green" />
					<div class="min-w-0 flex-1">
						<p class="text-sm text-slate-800">
							<span class="font-medium">{entry.action}</span>
							{#if entry.detail}<span class="text-slate-500"> — {entry.detail}</span>{/if}
						</p>
						<p class="mt-0.5 text-xs text-muted">
							{entry.user || 'unknown'} · {formatTime(entry.at)}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
