<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animate, createScope, splitText, stagger } from 'animejs'
import HistoryList from '../components/HistoryList.vue'
import { usePersisted } from '../composables/usePersisted.js'
import { useSound } from '../composables/useSound.js'
import { useMotion } from '../composables/useMotion.js'
import { useTheme } from '../composables/useTheme.js'
import { useToast } from '../composables/useToast.js'
import { randomInt, randomFloat, shuffle } from '../lib/random.js'
import { encodeItems, decodeItems } from '../lib/share.js'
import { burst } from '../lib/confetti.js'

const PRESETS = [
	{ name: '午餐吃什麼', items: ['便當', '牛肉麵', '滷肉飯', '拉麵', '火鍋', '咖哩飯', '水餃', '速食'] },
	{ name: '飲料', items: ['珍珠奶茶', '紅茶拿鐵', '四季春', '冬瓜檸檬', '美式咖啡', '多多綠'] },
	{ name: '週末去哪', items: ['看電影', '爬山', '逛夜市', '咖啡廳', '在家耍廢', '海邊'] },
	{ name: '是或否', items: ['是', '否'] },
	{ name: '數字 1–10', items: Array.from({ length: 10 }, (_, i) => String(i + 1)) },
]
const MAX_ITEMS = 60
const R = 460
const BULBS = 24
const DURATIONS = [3, 6, 10]

const route = useRoute()
const router = useRouter()
const { tick, whoosh, chime } = useSound()
const { profile, dur } = useMotion()
const { theme } = useTheme()
const toast = useToast()

const items = usePersisted('alea:wheel:items', PRESETS[0].items)
const removeAfter = usePersisted('alea:wheel:remove', false)
const seconds = usePersisted('alea:wheel:seconds', 6)
const history = usePersisted('alea:wheel:history', [])
// 範本：內建與自訂放在同一個列表，都可以刪除；首次載入時合併舊版的自訂範本
function initialTemplates() {
	let mine = []
	try { mine = JSON.parse(localStorage.getItem('alea:wheel:presets')) || [] } catch {}
	return [...mine, ...PRESETS.map(p => ({ name: p.name, items: [...p.items] }))]
}
const templates = usePersisted('alea:wheel:templates', initialTemplates())
const missingBuiltIns = computed(() => PRESETS.filter(p => !templates.value.some(t => t.name === p.name)))

const root = ref(null)
const svg = ref(null)
const disc = ref(null)
const pointer = ref(null)
const draft = ref('')
const spinning = ref(false)
const winner = ref(null)
const result = ref('')

// 選項列表動畫需要穩定的 key，與 items 同步維護
let nextKey = 0
const keys = ref(items.value.map(() => nextKey++))
const setItems = list => {
	items.value = list
	keys.value = list.map(() => nextKey++)
}
const spliceItem = i => {
	items.value.splice(i, 1)
	keys.value.splice(i, 1)
}

const hubLabel = computed(() => ({ noir: 'SPIN', washi: '轉', carnival: 'GO!' })[theme.value])
const canSpin = computed(() => items.value.length >= 2 && !spinning.value)

// ───────── 轉盤幾何 ─────────
const segments = computed(() => {
	const n = items.value.length
	const seg = 360 / n
	const maxChars = n > 16 ? 6 : n > 8 ? 8 : 10
	const fontSize = n <= 4 ? 44 : n <= 8 ? 38 : n <= 14 ? 30 : n <= 24 ? 22 : 16
	const point = deg => {
		const rad = (deg - 90) * Math.PI / 180
		return `${(R * Math.cos(rad)).toFixed(2)} ${(R * Math.sin(rad)).toFixed(2)}`
	}
	return items.value.map((text, i) => {
		let color = i % 6 + 1
		if (n % 6 === 1 && i === n - 1 && n > 1) color = 3
		const chars = [...text]
		return {
			key: `${i}-${text}`,
			path: n === 1
				? `M0 ${-R} A${R} ${R} 0 1 1 0 ${R} A${R} ${R} 0 1 1 0 ${-R}Z`
				: `M0 0 L${point(i * seg)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point((i + 1) * seg)}Z`,
			divider: point(i * seg),
			mid: i * seg + seg / 2 - 90,
			label: chars.length > maxChars ? chars.slice(0, maxChars - 1).join('') + '…' : text,
			color,
			fontSize,
		}
	})
})

