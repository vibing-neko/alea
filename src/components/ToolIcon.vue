<script setup>
defineProps({ name: String })
</script>

<template>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<template v-if="name === 'wheel'">
			<circle cx="12" cy="13" r="8.5" />
			<path d="M12 13 L12 4.5 M12 13 L19.4 17.2 M12 13 L4.6 17.2" />
			<circle cx="12" cy="13" r="1.6" fill="currentColor" />
			<path d="M10 1.8 h4 l-2 3 z" fill="currentColor" />
		</template>
		<template v-else-if="name === 'coin'">
			<ellipse cx="12" cy="12" rx="8.5" ry="8.5" />
			<ellipse cx="12" cy="12" rx="5.6" ry="5.6" stroke-dasharray="1.5 1.8" />
			<path d="M10.2 9.8 h3.6 M12 9.8 v4.6 M10 14.4 h4" />
		</template>
		<template v-else-if="name === 'dice'">
			<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
			<circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" />
			<circle cx="12" cy="12" r="1.3" fill="currentColor" />
			<circle cx="15.7" cy="15.7" r="1.3" fill="currentColor" />
		</template>
	</svg>
</template>
