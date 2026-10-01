<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { animate, createScope, splitText, stagger, onScroll, spring } from 'animejs'
import ToolIcon from '../components/ToolIcon.vue'
import { TOOLS } from '../lib/tools.js'

const root = ref(null)
let scope = null

const PRINCIPLES = [
	{ no: 'I', title: '公平的亂數', text: '結果由瀏覽器的 crypto.getRandomValues 產生，動畫只負責把結果演出來。' },
	{ no: 'II', title: '設定自動保存', text: '轉盤選項、紀錄和主題都存在你的瀏覽器裡，下次打開還在。' },
	{ no: 'III', title: '一鍵分享', text: '把轉盤選項變成連結傳給朋友，大家看到的是同一組選項。' },
]

const BULBS = 28

onMounted(() => {
	scope = createScope({
		root: root.value,
		mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' },
	}).add(self => {
		if (self.matches.reduce) return

		// 主標題逐字進場
		const splitter = splitText('.wordmark', { chars: true })
		animate(splitter.chars, {
			y: ['0.6em', '0em'],
			rotate: [stagger([-14, 14]), 0],
			opacity: [0, 1],
			delay: stagger(80, { start: 120 }),
			ease: spring({ bounce: 0.4, duration: 900 }),
		})
		animate('.hero .eyebrow, .hero .lead', {
			opacity: [0, 1],
			y: [12, 0],
			delay: stagger(140, { start: 420 }),
			duration: 700,
			ease: 'out(3)',
		})

		// 背景裝飾轉盤慢慢轉
		animate('.hero-art .dial', { rotate: 360, duration: 90000, ease: 'linear', loop: true })
		animate('.hero-art .dial-ticks line', {
			opacity: [0.15, 1],
			duration: 1200,
			delay: stagger(40),
			loop: true,
			alternate: true,
			ease: 'inOut(2)',
		})

		// 工具卡片依序進場
		animate('.card', {
			opacity: [0, 1],
			y: [40, 0],
			delay: stagger(110, { start: 380 }),
			duration: 900,
			ease: 'out(4)',
		})

		// 遊樂園燈泡追逐
		animate('.bulbs i', {
			opacity: [0.25, 1],
			scale: [0.8, 1],
			duration: 320,
			delay: stagger(70),
			loop: true,
			alternate: true,
			ease: 'inOut(2)',
		})

		// 捲動到原則區塊時才進場
		animate('.principle', {
			opacity: [0, 1],
			y: [30, 0],
			delay: stagger(120),
			duration: 800,
			ease: 'out(3)',
			autoplay: onScroll({ enter: 'bottom-=60 top' }),
		})

		return () => splitter.revert()
	})
})

onBeforeUnmount(() => scope?.revert())

// 滑過卡片時，圖示各自做一個小動作
function hover(event, icon) {
	const target = event.currentTarget.querySelector('.card-icon svg')
	const motions = {
		wheel: { rotate: '+=180', duration: 900, ease: 'out(3)' },
		coin: { rotateY: '+=360', duration: 800, ease: 'out(2)' },
		dice: { rotate: '+=90', y: [0, -10, 0], duration: 700, ease: 'out(3)' },
	}
	animate(target, motions[icon])
}
</script>

<template>
	<div ref="root" class="page home">
		<section class="hero">
			<div class="hero-copy">
				<p class="eyebrow">Alea iacta est — 骰子已經擲出</p>
				<h1 class="wordmark display">Alea</h1>
				<p class="lead">猶豫不決的時候，<br>讓天意替你決定。</p>
			</div>
			<div class="hero-art" aria-hidden="true">
				<svg viewBox="-200 -200 400 400">
					<g class="dial">
						<circle r="190" class="ring" />
						<circle r="150" class="ring thin" />
						<circle r="62" class="ring" />
						<g class="dial-ticks">
							<line v-for="i in 36" :key="i" x1="0" y1="-190" x2="0" :y2="i % 3 ? -178 : -166" :transform="`rotate(${i * 10})`" />
						</g>
						<line v-for="i in 12" :key="'s' + i" x1="0" y1="-62" x2="0" y2="-150" class="spoke" :transform="`rotate(${i * 30})`" />
					</g>
					<path d="M -12 -212 L 12 -212 L 0 -186 Z" class="pointer" />
					<circle r="8" class="hub" />
				</svg>
			</div>
		</section>

		<div class="bulbs" aria-hidden="true">
			<i v-for="i in BULBS" :key="i"></i>
		</div>

		<section class="cards" aria-label="工具">
			<RouterLink
				v-for="(tool, i) in TOOLS"
				:key="tool.to"
				:to="tool.to"
				class="card"
				@mouseenter="hover($event, tool.icon)"
			>
				<span class="card-no">0{{ i + 1 }}</span>
				<span class="card-icon"><ToolIcon :name="tool.icon" /></span>
				<span class="card-en eyebrow">{{ tool.en }}</span>
				<span class="card-title display">{{ tool.label }}</span>
				<span class="card-desc">{{ tool.desc }}</span>
				<span class="card-go" aria-hidden="true">→</span>
			</RouterLink>
		</section>

		<section class="principles">
			<article v-for="p in PRINCIPLES" :key="p.no" class="principle">
				<span class="principle-no display">{{ p.no }}</span>
				<h2>{{ p.title }}</h2>
				<p>{{ p.text }}</p>
			</article>
		</section>
	</div>