// ───────── 旋轉狀態（用物件給 anime.js 補間，再寫回 SVG） ─────────
const state = { rot: 0 }
const pointerState = { a: 0 }
let lastIndex = -1
let prevRot = 0
let silent = true
let spinAnim = null
let bulbAnim = null
let scope = null

function currentIndex() {
	const n = items.value.length
	const local = ((-state.rot % 360) + 360) % 360
	return Math.floor(local / (360 / n)) % n
}

function drawPointer() {
	pointer.value?.setAttribute('transform', `rotate(${pointerState.a} 0 -500)`)
}

function render() {
	if (!disc.value) return
	disc.value.setAttribute('transform', `rotate(${state.rot})`)
	const index = currentIndex()
	if (index !== lastIndex) {
		const dir = Math.sign(state.rot - prevRot) || 1
		lastIndex = index
		if (!silent) {
			tick()
			animate(pointerState, { a: [-24 * dir, 0], duration: 280, ease: 'out(3)', onUpdate: drawPointer })
		}
	}
	prevRot = state.rot
}

// ───────── 轉動 ─────────
function spin(direction = 1, power = 1) {
	if (!canSpin.value) return
	closeResult()
	const n = items.value.length
	const seg = 360 / n
	const index = randomInt(n)
	// 落點避開格線，停在格子 12%～88% 的位置
	const offset = index * seg + seg * (0.12 + randomFloat() * 0.76)
	const desired = ((360 - offset) % 360 + 360) % 360
	const curMod = ((state.rot % 360) + 360) % 360
	const turns = Math.round((3 + seconds.value * 0.9) * power)
	const target = direction > 0
		? state.rot + ((desired - curMod + 360) % 360) + 360 * turns
		: state.rot - ((curMod - desired + 360) % 360) - 360 * turns

	spinning.value = true
	silent = false
	whoosh()
	if (bulbAnim) bulbAnim.speed = 4
	spinAnim = animate(state, {
		rot: target,
		duration: dur(seconds.value * 1000),
		ease: profile.value.spinEase,
		onUpdate: render,
		onComplete: () => finish(index),
	})
}

function finish(index) {
	spinning.value = false
	if (bulbAnim) bulbAnim.speed = 1
	winner.value = index
	result.value = items.value[index]
	history.value = [{ t: Date.now(), text: result.value }, ...history.value].slice(0, 50)
	chime()
	const rect = svg.value.getBoundingClientRect()
	burst(rect.left + rect.width / 2, rect.top + rect.height / 2)
	nextTick(() => {
		animate(svg.value.querySelectorAll('.slice.win'), { opacity: [1, 0.55, 1, 0.55, 1], duration: 900, ease: 'linear' })
	})
}

function closeResult() {
	if (winner.value === null) return
	if (removeAfter.value && items.value.length > 2) spliceItem(winner.value)
	winner.value = null
	result.value = ''
}

// ───────── 拖曳甩動 ─────────
let drag = null

function angleAt(e) {
	const rect = svg.value.getBoundingClientRect()
	return Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * 180 / Math.PI
}

function onPointerDown(e) {
	if (spinning.value || items.value.length < 2) return
	svg.value.setPointerCapture(e.pointerId)
	drag = { last: angleAt(e), t: e.timeStamp, v: 0, moved: 0 }
	silent = false
}

function onPointerMove(e) {
	if (!drag) return
	const a = angleAt(e)
	let d = a - drag.last
	if (d > 180) d -= 360
	if (d < -180) d += 360
	const dt = Math.max(e.timeStamp - drag.t, 1)
	drag.v = drag.v * 0.6 + (d / dt) * 0.4
	drag.moved += Math.abs(d)
	drag.last = a
	drag.t = e.timeStamp
	state.rot += d
	render()
}

