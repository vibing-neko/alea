<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { animate, createTimeline, createScope, splitText, stagger, spring, utils } from 'animejs'
import HistoryList from '../components/HistoryList.vue'
import CoinFace from '../components/CoinFace.vue'
import { usePersisted } from '../composables/usePersisted.js'
import { useSound } from '../composables/useSound.js'
import { useMotion } from '../composables/useMotion.js'
import { randomInt } from '../lib/random.js'
import { burst } from '../lib/confetti.js'
import { createGrab } from '../lib/grab.js'

const COUNTS = [1, 2, 3, 4, 5]
const EDGE_LAYERS = 11

const { whoosh, ping, chink } = useSound()
const { profile, dur } = useMotion()

const count = usePersisted('alea:coin:count', 1)
const stats = usePersisted('alea:coin:stats', { heads: 0, tails: 0 })
const history = usePersisted('alea:coin:history', [])

const root = ref(null)
const summary = ref(null)
const tossing = ref(false)
const tossEls = []
const coinEls = []
const shadowEls = []
let states = []
let scope = null
let timelines = []
let summarySplit = null

const total = computed(() => stats.value.heads + stats.value.tails)
const headsRatio = computed(() => total.value ? stats.value.heads / total.value : 0.5)

function resetCoins() {
	states = Array.from({ length: count.value }, () => ({ rx: 0, rz: 0 }))
	nextTick(() => states.forEach((_, i) => applyRotation(i)))
}

function applyRotation(i) {
	const el = coinEls[i]
	if (!el) return
	const { rx, rz } = states[i]
	el.style.transform = `rotateX(${rx}deg) rotateZ(${rz}deg)`
	// 翻轉時讓金屬反光跟著移動
	el.style.setProperty('--sheen', `${rx * 0.6 - rz}deg`)
}

function setCount(n) {
	if (tossing.value || n === count.value) return
	count.value = n
	resetCoins()
	nextTick(() => {
		animate(root.value.querySelectorAll('.coin-slot'), { opacity: [0, 1], scale: [0.6, 1], delay: stagger(50), ease: profile.value.pop() })
	})
}

// 平躺在地上時相對鏡頭的傾角（鏡頭由斜上方往下看）
const FLAT = 62

// 抓起硬幣甩出去；只點一下就照一般方式擲出
const grab = createGrab({
	canGrab: () => !tossing.value,
	onGrab: g => animate(shadowEls[g.index], { scale: 0.7, opacity: 0.5, duration: 220 }),
	onMove: (g, dx, dy) => {
		utils.set(shadowEls[g.index], { x: g.x + dx })
		// 拿在手上時跟著移動方向翻動
		const s = states[g.index]
		s.rx += dy * 0.8
		s.rz += dx * 0.3
		applyRotation(g.index)
	},
	onRelease: g => toss(g.tap ? null : g),
})