</template>

<style scoped>
.home { overflow-x: clip; }

.hero {
	position: relative;
	display: grid;
	grid-template-columns: 1.1fr 0.9fr;
	align-items: center;
	gap: 24px;
	min-height: min(62vh, 560px);
}

.hero-copy {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.wordmark {
	font-size: clamp(96px, 17vw, 220px);
	line-height: 0.85;
	margin-left: -0.04em;
}

.wordmark :deep(*) { display: inline-block; }

.lead {
	font-size: clamp(20px, 2.4vw, 28px);
	line-height: 1.5;
	color: var(--ink-soft);
}

.hero-art svg {
	width: 100%;
	max-width: 480px;
	margin-left: auto;
	display: block;
	overflow: visible;
}

.dial { transform-box: fill-box; transform-origin: center; }
.ring { fill: none; stroke: var(--line-strong); stroke-width: 1.5; }
.ring.thin { stroke: var(--line); stroke-dasharray: 2 6; }
.dial-ticks line, .spoke { stroke: var(--accent); stroke-width: 2; stroke-linecap: round; }
.spoke { stroke: var(--line); stroke-width: 1; }
.pointer { fill: var(--accent); }
.hub { fill: var(--accent); }

/* 遊樂園專屬燈泡列 */
.bulbs {
	display: none;
	justify-content: space-between;
	margin: 12px 0 28px;
	padding: 10px 14px;
	border: 3px solid var(--ink);
	border-radius: 999px;
	background: #e63946;
	box-shadow: 4px 4px 0 var(--ink);
}

.bulbs i {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: #ffe066;
	box-shadow: 0 0 10px 2px rgba(255, 224, 102, 0.85);
}

:root[data-theme="carnival"] .bulbs { display: flex; }

.cards {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: clamp(14px, 2vw, 24px);
	margin-top: 24px;
}

.card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-height: 300px;
	padding: 26px;
	border: var(--border-w) solid var(--line);
	border-radius: var(--radius-lg);
	background: var(--surface);
	box-shadow: var(--shadow);
	color: var(--ink);
	text-decoration: none;
	overflow: hidden;
	transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}

.card:hover { border-color: var(--line-strong); transform: translateY(-4px); }

.card-no {
	font-family: var(--font-mono);
	font-size: 12px;
	color: var(--ink-faint);
}

.card-icon {
	display: block;
	margin: 18px 0 auto;
	color: var(--accent);
	perspective: 400px;
}

.card-icon svg {
	width: 72px;
	height: 72px;
	stroke-width: 1.1;
}

.card-title { font-size: 44px; }

.card-desc {
	font-size: 14px;
	color: var(--ink-soft);
}

.card-go {
	position: absolute;
	top: 22px;
	right: 24px;
	font-size: 22px;
	color: var(--accent);
	transition: transform 0.3s;
}

.card:hover .card-go { transform: translateX(6px); }

:root[data-theme="noir"] .card {
	background: linear-gradient(160deg, rgba(31, 63, 50, 0.6), rgba(13, 31, 26, 0.6));
}
:root[data-theme="noir"] .card::after {
	content: '';
	position: absolute;
	inset: 8px;
	border: 1px solid var(--line);
	border-radius: 4px;
	pointer-events: none;
}

:root[data-theme="washi"] .card {
	background: transparent;
	border-width: 0 0 0 1px;
	border-radius: 0;
}
:root[data-theme="washi"] .card:first-child { border-left: 0; }
:root[data-theme="washi"] .card-title { writing-mode: vertical-rl; position: absolute; right: 26px; top: 64px; font-size: 52px; }
:root[data-theme="washi"] .card-go { top: auto; bottom: 24px; }
:root[data-theme="washi"] .card-desc { max-width: 70%; }

:root[data-theme="carnival"] .card:nth-child(1) { background: #fff; }
:root[data-theme="carnival"] .card:nth-child(2) { background: #ffc93c; }
:root[data-theme="carnival"] .card:nth-child(3) { background: #2ec4b6; }
:root[data-theme="carnival"] .card-icon { color: var(--ink); }
:root[data-theme="carnival"] .card:hover { transform: translate(-3px, -3px); box-shadow: 9px 9px 0 var(--ink); }

.principles {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: clamp(20px, 3vw, 40px);
	margin-top: clamp(56px, 8vw, 110px);
	padding-top: 32px;
	border-top: var(--border-w) solid var(--line);
}

.principle {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.principle-no {
	font-size: 34px;
	color: var(--accent);
}

.principle h2 {
	font-size: 18px;
	font-weight: 700;
}

.principle p {
	font-size: 14px;
	color: var(--ink-soft);
}

@media (max-width: 860px) {
	.hero { grid-template-columns: 1fr; min-height: auto; padding-top: 12px; }
	.hero-art { position: absolute; top: 90px; right: -90px; width: 300px; opacity: 0.35; pointer-events: none; }
	.hero-copy { position: relative; z-index: 1; }
	.cards, .principles { grid-template-columns: 1fr; }
	.card { min-height: 200px; }
	.card-icon svg { width: 52px; height: 52px; }
	.bulbs i:nth-child(n + 15) { display: none; }
}
</style>