function onPointerUp() {
	if (!drag) return
	const { v, moved } = drag
	drag = null
	if (Math.abs(v) > 0.25) spin(Math.sign(v), Math.min(Math.max(Math.abs(v) / 1.2, 0.6), 1.6))
	else if (moved < 4) spin()
}

// ───────── 選項編輯 ─────────
function addDraft() {
	const lines = draft.value.split(/\n/).map(s => s.trim()).filter(Boolean)
	if (!lines.length) return
	const room = MAX_ITEMS - items.value.length
	if (room <= 0) return toast.show(`最多 ${MAX_ITEMS} 個選項`)
	closeResult()
	const added = lines.slice(0, room)
	items.value.push(...added)
	keys.value.push(...added.map(() => nextKey++))
	draft.value = ''
}

// 貼上多行文字時，一次新增多個選項
function onPaste(e) {
	const text = e.clipboardData.getData('text')
	if (!text.includes('\n')) return
	e.preventDefault()
	draft.value += text
	addDraft()
}

function removeItem(i) {
	if (items.value.length <= 1) return
	closeResult()
	spliceItem(i)
}

function updateItem(i, value) {
	items.value[i] = value
}

function trimItem(i) {
	const value = items.value[i].trim()
	if (value) items.value[i] = value
	else removeItem(i)
}

// ───────── 側欄分頁：選項／範本 ─────────
const tab = ref('items')
const itemsPane = ref(null)
const templatesPane = ref(null)

watch(tab, value => {
	deleting.value = -1
	nextTick(() => {
		const pane = value === 'items' ? itemsPane.value : templatesPane.value
		animate(pane.children, { opacity: [0, 1], x: [value === 'items' ? -14 : 14, 0], delay: stagger(30), duration: dur(320), ease: 'out(3)' })
	})
})

// ───────── 範本 ─────────
const savingPreset = ref(false)
const presetName = ref('')
const deleting = ref(-1)
let deleteTimer = 0

const sameItems = list => list.length === items.value.length && list.every((v, i) => v === items.value[i])
const preview = list => list.slice(0, 3).join('、') + (list.length > 3 ? '…' : '')
const nameTaken = computed(() => templates.value.some(p => p.name === presetName.value.trim()))

function applyPreset(preset) {
	if (spinning.value || sameItems(preset.items)) return
	closeResult()
	setItems([...preset.items])
	tab.value = 'items'
	toast.show(`已套用「${preset.name}」`)
}

function openSavePreset() {
	savingPreset.value = true
	presetName.value = ''
	nextTick(() => root.value.querySelector('.save-preset input')?.focus())
}

function savePreset() {
	const name = presetName.value.trim()
	if (!name || items.value.length < 2) return
	const preset = { name, items: [...items.value] }
	const index = templates.value.findIndex(p => p.name === name)
	if (index >= 0) templates.value[index] = preset
	else templates.value.unshift(preset)
	savingPreset.value = false
	toast.show(index >= 0 ? `已更新「${name}」` : `已儲存「${name}」`)
}

// 刪除需要按兩次：第一次變成「確定刪除？」，3 秒內再按一次才刪
function askDelete(index) {
	clearTimeout(deleteTimer)
	if (deleting.value !== index) {
		deleting.value = index
		deleteTimer = setTimeout(() => { deleting.value = -1 }, 3000)
		return
	}
	deleting.value = -1
	const [removed] = templates.value.splice(index, 1)
	toast.show(`已刪除「${removed.name}」`)
}

function restoreBuiltIns() {
	templates.value.push(...missingBuiltIns.value.map(p => ({ name: p.name, items: [...p.items] })))
	toast.show('已還原內建範本')
}

function shuffleItems() {
	closeResult()
	const order = shuffle(items.value.map((_, i) => i))
	items.value = order.map(i => items.value[i])
	keys.value = order.map(i => keys.value[i])
}

