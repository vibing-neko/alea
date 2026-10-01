<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { animate, createTimeline, createScope, scrambleText, stagger, utils } from 'animejs'
import HistoryList from '../components/HistoryList.vue'
import { usePersisted } from '../composables/usePersisted.js'
import { useSound } from '../composables/useSound.js'
import { useMotion } from '../composables/useMotion.js'
import { randomInt } from '../lib/random.js'
import { burst } from '../lib/confetti.js'
import { ROUND_PARTS } from '../lib/roundCube.js'
import { createGrab } from '../lib/grab.js'

const SIDES = [4, 6, 8, 10, 12, 20, 100]
const COUNTS = [1, 2, 3, 4, 5, 6]

// 六面骰：各點數的點位（3×3 格）與朝向正面所需的旋轉
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }
const FACE_ROTATION = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] }

// 多面骰的 SVG 外形
const SHAPES = {
	4: { outline: '50,6 95,88 5,88', facets: ['M50 6 L50 62 M5 88 L50 62 L95 88'], numY: 64 },
	8: { outline: '50,4 94,50 50,96 6,50', facets: ['M6 50 L94 50'], numY: 50 },
	10: { outline: '50,4 94,44 50,96 6,44', facets: ['M6 44 L50 62 L94 44 M50 62 L50 96'], numY: 42 },
	12: { outline: '50,4 95,37 78,92 22,92 5,37', facets: ['M50 24 L74 42 L65 72 L35 72 L26 42 Z M50 4 L50 24 M95 37 L74 42 M78 92 L65 72 M22 92 L35 72 M5 37 L26 42'], numY: 52 },
	20: { outline: '50,3 93,27 93,73 50,97 7,73 7,27', facets: ['M50 24 L75 67 L25 67 Z M50 3 L50 24 M93 27 L50 24 M7 27 L50 24 M93 27 L75 67 M93 73 L75 67 M50 97 L75 67 M50 97 L25 67 M7 73 L25 67 M7 27 L25 67'], numY: 54 },
}
SHAPES[100] = SHAPES[10]

const { whoosh, clack, chime } = useSound()
const { profile, dur } = useMotion()

const sides = usePersisted('alea:dice:sides', 6)
const count = usePersisted('alea:dice:count', 2)
const history = usePersisted('alea:dice:history', [])

const root = ref(null)
const totalEl = ref(null)
const rolling = ref(false)
const IDLE_TEXT = '擲一下吧'
const values = ref([])
const note = ref('')
const tossEls = []
const bodyEls = []
const numEls = []
const shadowEls = []
let states = []
let timelines = []
let scope = null

const label = computed(() => `${count.value}D${sides.value}`)
const breakdown = computed(() => values.value.length > 1 ? values.value.join(' + ') : '')

function reset() {
	states = Array.from({ length: count.value }, () => ({ rx: 0, ry: 0, rz: 0, rot: 0 }))
	values.value = []
	// 換了骰子種類或數量，舊的總和就不適用，回到提示文字
	if (totalEl.value) {
		totalEl.value.textContent = IDLE_TEXT
		totalEl.value.classList.add('is-idle')
	}
	note.value = ''
	nextTick(() => states.forEach((_, i) => applyCube(i)))
}

function applyCube(i) {
	const s = states[i]
	if (sides.value === 6 && bodyEls[i]) bodyEls[i].style.transform = `rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg)`
}

function configure(key, value) {
	if (rolling.value) return
	if (key === 'sides') sides.value = value
	else count.value = value
	reset()
	nextTick(() => {
		animate(root.value.querySelectorAll('.die-slot'), { opacity: [0, 1], scale: [0.5, 1], rotate: [stagger([-20, 20]), 0], delay: stagger(50), ease: profile.value.pop() })
	})
}

// 往同方向多轉幾圈後，停在目標角度（mod 360）
const advance = (current, desired, turns) => current + ((desired - (current % 360) + 360) % 360) + 360 * turns

// 抓起骰子甩出去；只點一下就照一般方式擲出
const grab = createGrab({
	canGrab: () => !rolling.value,
	onGrab: g => animate(shadowEls[g.index], { scale: 0.7, opacity: 0.5, duration: 220 }),
	onMove: (g, dx, dy) => {
		utils.set(shadowEls[g.index], { x: g.x + dx })
		// 拿在手上時跟著移動方向翻滾
		const s = states[g.index]
		if (sides.value === 6) {
			s.rx -= dy * 1.2
			s.ry += dx * 1.2
			applyCube(g.index)
		} else {
			s.rot += dx * 1.5
			utils.set(bodyEls[g.index], { rotate: s.rot })
		}
	},
	onRelease: g => roll(g.tap ? null : g),
})