function toss(thrown = null) {
	if (tossing.value) return
	tossing.value = true
	whoosh()
	const results = states.map(() => randomInt(2)) // 0 正面、1 反面
	const height = Math.min(innerHeight * 0.32, 260) * profile.value.toss
	const size = tossEls[0].offsetHeight
	const ground = size * 0.3 // 平躺時重心比立著低
	const d = dur(1000) // 拋起到落地
	const settle = dur(950) // 在地上晃動、打轉
	const rest = dur(280) // 停一下，讓人看見朝上的那面
	const rise = dur(640) // 立起來面向鏡頭
	const riseAt = d + settle + rest
	let done = 0

	timelines = states.map((state, i) => {
		const update = () => applyRotation(i)
		const hand = thrown?.index === i ? thrown : null
		// 甩得越快，拋得越高、轉得越多
		const power = hand ? Math.min(Math.max(0.7 + hand.speed * 0.6, 0.7), 1.7) : 1
		const flat = (results[i] ? 180 : 0) + FLAT
		const land = state.rx + ((flat - (state.rx % 360) + 360) % 360) + 360 * (3 + randomInt(3) + Math.round((power - 1) * 4))
		const spinZ = (randomInt(2) ? 1 : -1) * (120 + randomInt(180))
		const finalZ = Math.round((state.rz + spinZ) / 360) * 360
		const tl = createTimeline({ delay: hand ? 0 : i * 90 })

		// 1. 拋起翻轉，掉到地上（被甩出的那枚從手上的位置出發）
		tl.add(tossEls[i], {
			y: [
				{ to: -height * power, duration: d * 0.48, ease: 'out(2.2)' },
				{ to: ground, duration: d * 0.52, ease: 'in(2.4)' },
			],
			x: { to: 0, duration: d, ease: 'out(1.6)' },
			scale: { to: 1, duration: dur(260), ease: 'out(2)' },
		}, 0)
		tl.add(state, { rx: land + 28, duration: d, ease: 'out(1.3)', onUpdate: update }, 0)
		tl.add(shadowEls[i], {
			x: { to: 0, duration: d, ease: 'out(1.6)' },
			scale: [{ to: 0.4, duration: d * 0.48, ease: 'out(2.2)' }, { to: 1.12, duration: d * 0.52, ease: 'in(2.4)' }],
			opacity: [{ to: 0.25, duration: d * 0.48 }, { to: 1, duration: d * 0.52 }],
		}, 0)
		tl.call(ping, d)

		// 2. 彈一下，在地上晃動、打轉，聲音越來越密
		tl.add(tossEls[i], {
			y: [
				{ to: ground - size * 0.12, duration: dur(150), ease: 'out(2)' },
				{ to: ground, duration: dur(170), ease: 'in(2)' },
			],
		}, d)
		tl.add(state, { rx: land, ease: spring({ bounce: 0.62, duration: settle }), onUpdate: update }, d)
		tl.add(state, { rz: state.rz + spinZ, duration: settle, ease: 'out(3)', onUpdate: update }, d)
		;[0.16, 0.36, 0.52, 0.64, 0.73, 0.8, 0.85, 0.89].forEach(t => tl.call(chink, d + settle * t))

		// 3. 立起來，面向鏡頭公布結果
		tl.add(state, { rx: land - FLAT, rz: finalZ, duration: rise, ease: 'inOut(3)', onUpdate: update }, riseAt)
		tl.add(tossEls[i], {
			y: [
				{ to: -size * 0.16, duration: rise * 0.6, ease: 'out(2)' },
				{ to: 0, duration: rise * 0.4, ease: 'in(2)' },
			],
		}, riseAt)
		tl.add(shadowEls[i], { scale: 1, duration: rise }, riseAt)
		tl.call(() => {
			if (++done === states.length) finish(results)
		}, riseAt + rise)
		tl.add(tossEls[i], { scale: [1.07, 1], ease: profile.value.land() }, riseAt + rise)
		return tl
	})
}

function finish(results) {
	tossing.value = false
	const heads = results.filter(r => r === 0).length
	const tails = results.length - heads
	stats.value = { heads: stats.value.heads + heads, tails: stats.value.tails + tails }
	const text = results.length === 1 ? (heads ? '正面' : '反面') : `${heads} 正 · ${tails} 反`
	history.value = [{ t: Date.now(), text }, ...history.value].slice(0, 50)
	// 結果文字逐字彈出
	summarySplit?.revert()
	summary.value.textContent = text
	summarySplit = splitText(summary.value, { chars: true })
	animate(summarySplit.chars, {
		opacity: [0, 1],
		y: ['0.4em', '0em'],
		scale: [0.6, 1],
		delay: stagger(60),
		ease: profile.value.pop(),
	})
	if (results.length > 1 && (heads === 0 || tails === 0)) {
		const rect = summary.value.getBoundingClientRect()
		burst(rect.left + rect.width / 2, rect.top + rect.height / 2)
	}
}

function clearStats() {
	stats.value = { heads: 0, tails: 0 }
	history.value = []
}

onMounted(() => {
	resetCoins()
	scope = createScope({
		root: root.value,
		mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' },
	}).add(self => {
		if (self.matches.reduce) return
		animate('.coin-slot', { opacity: [0, 1], y: [-60, 0], delay: stagger(80, { start: 150 }), ease: profile.value.land() })
		animate('.side > *', { opacity: [0, 1], y: [20, 0], delay: stagger(90, { start: 200 }), duration: 700, ease: 'out(3)' })
	})
})

onBeforeUnmount(() => {
	timelines.forEach(t => t.pause())
	scope?.revert()
})
</script>