async function share() {
	const url = `${location.origin}${location.pathname}#/wheel?items=${encodeItems(items.value)}`
	try {
		await navigator.clipboard.writeText(url)
		toast.show('已複製分享連結')
	} catch {
		prompt('複製這個連結分享給朋友：', url)
	}
}

const onItemEnter = (el, done) => animate(el, { opacity: [0, 1], x: [-12, 0], duration: 300, ease: 'out(3)', onComplete: done })
const onItemLeave = (el, done) => animate(el, { opacity: 0, x: 24, height: 0, marginBottom: 0, duration: 260, ease: 'in(2)', onComplete: done })

// 結果卡：彈出後逐字出現
function onResultEnter(el, done) {
	animate(el, { opacity: [0, 1], scale: [0.6, 1], ease: profile.value.pop(), onComplete: done })
	const text = el.querySelector('.result-text')
	const { chars } = splitText(text, { chars: true })
	animate(chars, { opacity: [0, 1], y: ['0.5em', 0], rotate: [stagger([-10, 10]), 0], delay: stagger(45, { start: 120 }), duration: dur(600), ease: 'out(3)' })
}
const onResultLeave = (el, done) => animate(el, { opacity: 0, scale: 0.9, duration: 180, ease: 'in(2)', onComplete: done })

// ───────── 生命週期 ─────────
// 開啟分享連結時載入選項（已在轉盤頁時也要生效）
watch(() => route.query.items, value => {
	const shared = value && decodeItems(String(value))
	if (!shared?.length) return
	spinAnim?.pause()
	spinning.value = false
	closeResult()
	setItems(shared)
	toast.show('已載入分享的選項')
	router.replace({ query: {} })
}, { immediate: true })

onMounted(() => {
	scope = createScope({
		root: root.value,
		mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' },
	}).add(self => {
		silent = true
		if (self.matches.reduce) {
			render()
			return
		}
		// 轉盤從側邊旋轉進場
		animate(state, { rot: [state.rot - 140, state.rot], duration: 1500, ease: 'out(4)', onUpdate: render, onComplete: () => { silent = false } })
		animate('.wheel-wrap', { scale: [0.86, 1], opacity: [0, 1], duration: 1100, ease: 'out(4)' })
		animate('.side > *', { opacity: [0, 1], y: [20, 0], delay: stagger(90, { start: 200 }), duration: 700, ease: 'out(3)' })
		// 遊樂園的燈泡追逐；轉動時加速
		bulbAnim = animate('.bulb', {
			opacity: [0.3, 1],
			duration: 260,
			delay: stagger(60),
			loop: true,
			alternate: true,
			ease: 'inOut(2)',
		})
	})
	render()
})

onBeforeUnmount(() => {
	spinAnim?.pause()
	scope?.revert()
})
</script>

