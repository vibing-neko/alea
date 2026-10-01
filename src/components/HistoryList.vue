<script setup>
import { animate } from 'animejs'

defineProps({ items: Array })
defineEmits(['clear'])

const time = t => new Date(t).toLocaleTimeString('zh-TW', { hour12: false })
const onEnter = (el, done) => animate(el, { opacity: [0, 1], x: [-16, 0], duration: 420, ease: 'out(3)', onComplete: done })
</script>

<template>
	<section class="panel">
		<div class="panel-title">
			<h2>紀錄</h2>
			<button v-if="items.length" class="btn btn--ghost btn--sm" @click="$emit('clear')">清除</button>
		</div>
		<p v-if="!items.length" class="empty">還沒有紀錄。</p>
		<TransitionGroup v-else tag="ol" class="list" :css="false" @enter="onEnter">
			<li v-for="(item, i) in items" :key="item.t">
				<span class="index">{{ String(items.length - i).padStart(2, '0') }}</span>
				<span class="text">{{ item.text }}</span>
				<span class="time">{{ time(item.t) }}</span>
			</li>
		</TransitionGroup>
	</section>
</template>

<style scoped>
.empty {
	font-size: 14px;
	color: var(--ink-faint);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: 280px;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
}

.list li {
	display: grid;
	grid-template-columns: 32px 1fr auto;
	align-items: baseline;
	gap: 10px;
	padding: 8px 0;
	border-top: 1px dashed var(--line);
	font-size: 14px;
}

.list li:first-child { border-top: 0; }
.list li:first-child .text { color: var(--accent); font-weight: 700; }

.index, .time {
	font-family: var(--font-mono);
	font-size: 12px;
	color: var(--ink-faint);
}

.text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:root[data-theme="carnival"] .list li { border-top-color: rgba(43, 26, 63, 0.2); }
</style>
