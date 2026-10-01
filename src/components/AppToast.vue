<script setup>
import { animate } from 'animejs'
import { useToast } from '../composables/useToast.js'

const { message } = useToast()

const onEnter = (el, done) => animate(el, { opacity: [0, 1], y: [20, 0], scale: [0.9, 1], duration: 380, ease: 'out(4)', onComplete: done })
const onLeave = (el, done) => animate(el, { opacity: 0, y: 10, duration: 220, ease: 'in(2)', onComplete: done })
</script>

<template>
	<div class="toast-wrap" aria-live="polite">
		<Transition :css="false" @enter="onEnter" @leave="onLeave">
			<div v-if="message" class="toast">{{ message }}</div>
		</Transition>
	</div>
</template>

<style scoped>
.toast-wrap {
	position: fixed;
	left: 0;
	right: 0;
	bottom: calc(28px + env(safe-area-inset-bottom));
	z-index: 800;
	display: flex;
	justify-content: center;
	pointer-events: none;
}

.toast {
	padding: 10px 20px;
	border: var(--border-w) solid var(--line-strong);
	border-radius: var(--radius);
	background: var(--ink);
	color: var(--bg);
	font-size: 14px;
	letter-spacing: 0.06em;
	box-shadow: var(--shadow);
}

@media (max-width: 720px) {
	.toast-wrap { bottom: calc(var(--tabbar-h) + 28px + env(safe-area-inset-bottom)); }
}
</style>