<template>
	<div ref="root" class="page">
		<header class="tool-head">
			<p class="eyebrow">01 — The Wheel</p>
			<h1 class="display">轉盤</h1>
			<p>按中間的按鈕轉動，或直接抓住轉盤左右拖，用力一甩就會轉起來。</p>
		</header>

		<div class="tool">
			<div class="stage">
				<div class="wheel-wrap">
					<svg
						ref="svg"
						class="wheel"
						:class="{ 'has-winner': winner !== null, 'is-spinning': spinning }"
						viewBox="-540 -540 1080 1080"
						role="img"
						:aria-label="`轉盤，共 ${items.length} 個選項`"
						@pointerdown="onPointerDown"
						@pointermove="onPointerMove"
						@pointerup="onPointerUp"
						@pointercancel="onPointerUp"
					>
						<defs>
							<radialGradient id="wheel-sheen" cx="35%" cy="25%" r="80%">
								<stop offset="0%" stop-color="#fff" stop-opacity="0.22" />
								<stop offset="55%" stop-color="#fff" stop-opacity="0" />
								<stop offset="100%" stop-color="#000" stop-opacity="0.22" />
							</radialGradient>
						</defs>

						<circle r="512" class="rim-outer" />
						<circle r="486" class="rim" />
						<circle
							v-for="i in BULBS"
							:key="'b' + i"
							class="bulb"
							r="9"
							:cx="499 * Math.cos((i * 360 / BULBS) * Math.PI / 180)"
							:cy="499 * Math.sin((i * 360 / BULBS) * Math.PI / 180)"
						/>

						<g ref="disc">
							<path
								v-for="(s, i) in segments"
								:key="s.key"
								class="slice"
								:class="{ win: winner === i }"
								:d="s.path"
								:style="{ fill: `var(--w${s.color})` }"
							/>
							<template v-if="segments.length > 1">
								<line
									v-for="s in segments"
									:key="'d' + s.key"
									class="divider"
									x1="0"
									y1="0"
									:x2="s.divider.split(' ')[0]"
									:y2="s.divider.split(' ')[1]"
								/>
							</template>
							<g v-for="s in segments" :key="'l' + s.key" :transform="`rotate(${s.mid})`">
								<text
									class="slice-label"
									:x="R - 44"
									y="0"
									text-anchor="end"
									dominant-baseline="central"
									:style="{ fill: `var(--w${s.color}-ink)`, fontSize: s.fontSize + 'px' }"
								>{{ s.label }}</text>
							</g>
						</g>

						<circle r="462" class="sheen" fill="url(#wheel-sheen)" />
						<circle r="104" class="hub-ring" />
						<circle r="88" class="hub" />
						<text class="hub-label" y="4" text-anchor="middle" dominant-baseline="central">{{ hubLabel }}</text>

						<g ref="pointer" class="pointer">
							<path d="M0 -420 L-34 -500 A36 36 0 1 1 34 -500 Z" />
							<circle cy="-506" r="12" class="pointer-pin" />
						</g>
					</svg>

					<button class="hub-btn" :disabled="!canSpin" aria-label="轉動轉盤" @click="spin()"></button>

					<div class="result-layer">
						<Transition :css="false" @enter="onResultEnter" @leave="onResultLeave">
							<div v-if="result" class="result" role="status">
								<p class="eyebrow">天意所指</p>
								<p class="result-text display">{{ result }}</p>
								<div class="result-actions">
									<button class="btn btn--primary" @click="spin()">再轉一次</button>
									<button class="btn btn--ghost" @click="closeResult">關閉</button>
								</div>
								<p v-if="removeAfter && items.length > 2" class="result-note">關閉後會從轉盤移除</p>
							</div>
						</Transition>
					</div>
				</div>

				<button class="btn btn--primary btn--big spin-btn" :disabled="!canSpin" @click="spin()">
					{{ spinning ? '轉動中…' : '轉動' }}
				</button>
				<p v-if="items.length < 2" class="hint">至少需要兩個選項</p>
			</div>

			<aside class="side">
				<section class="panel">
					<div class="panel-title">
						<div class="tabs" role="tablist">
							<button role="tab" :aria-selected="tab === 'items'" @click="tab = 'items'">選項 <span class="count">{{ items.length }}</span></button>
							<button role="tab" :aria-selected="tab === 'templates'" @click="tab = 'templates'">範本 <span class="count">{{ templates.length }}</span></button>
						</div>
						<button v-if="tab === 'templates' && !savingPreset" class="btn btn--sm" :disabled="items.length < 2 || spinning" @click="openSavePreset">＋ 儲存目前選項</button>
					</div>

					<div v-show="tab === 'items'" ref="itemsPane" class="pane">
						<TransitionGroup tag="ol" class="items" :css="false" @enter="onItemEnter" @leave="onItemLeave">
							<li v-for="(item, i) in items" :key="keys[i]">
								<span class="swatch" :style="{ background: `var(--w${segments[i]?.color})` }"></span>
								<input
									class="item-input"
									:value="item"
									:disabled="spinning"
									maxlength="40"
									:aria-label="`選項 ${i + 1}`"
									@input="updateItem(i, $event.target.value)"
									@blur="trimItem(i)"
								>
								<button class="remove" :disabled="spinning" :aria-label="`刪除 ${item}`" @click="removeItem(i)">×</button>
							</li>
						</TransitionGroup>

						<form class="add" @submit.prevent="addDraft">
							<input v-model="draft" class="field" placeholder="新增選項，可貼上多行" maxlength="400" :disabled="spinning" @paste="onPaste">
							<button class="btn btn--sm" :disabled="spinning || !draft.trim()">新增</button>
						</form>

						<div class="tools-row">
							<button class="btn btn--ghost btn--sm" :disabled="spinning" @click="shuffleItems">洗牌</button>
							<button class="btn btn--ghost btn--sm" @click="share">分享連結</button>
						</div>
					</div>

					<div v-show="tab === 'templates'" ref="templatesPane" class="pane tpl-pane">
						<form v-if="savingPreset" class="save-preset" @submit.prevent="savePreset">
							<p class="label">把目前的 {{ items.length }} 個選項存成範本</p>
							<div class="save-row">
								<input v-model="presetName" class="field" placeholder="輸入範本名稱" maxlength="20" @keydown.esc="savingPreset = false">
								<button class="btn btn--sm btn--primary" :disabled="!presetName.trim()">{{ nameTaken ? '覆蓋' : '儲存' }}</button>
								<button type="button" class="btn btn--sm btn--ghost" @click="savingPreset = false">取消</button>
							</div>
							<p v-if="nameTaken" class="save-hint">已有同名範本，儲存會覆蓋它</p>
						</form>

						<p v-if="!templates.length" class="empty">還沒有範本。編好選項後按「＋ 儲存目前選項」，之後就能一鍵套用。</p>
						<div v-else class="tpl-list">
							<div v-for="(p, i) in templates" :key="p.name" class="tpl" :class="{ active: sameItems(p.items) }">
								<button class="tpl-apply" :disabled="spinning" @click="applyPreset(p)">
									<span class="tpl-name">{{ p.name }}</span>
									<span class="tpl-meta">{{ p.items.length }} 項｜{{ preview(p.items) }}</span>
								</button>
								<button
									class="tpl-delete"
									:class="{ confirm: deleting === i }"
									:aria-label="`刪除範本 ${p.name}`"
									@click="askDelete(i)"
								>
									<template v-if="deleting === i">確定刪除？</template>
									<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
									</svg>
								</button>
							</div>
						</div>

						<button v-if="missingBuiltIns.length" class="restore" @click="restoreBuiltIns">還原內建範本（{{ missingBuiltIns.length }}）</button>
					</div>
				</section>

				<section class="panel settings">
					<div class="panel-title"><h2>設定</h2></div>
					<div class="row">
						<span class="label">轉動時間</span>
						<div class="segmented">
							<button v-for="s in DURATIONS" :key="s" :aria-pressed="seconds === s" @click="seconds = s">{{ s }}s</button>
						</div>
					</div>
					<label class="switch">
						<span>抽中後從轉盤移除</span>
						<input v-model="removeAfter" type="checkbox">
					</label>
				</section>

				<HistoryList :items="history" @clear="history = []" />
			</aside>
		</div>
	</div>