function roll(thrown = null) {
	if (rolling.value) return
	rolling.value = true
	note.value = ''
	whoosh()
	const n = sides.value
	const results = states.map(() => randomInt(n) + 1)
	const height = Math.min(innerHeight * 0.22, 180) * profile.value.toss
	const d = dur(1250)
	let done = 0

	timelines = states.map((s, i) => {
		const hand = thrown?.index === i ? thrown : null
		// 甩得越快，拋得越高、轉得越多
		const power = hand ? Math.min(Math.max(0.7 + hand.speed * 0.6, 0.7), 1.7) : 1
		const extra = Math.round((power - 1) * 3)
		const tl = createTimeline({ delay: hand ? 0 : i * 70 })
		tl.add(tossEls[i], {
			// 被甩出的骰子從手上的位置出發，其他骰子隨機從左右滾入
			x: hand ? { to: 0, duration: d, ease: 'out(1.6)' } : [utils.random(-70, 70), 0],
			y: [
				{ to: -height * power, duration: d * 0.45, ease: 'out(2.4)' },
				{ to: 0, duration: d * 0.55, ease: 'in(2.4)' },
			],
			scale: { to: 1, duration: dur(260), ease: 'out(2)' },
		}, 0)
		tl.add(shadowEls[i], {
			x: { to: 0, duration: d, ease: 'out(1.6)' },
			scale: [{ to: 0.45, duration: d * 0.45, ease: 'out(2.4)' }, { to: 1, duration: d * 0.55, ease: 'in(2.4)' }],
			opacity: [{ to: 0.3, duration: d * 0.45 }, { to: 1, duration: d * 0.55 }],
		}, 0)

		if (n === 6) {
			const [fx, fy] = FACE_ROTATION[results[i]]
			tl.add(s, {
				rx: advance(s.rx, (fx + 360) % 360, 2 + randomInt(2) + extra),
				ry: advance(s.ry, (fy + 360) % 360, 1 + randomInt(2) + extra),
				rz: s.rz + 360 * (1 + randomInt(2)),
				duration: d,
				ease: 'out(2)',
				onUpdate: () => applyCube(i),
			}, 0)
		} else {
			s.rot = Math.round(s.rot / 360) * 360 + 360 * (2 + randomInt(2) + extra)
			tl.add(bodyEls[i], { rotate: s.rot + utils.random(-8, 8), duration: d, ease: 'out(2.2)' }, 0)
			tl.add(numEls[i], {
				innerHTML: scrambleText({ text: String(results[i]), chars: '0-9', duration: d, settleRate: 18 }),
			}, 0)
		}

		// 落地當下就公布結果，不等回彈結束
		tl.call(() => {
			clack()
			if (++done === states.length) finish(results)
		}, d)
		tl.add(tossEls[i], { scaleY: [0.84, 1], scaleX: [1.1, 1], ease: profile.value.land() }, d)
		return tl
	})
}

function finish(results) {
	rolling.value = false
	values.value = results
	const total = results.reduce((a, b) => a + b, 0)
	const extra = results.length > 1 ? `（${results.join(', ')}）` : ''
	history.value = [{ t: Date.now(), text: `${label.value} → ${total}${extra}` }, ...history.value].slice(0, 50)
	// 第一次從提示文字切換成數字時，從空白開始跳號
	const fromIdle = totalEl.value.classList.contains('is-idle')
	if (fromIdle) {
		totalEl.value.classList.remove('is-idle')
		totalEl.value.textContent = ''
	}
	animate(totalEl.value, { innerHTML: scrambleText({ text: String(total), chars: '0-9', settleDuration: dur(300), override: fromIdle ? '' : true }) })

	const rect = totalEl.value.getBoundingClientRect()
	const cx = rect.left + rect.width / 2
	const cy = rect.top + rect.height / 2
	if (sides.value === 20 && results.length === 1 && results[0] === 20) {
		note.value = '大成功！'
		chime()
		burst(cx, cy)
	} else if (sides.value === 20 && results.length === 1 && results[0] === 1) {
		note.value = '大失敗…'
		animate('.dice', { x: [0, -10, 9, -6, 4, 0], duration: 500, ease: 'linear' })
	} else if (results.length >= 3 && results.every(v => v === results[0])) {
		note.value = '豹子！'
		chime()
		burst(cx, cy)
	}
}