<template>
	<div ref="root" class="page">
		<header class="tool-head">
			<p class="eyebrow">02 — The Coin</p>
			<h1 class="display">硬幣</h1>
			<p>按按鈕擲出，或直接抓起硬幣甩出去。一次最多可以擲五枚。</p>
		</header>

		<!-- 硬幣共用的漸層、浮雕濾鏡與弧形文字路徑 -->
		<svg class="coin-defs" aria-hidden="true">
			<defs>
				<radialGradient id="coin-metal" cx="35%" cy="28%" r="80%">
					<stop offset="0" style="stop-color: var(--coin-hi)" />
					<stop offset="0.45" style="stop-color: var(--coin-mid)" />
					<stop offset="1" style="stop-color: var(--coin-lo)" />
				</radialGradient>
				<radialGradient id="coin-lathe" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="2.4" spreadMethod="repeat">
					<stop offset="0" stop-color="#fff" stop-opacity="0.1" />
					<stop offset="0.5" stop-color="#000" stop-opacity="0.07" />
					<stop offset="1" stop-color="#fff" stop-opacity="0.1" />
				</radialGradient>
				<linearGradient id="coin-rim" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" style="stop-color: var(--coin-hi)" />
					<stop offset="0.5" style="stop-color: var(--coin-mid)" />
					<stop offset="1" style="stop-color: var(--coin-deep)" />
				</linearGradient>
				<linearGradient id="coin-bevel" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" style="stop-color: var(--coin-deep)" />
					<stop offset="1" style="stop-color: var(--coin-hi)" />
				</linearGradient>
				<filter id="coin-emboss" x="-10%" y="-10%" width="120%" height="120%">
					<feOffset in="SourceAlpha" dx="-0.9" dy="-0.9" result="up" />
					<feFlood flood-color="#fff" flood-opacity="0.6" />
					<feComposite in2="up" operator="in" result="light" />
					<feOffset in="SourceAlpha" dx="1.1" dy="1.3" result="down" />
					<feFlood flood-color="#000" flood-opacity="0.5" />
					<feComposite in2="down" operator="in" result="shade" />
					<feMerge>
						<feMergeNode in="light" />
						<feMergeNode in="shade" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<path id="coin-arc-top" d="M36 100 A64 64 0 0 1 164 100" />
				<path id="coin-arc-bottom" d="M33 100 A67 67 0 0 0 167 100" />
			</defs>
		</svg>

		<div class="tool">
			<div class="stage">
				<div class="coins" :class="`n${count}`">
					<div v-for="i in count" :key="i" class="coin-slot">
						<div
							:ref="el => tossEls[i - 1] = el"
							class="coin-toss"
							@pointerdown="grab.down($event, i - 1, tossEls[i - 1])"
							@pointermove="grab.move"
							@pointerup="grab.up"
							@pointercancel="grab.up"
						>
							<div :ref="el => coinEls[i - 1] = el" class="coin">
								<span
									v-for="k in EDGE_LAYERS"
									:key="k"
									class="coin-edge"
									:style="{ transform: `translateZ(${k - (EDGE_LAYERS + 1) / 2}px)` }"
								></span>
								<div class="coin-face front"><CoinFace side="front" /></div>
								<div class="coin-face back"><CoinFace side="back" /></div>
							</div>
						</div>
						<div :ref="el => shadowEls[i - 1] = el" class="coin-shadow"></div>
					</div>
				</div>

				<p ref="summary" class="summary display" aria-live="polite">擲一下吧</p>

				<button class="btn btn--primary btn--big" :disabled="tossing" @click="toss()">
					{{ tossing ? '擲出中…' : '擲硬幣' }}
				</button>
			</div>

			<aside class="side">
				<section class="panel settings">
					<div class="panel-title"><h2>設定</h2></div>
					<div class="row">
						<span class="label">硬幣數量</span>
						<div class="segmented">
							<button v-for="n in COUNTS" :key="n" :aria-pressed="count === n" :disabled="tossing" @click="setCount(n)">{{ n }}</button>
						</div>
					</div>
				</section>

				<section class="panel">
					<div class="panel-title">
						<h2>統計</h2>
						<span class="label mono">共 {{ total }} 枚</span>
					</div>
					<div class="ratio">
						<div class="ratio-labels">
							<span>正面 <b>{{ stats.heads }}</b></span>
							<span><b>{{ stats.tails }}</b> 反面</span>
						</div>
						<div class="ratio-bar">
							<span :style="{ width: headsRatio * 100 + '%' }"></span>
						</div>
						<div class="ratio-labels mono">
							<span>{{ (headsRatio * 100).toFixed(1) }}%</span>
							<span>{{ ((1 - headsRatio) * 100).toFixed(1) }}%</span>
						</div>
					</div>
				</section>

				<HistoryList :items="history" @clear="clearStats" />
			</aside>
		</div>
	</div>
