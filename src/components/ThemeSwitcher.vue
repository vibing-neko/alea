<script setup>
import { animate } from 'animejs'
import { useTheme } from '../composables/useTheme.js'
import { useSound } from '../composables/useSound.js'

const { theme, current, themes, switchTheme } = useTheme()
const { whoosh } = useSound()

function pick(t, event) {
	const button = event.currentTarget
	animate(button, { scale: [0.8, 1], duration: 500, ease: 'outElastic(1, .5)' })
	if (t.id === theme.value) return
	const rect = button.getBoundingClientRect()
	whoosh()
	switchTheme(t.id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
}
</script>

<template>
	<div class="switcher" role="radiogroup" aria-label="切換主題">
		<span class="current">{{ current.name }}</span>
		<button
			v-for="t in themes"
			:key="t.id"
			class="swatch"
			role="radio"
			:aria-checked="t.id === theme"
			:aria-label="`${t.name}主題`"
			:title="t.name"
			@click="pick(t, $event)"
		>
			<span :style="{ background: `conic-gradient(from 210deg, ${t.swatch[0]} 0 50%, ${t.swatch[1]} 50% 78%, ${t.swatch[2]} 78%)` }"></span>
		</button>
	</div>
</template>

<style scoped>
.switcher {
	display: flex;
	align-items: center;
	gap: 6px;
}

.current {
	margin-right: 4px;
	font-size: 12px;
	letter-spacing: 0.12em;
	color: var(--ink-soft);
}

.swatch {
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
}

.swatch span {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	box-shadow: 0 0 0 1px rgba(127, 127, 127, 0.45);
	transition: box-shadow 0.25s;
}

.swatch[aria-checked="true"] span {
	box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
}

:root[data-theme="carnival"] .current { color: #fff; }
:root[data-theme="carnival"] .swatch[aria-checked="true"] span { box-shadow: 0 0 0 2px #e63946, 0 0 0 4px #fff; }

@media (max-width: 720px) {
	.current { display: none; }
}
</style>