onMounted(() => {
	reset()
	scope = createScope({
		root: root.value,
		mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' },
	}).add(self => {
		if (self.matches.reduce) return
		animate('.die-slot', { opacity: [0, 1], y: [-80, 0], rotate: [stagger([-30, 30]), 0], delay: stagger(70, { start: 150 }), ease: profile.value.land() })
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
			<p class="eyebrow">03 — The Dice</p>
			<h1 class="display">骰子</h1>
			<p>按按鈕擲出，或直接抓起骰子甩出去。D20 擲出 20 有驚喜。</p>
		</header>

		<div class="tool">
			<div class="stage">
				<div class="dice" :class="[`n${count}`, `d${sides}`]">
					<div v-for="i in count" :key="`${sides}-${i}`" class="die-slot">
						<div
							:ref="el => tossEls[i - 1] = el"
							class="die-toss"
							@pointerdown="grab.down($event, i - 1, tossEls[i - 1])"
							@pointermove="grab.move"
							@pointerup="grab.up"
							@pointercancel="grab.up"
						>
							<div v-if="sides === 6" class="die-tilt">
								<div :ref="el => bodyEls[i - 1] = el" class="cube">
									<!-- 內芯 + 圓柱邊 + 球角，組成外輪廓完整的圓角立方體 -->
									<span v-for="c in 3" :key="'core' + c" class="core" :class="`core${c}`"></span>
									<span v-for="(part, k) in ROUND_PARTS" :key="'r' + k" class="round" :class="part.kind" :style="part.style"></span>
									<div v-for="f in 6" :key="f" class="face" :class="[`f${f}`, { red: f === 1 || f === 4 }]">
										<i v-for="p in PIPS[f]" :key="p" :style="{ gridArea: `${Math.ceil(p / 3)} / ${(p - 1) % 3 + 1}` }"></i>
									</div>
								</div>
							</div>
							<div v-else :ref="el => bodyEls[i - 1] = el" class="poly">
								<svg viewBox="0 0 100 100" aria-hidden="true">
									<polygon :points="SHAPES[sides].outline" class="poly-shape" />
									<path v-for="(f, k) in SHAPES[sides].facets" :key="k" :d="f" class="poly-facet" />
								</svg>
								<span :ref="el => numEls[i - 1] = el" class="poly-num" :style="{ top: SHAPES[sides].numY + '%' }">{{ sides }}</span>
							</div>
						</div>
						<div :ref="el => shadowEls[i - 1] = el" class="die-shadow"></div>
					</div>
				</div>

				<div class="result" aria-live="polite">
					<span class="eyebrow">{{ label }}</span>
					<span ref="totalEl" class="total display is-idle">擲一下吧</span>
					<span class="breakdown">{{ breakdown }}&nbsp;</span>
					<span v-if="note" class="note display">{{ note }}</span>
				</div>

				<button class="btn btn--primary btn--big" :disabled="rolling" @click="roll()">
					{{ rolling ? '擲出中…' : '擲骰子' }}
				</button>
			</div>

			<aside class="side">
				<section class="panel settings">
					<div class="panel-title"><h2>設定</h2></div>
					<div class="field-group">
						<span class="label">骰子種類</span>
						<div class="segmented">
							<button v-for="s in SIDES" :key="s" :aria-pressed="sides === s" :disabled="rolling" @click="configure('sides', s)">D{{ s }}</button>
						</div>
					</div>
					<div class="field-group">
						<span class="label">骰子數量</span>
						<div class="segmented">
							<button v-for="c in COUNTS" :key="c" :aria-pressed="count === c" :disabled="rolling" @click="configure('count', c)">{{ c }}</button>
						</div>
					</div>
				</section>

				<HistoryList :items="history" @clear="history = []" />
			</aside>
		</div>
	</div>
</template>

<style scoped>
.stage {
	gap: 24px;
	padding-top: clamp(50px, 12vh, 140px);
}

.dice {
	--die-scale: 1.04;
	--die: calc(var(--die-scale) * 100px);
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 26px 30px;
	max-width: 560px;
}

.die-toss:active { cursor: grabbing; }

.dice.n3, .dice.n4 { --die-scale: 0.88; }
.dice.n5, .dice.n6 { --die-scale: 0.76; }

.die-slot {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.die-toss {
	position: relative;
	touch-action: none;
	cursor: grab;
	width: var(--die);
	height: var(--die);
	perspective: 700px;
}

/* ───────── 六面骰 ───────── */
.die-tilt {
	/* 幾何以 100px 為單位建立，再依骰子大小縮放 */
	position: absolute;
	left: 50%;
	top: 50%;
	width: 100px;
	height: 100px;
	margin: -50px 0 0 -50px;
	transform-style: preserve-3d;
	transform: scale(var(--die-scale)) rotateX(-16deg) rotateY(-22deg);
}

.cube {
	position: relative;
	width: 100%;
	height: 100%;
	transform-style: preserve-3d;
}

.core {
	position: absolute;
	inset: 5px;
	background: var(--die-round);
}

.round {
	position: absolute;
	left: 50%;
	top: 50%;
	background: var(--die-round);
}

.round.mid { background: var(--die-round-mid); }
.round.ball { border-radius: 50%; }

.core2 { transform: rotateY(90deg); }
.core3 { transform: rotateX(90deg); }

.face {
	position: absolute;
	left: 12px;
	top: 12px;
	width: 76px;
	height: 76px;
	padding: 4px;
	display: grid;
	grid-template: repeat(3, 1fr) / repeat(3, 1fr);
	background: var(--die-face);
	/* 邊緣往內淡出，讓平面自然過渡到圓角 */
	box-shadow: inset 0 0 10px var(--die-face-shade);
	backface-visibility: hidden;
}

.face i {
	place-self: center;
	width: 72%;
	height: 72%;
	border-radius: 50%;
	background: var(--die-pip);
	box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.45);
}

.face.red i { background: var(--die-pip-red); }
.face.f1 i { width: 105%; height: 105%; }

.f1 { transform: translateZ(50px); }
.f6 { transform: rotateY(180deg) translateZ(50px); }
.f3 { transform: rotateY(90deg) translateZ(50px); }
.f4 { transform: rotateY(-90deg) translateZ(50px); }
.f2 { transform: rotateX(90deg) translateZ(50px); }
.f5 { transform: rotateX(-90deg) translateZ(50px); }

:root[data-theme="washi"] .face i,
:root[data-theme="carnival"] .face i { box-shadow: none; }

/* ───────── 多面骰 ───────── */
.poly {
	position: relative;
	width: 100%;
	height: 100%;
}

.poly svg {
	width: 100%;
	height: 100%;
	overflow: visible;
	filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.3));
}

.poly-shape {
	fill: var(--poly-fill);
	stroke: var(--poly-fill);
	stroke-width: 4;
	stroke-linejoin: round;
}

.poly-facet {
	fill: none;
	stroke: var(--poly-line);
	stroke-width: 1.5;
	stroke-linejoin: round;
}

.poly-num {
	position: absolute;
	left: 50%;
	transform: translate(-50%, -50%);
	font-family: var(--font-mono);
	font-weight: 500;
	font-size: calc(var(--die) * 0.3);
	color: var(--poly-ink);
	white-space: nowrap;
}

.d100 .poly-num { font-size: calc(var(--die) * 0.24); }

:root[data-theme="carnival"] .poly-shape { stroke: var(--ink); stroke-width: 5; }
:root[data-theme="carnival"] .poly svg { filter: drop-shadow(5px 5px 0 var(--ink)); }
:root[data-theme="washi"] .poly svg { filter: none; }

.die-shadow {
	width: calc(var(--die) * 0.85);
	height: calc(var(--die) * 0.14);
	border-radius: 50%;
	background: radial-gradient(closest-side, rgba(0, 0, 0, 0.45), transparent);
}

:root[data-theme="washi"] .die-shadow { background: radial-gradient(closest-side, rgba(31, 27, 22, 0.25), transparent); }
:root[data-theme="carnival"] .die-shadow { background: rgba(43, 26, 63, 0.85); height: calc(var(--die) * 0.1); }

/* ───────── 結果 ───────── */
.result {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	min-height: 150px;
}

.total {
	font-size: clamp(56px, 9vw, 96px);
	color: var(--accent);
	line-height: 1;
}

/* 楷體的 9 容易看成 q，Washi 的點數改用襯線體 */
:root[data-theme="washi"] .total:not(.is-idle) { font-family: 'Noto Serif TC', serif; }

/* 尚未擲出時的提示文字，字級比照硬幣 */
.total.is-idle {
	font-size: clamp(36px, 6vw, 56px);
	line-height: 1.7;
}

.breakdown {
	font-family: var(--font-mono);
	font-size: 14px;
	color: var(--ink-soft);
}

.note {
	font-size: 24px;
	color: var(--accent-2);
}

:root[data-theme="carnival"] .note { color: var(--accent); }

.settings {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.settings .panel-title { margin-bottom: 0; }

.field-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

@media (max-width: 860px) {
	.stage { padding-top: 70px; }
	.dice { --die-scale: 0.88; gap: 22px; }
	.dice.n3, .dice.n4 { --die-scale: 0.74; }
	.dice.n5, .dice.n6 { --die-scale: 0.64; }
}
</style>
