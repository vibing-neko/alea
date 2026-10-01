<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { animate } from 'animejs'
import ToolIcon from './ToolIcon.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import { TOOLS } from '../lib/tools.js'
import { useSound } from '../composables/useSound.js'
import { useMotion } from '../composables/useMotion.js'

const route = useRoute()
const { muted, toggle } = useSound()
const { profile, dur } = useMotion()
const nav = ref(null)
const indicator = ref(null)

// 導覽列的指示塊，跟著目前頁面滑動
async function moveIndicator(instant) {
	await nextTick()
	const active = nav.value?.querySelector('.router-link-active')
	if (!active) {
		animate(indicator.value, { opacity: 0, scale: 0.6, duration: dur(200) })
		return
	}
	animate(indicator.value, {
		x: active.offsetLeft,
		y: active.offsetTop,
		width: active.offsetWidth,
		height: active.offsetHeight,
		opacity: 1,
		scale: 1,
		...(instant ? { duration: 0 } : { ease: profile.value.pop() }),
	})
}

watch(() => route.path, () => moveIndicator(false))
onMounted(() => {
	moveIndicator(true)
	addEventListener('resize', () => moveIndicator(true))
})
</script>

<template>
	<header class="header">
		<RouterLink to="/" class="brand" aria-label="Alea 首頁">
			<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
				<rect x="2" y="2" width="28" height="28" rx="7" />
				<circle cx="10.5" cy="10.5" r="2.6" />
				<circle cx="16" cy="16" r="2.6" />
				<circle cx="21.5" cy="21.5" r="2.6" />
			</svg>
			<span class="brand-word display">Alea</span>
		</RouterLink>

		<nav ref="nav" class="nav" aria-label="工具">
			<span ref="indicator" class="nav-indicator" aria-hidden="true"></span>
			<RouterLink v-for="tool in TOOLS" :key="tool.to" :to="tool.to" class="nav-link">
				<ToolIcon :name="tool.icon" />
				<span>{{ tool.label }}</span>
			</RouterLink>
		</nav>

		<div class="actions">
			<ThemeSwitcher />
			<button class="icon-btn" :aria-label="muted ? '開啟音效' : '關閉音效'" :aria-pressed="!muted" @click="toggle">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M4 9.5 h3.5 L12 5.5 v13 L7.5 14.5 H4 z" fill="currentColor" />
					<template v-if="muted">
						<path d="M16 9.5 l5 5 M21 9.5 l-5 5" />
					</template>
					<template v-else>
						<path d="M15.5 9 a4 4 0 0 1 0 6" />
						<path d="M18 6.5 a7.5 7.5 0 0 1 0 11" />
					</template>
				</svg>
			</button>
		</div>
	</header>
</template>

<style scoped>
.header {
	position: sticky;
	top: 0;
	z-index: 50;
	display: flex;
	align-items: center;
	gap: 24px;
	height: var(--header-h);
	padding: 0 var(--gutter);
	border-bottom: var(--border-w) solid var(--line);
	background: color-mix(in srgb, var(--bg) 82%, transparent);
	backdrop-filter: blur(14px);
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	color: var(--ink);
	text-decoration: none;
}

.brand-mark {
	width: 30px;
	height: 30px;
}

.brand-mark rect {
	fill: none;
	stroke: var(--accent);
	stroke-width: 2;
}

.brand-mark circle { fill: var(--accent); }

.brand-word {
	font-size: 28px;
	line-height: 1;
	padding-top: 2px;
}

.nav {
	position: relative;
	display: flex;
	gap: 4px;
	margin: 0 auto;
}

.nav-indicator {
	position: absolute;
	top: 0;
	left: 0;
	border-radius: var(--radius);
	background: var(--accent-soft);
	opacity: 0;
	pointer-events: none;
}

.nav-link {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 9px 16px;
	border-radius: var(--radius);
	color: var(--ink-soft);
	font-size: 15px;
	font-weight: 500;
	text-decoration: none;
	letter-spacing: 0.08em;
	transition: color 0.2s;
}

.nav-link svg { width: 18px; height: 18px; }
.nav-link:hover, .nav-link.router-link-active { color: var(--ink); }
.nav-link.router-link-active svg { color: var(--accent); }

.actions {
	display: flex;
	align-items: center;
	gap: 10px;
}

:root[data-theme="carnival"] .header {
	background: #e63946;
	border-bottom: 3px solid var(--ink);
	box-shadow: 0 4px 0 rgba(43, 26, 63, 0.12);
}
:root[data-theme="carnival"] .brand,
:root[data-theme="carnival"] .header .icon-btn { color: #fff; }
:root[data-theme="carnival"] .brand-mark rect { stroke: #fff; fill: #2b1a3f; }
:root[data-theme="carnival"] .brand-mark circle { fill: #ffc93c; }
:root[data-theme="carnival"] .brand-word { text-shadow: 3px 3px 0 #2b1a3f; }
:root[data-theme="carnival"] .header .icon-btn { border-color: #fff; }
:root[data-theme="carnival"] .nav-link { color: rgba(255, 255, 255, 0.85); }
:root[data-theme="carnival"] .nav-link.router-link-active { color: var(--ink); }
:root[data-theme="carnival"] .nav-link.router-link-active svg { color: var(--accent); }
:root[data-theme="carnival"] .nav-indicator { background: #fff1d6; border: 2px solid var(--ink); }

@media (max-width: 720px) {
	/* backdrop-filter 會讓 fixed 子元素以頁首為定位基準，手機版改用實色 */
	.header { gap: 12px; backdrop-filter: none; background: var(--bg); }
	.actions { margin-left: auto; }

	/* 手機版：導覽改成底部分頁列，方便拇指操作 */
	.nav {
		position: fixed;
		left: 12px;
		right: 12px;
		bottom: calc(12px + env(safe-area-inset-bottom));
		z-index: 60;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		height: var(--tabbar-h);
		margin: 0;
		padding: 6px;
		border: var(--border-w) solid var(--line);
		border-radius: calc(var(--radius-lg) + 6px);
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		backdrop-filter: blur(14px);
		box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.35);
	}

	.nav-link {
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		padding: 4px;
		font-size: 12px;
	}

	.nav-link svg { width: 22px; height: 22px; }

	:root[data-theme="carnival"] .nav { background: #e63946; border-color: var(--ink); box-shadow: 4px 4px 0 var(--ink); }
}
</style>