</template>

<style scoped>
.stage {
	gap: 28px;
	padding-top: clamp(60px, 14vh, 160px);
}

.coins {
	--coin: 150px;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 22px;
}

.coin-toss:active { cursor: grabbing; }

.coins.n2 { --coin: 132px; }
.coins.n3 { --coin: 112px; }
.coins.n4, .coins.n5 { --coin: 92px; }

.coin-slot {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18px;
}

.coin-toss {
	touch-action: none;
	cursor: grab;
	width: var(--coin);
	height: var(--coin);
	perspective: 900px;
}

.coin {
	position: relative;
	width: 100%;
	height: 100%;
	transform-style: preserve-3d;
}

.coin-edge,
.coin-face {
	position: absolute;
	inset: 0;
	border-radius: 50%;
}

/* 邊緣：有齒紋的金屬側邊 */
.coin-edge {
	background: repeating-conic-gradient(var(--coin-edge) 0deg 2deg, var(--coin-edge-hi) 2deg 4deg);
}

.coin-face {
	overflow: hidden;
	backface-visibility: hidden;
	box-shadow: 0 0 0 1px var(--coin-deep);
}

/* 隨翻轉角度移動的金屬反光 */
.coin-face::after {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background: conic-gradient(
		from var(--sheen, 0deg),
		transparent 0deg,
		rgba(255, 255, 255, 0.38) 35deg,
		transparent 75deg,
		transparent 180deg,
		rgba(255, 255, 255, 0.22) 215deg,
		transparent 255deg
	);
	mix-blend-mode: soft-light;
	pointer-events: none;
}

.coin-face.front { transform: translateZ(5.5px); }
.coin-face.back { transform: rotateX(180deg) translateZ(5.5px); }

.coin-shadow {
	width: calc(var(--coin) * 0.8);
	height: calc(var(--coin) * 0.12);
	border-radius: 50%;
	background: radial-gradient(closest-side, rgba(0, 0, 0, 0.45), transparent);
}

:root[data-theme="washi"] .coin-shadow { background: radial-gradient(closest-side, rgba(31, 27, 22, 0.25), transparent); }

:root[data-theme="carnival"] .coin-face { box-shadow: 0 0 0 3px var(--ink); }
:root[data-theme="carnival"] .coin-face::after { mix-blend-mode: overlay; }
:root[data-theme="carnival"] .coin-shadow { background: rgba(43, 26, 63, 0.85); height: calc(var(--coin) * 0.09); }

.coin-defs {
	position: absolute;
	width: 0;
	height: 0;
}

.summary {
	min-height: 1.2em;
	font-size: clamp(36px, 6vw, 56px);
	color: var(--accent);
	text-align: center;
}

.summary :deep(*) { display: inline-block; }

.settings {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.settings .panel-title { margin-bottom: 0; }

.mono { font-family: var(--font-mono); }

.ratio {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.ratio-labels {
	display: flex;
	justify-content: space-between;
	font-size: 14px;
}

.ratio-labels b { font-family: var(--font-mono); color: var(--accent); }
.ratio-labels.mono { font-size: 12px; color: var(--ink-faint); }

.ratio-bar {
	height: 10px;
	overflow: hidden;
	border: var(--border-w) solid var(--line);
	border-radius: 999px;
	background: var(--accent-2);
}

.ratio-bar span {
	display: block;
	height: 100%;
	background: var(--accent);
	transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (max-width: 860px) {
	.stage { padding-top: 90px; }
	.coins { --coin: 120px; }
	.coins.n2 { --coin: 110px; }
	.coins.n3 { --coin: 92px; }
	.coins.n4, .coins.n5 { --coin: 76px; gap: 16px; }
}
</style>