</template>

<style scoped>
.stage {
	gap: 22px;
	align-content: start;
}

.wheel-wrap {
	position: relative;
	width: min(100%, 580px, calc(100svh - 300px));
	min-width: min(100%, 300px);
	aspect-ratio: 1;
}

.wheel {
	display: block;
	width: 100%;
	height: 100%;
	overflow: visible;
	touch-action: none;
	cursor: grab;
	user-select: none;
}

.wheel:active { cursor: grabbing; }

.rim-outer { fill: var(--wheel-rim-2); }
.rim { fill: var(--wheel-rim); }
.bulb { fill: var(--wheel-rim-2); }
.slice { transition: opacity 0.4s; }
.has-winner .slice:not(.win) { opacity: 0.32; }
.divider { stroke: var(--wheel-divider); stroke-width: 2; }

.slice-label {
	font-family: var(--font-body);
	font-weight: 700;
	letter-spacing: 0.02em;
	pointer-events: none;
}

.sheen { pointer-events: none; }
.hub-ring { fill: var(--wheel-rim); }
.hub { fill: var(--wheel-hub); }

.hub-label {
	fill: var(--wheel-hub-ink);
	font-family: var(--font-display);
	font-weight: var(--font-display-weight);
	font-size: 46px;
	letter-spacing: 0.08em;
	pointer-events: none;
}

.pointer path { fill: var(--accent); stroke: var(--wheel-rim-2); stroke-width: 4; }
.pointer-pin { fill: var(--wheel-hub); }

.hub-btn {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 20%;
	height: 20%;
	border: 0;
	border-radius: 50%;
	background: transparent;
	transform: translate(-50%, -50%);
}

.hub-btn:disabled { cursor: default; }

/* 主題差異 */
:root[data-theme="noir"] .bulb { fill: #f2d993; opacity: 0.9 !important; r: 5; }
:root[data-theme="noir"] .rim-outer { fill: #3b2f15; }
:root[data-theme="noir"] .wheel { filter: drop-shadow(0 40px 50px rgba(0, 0, 0, 0.55)); }

:root[data-theme="washi"] .bulb, :root[data-theme="washi"] .sheen { display: none; }
:root[data-theme="washi"] .rim-outer { fill: transparent; stroke: var(--ink); stroke-width: 2; }
:root[data-theme="washi"] .rim { fill: var(--bg); stroke: var(--ink); stroke-width: 3; }
:root[data-theme="washi"] .slice { stroke: var(--ink); stroke-width: 2; }
:root[data-theme="washi"] .slice-label { font-family: var(--font-display); }
:root[data-theme="washi"] .hub { stroke: var(--ink); stroke-width: 3; }
:root[data-theme="washi"] .hub-ring { fill: var(--accent); }
:root[data-theme="washi"] .pointer path { fill: var(--accent); stroke: var(--ink); stroke-width: 3; }

:root[data-theme="carnival"] .bulb {
	fill: #ffe066;
	filter: drop-shadow(0 0 8px rgba(255, 224, 102, 0.95));
}
:root[data-theme="carnival"] .slice { stroke: var(--ink); stroke-width: 5; }
:root[data-theme="carnival"] .rim { stroke: var(--ink); stroke-width: 6; }
:root[data-theme="carnival"] .hub { stroke: var(--ink); stroke-width: 6; }
:root[data-theme="carnival"] .pointer path { stroke: var(--ink); stroke-width: 6; }
:root[data-theme="carnival"] .wheel { filter: drop-shadow(10px 12px 0 rgba(43, 26, 63, 0.9)); }

/* 結果卡 */
.result-layer {
	position: absolute;
	inset: 0;
	z-index: 5;
	display: grid;
	place-items: center;
	pointer-events: none;
}

.result {
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	width: min(92%, 380px);
	padding: 26px 24px 22px;
	border: var(--border-w) solid var(--line-strong);
	border-radius: var(--radius-lg);
	background: var(--surface);
	box-shadow: var(--shadow), 0 30px 80px -20px rgba(0, 0, 0, 0.5);
	text-align: center;
}

.result-text {
	font-size: clamp(36px, 7vw, 60px);
	color: var(--accent);
	word-break: break-word;
}

.result-text :deep(*) { display: inline-block; }

.result-actions {
	display: flex;
	gap: 10px;
	margin-top: 6px;
}

.result-note {
	font-size: 12px;
	color: var(--ink-faint);
}

:root[data-theme="noir"] .result { background: #0f241c; }
:root[data-theme="washi"] .result { background: var(--surface); border-width: 1px; box-shadow: 0 20px 60px -30px rgba(31, 27, 22, 0.5); }

.spin-btn { min-width: 220px; }

.hint {
	font-size: 13px;
	color: var(--accent);
}

/* 選項列表 */
.count {
	margin-left: 6px;
	font-family: var(--font-mono);
	font-size: 12px;
	color: var(--ink-faint);
}

/* 分頁 */
.tabs {
	display: flex;
	gap: 18px;
}

.tabs button {
	position: relative;
	padding: 4px 0 6px;
	border: 0;
	background: transparent;
	color: var(--ink-faint);
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.06em;
	transition: color 0.2s;
}

.tabs button::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 2px;
	border-radius: 2px;
	background: var(--accent);
	transform: scaleX(0);
	transition: transform 0.3s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.tabs button[aria-selected="true"] { color: var(--ink); }
.tabs button[aria-selected="true"]::after { transform: scaleX(1); }

.tpl-pane {
	max-height: 440px;
	overflow-y: auto;
	padding-right: 4px;
}

.items {
	display: flex;
	flex-direction: column;
	max-height: 320px;
	margin: 0 0 12px;
	padding: 0 4px 0 0;
	overflow-y: auto;
	list-style: none;
}

.items li {
	/* 左側留白，避免色點的外框被 overflow 切掉 */
	padding-left: 3px;
	display: grid;
	grid-template-columns: 12px 1fr 32px;
	align-items: center;
	gap: 10px;
	overflow: hidden;
	border-bottom: 1px solid var(--line);
}

:root[data-theme="carnival"] .items li { border-bottom-color: rgba(43, 26, 63, 0.15); }

.swatch {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	box-shadow: 0 0 0 1px var(--line-strong);
}

.item-input {
	min-width: 0;
	height: 40px;
	border: 0;
	background: transparent;
	outline: none;
}

.item-input:focus { color: var(--accent); }

.remove {
	width: 32px;
	height: 32px;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--ink-faint);
	font-size: 20px;
	line-height: 1;
}

.remove:hover:not(:disabled) { background: var(--accent-soft); color: var(--accent); }

.add {
	display: flex;
	gap: 8px;
}

.add .btn { flex: none; }

.tools-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 12px;
}

.save-preset {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 18px;
	padding: 14px;
	border: var(--border-w) dashed var(--line-strong);
	border-radius: var(--radius);
	background: var(--accent-soft);
}

.save-row {
	display: flex;
	gap: 8px;
}

.save-row .btn { flex: none; }

.save-hint {
	font-size: 12px;
	color: var(--accent);
}

.restore {
	margin-top: 12px;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--ink-faint);
	font-size: 13px;
	text-decoration: underline;
	text-underline-offset: 3px;
}

.restore:hover { color: var(--accent); }

.empty {
	font-size: 13px;
	color: var(--ink-faint);
}

.tpl-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.tpl {
	display: flex;
	align-items: stretch;
	overflow: hidden;
	border: var(--border-w) solid var(--line);
	border-radius: var(--radius);
	background: var(--surface-2);
	transition: border-color 0.2s, background 0.2s;
}

.tpl:hover { border-color: var(--line-strong); }

.tpl.active {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.tpl-apply {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
	padding: 9px 12px;
	border: 0;
	background: transparent;
	text-align: left;
}

.tpl-name { font-weight: 700; font-size: 14px; }
.tpl.active .tpl-name { color: var(--accent); }

.tpl-meta {
	overflow: hidden;
	font-size: 12px;
	color: var(--ink-faint);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tpl-delete {
	flex: none;
	display: grid;
	place-items: center;
	min-width: 44px;
	padding: 0 10px;
	border: 0;
	border-left: 1px solid var(--line);
	background: transparent;
	color: var(--ink-faint);
	font-size: 12px;
	white-space: nowrap;
	transition: background 0.2s, color 0.2s;
}

.tpl-delete svg { width: 18px; height: 18px; }
.tpl-delete:hover { color: var(--accent); }

.tpl-delete.confirm {
	background: var(--accent);
	color: var(--accent-ink);
}

:root[data-theme="carnival"] .tpl { border-color: var(--ink); }
:root[data-theme="carnival"] .tpl-delete { border-left-color: var(--ink); }

.settings {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.settings .panel-title { margin-bottom: 0; }
</style>
