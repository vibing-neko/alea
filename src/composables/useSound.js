import { usePersisted } from './usePersisted.js'

// 全部音效都用 Web Audio API 即時合成，不需要音檔
const muted = usePersisted('alea:muted', false)
let ctx = null
let noiseBuffer = null

function audio() {
	if (!ctx) {
		const AC = window.AudioContext || window.webkitAudioContext
		if (!AC) return null
		ctx = new AC()
	}
	if (ctx.state === 'suspended') ctx.resume()
	return ctx
}

function tone({ freq, type = 'sine', dur = 0.12, gain = 0.2, when = 0, to }) {
	const ac = audio()
	if (!ac) return
	const t = ac.currentTime + when
	const osc = ac.createOscillator()
	const amp = ac.createGain()
	osc.type = type
	osc.frequency.setValueAtTime(freq, t)
	if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
	amp.gain.setValueAtTime(0.0001, t)
	amp.gain.exponentialRampToValueAtTime(gain, t + 0.004)
	amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
	osc.connect(amp).connect(ac.destination)
	osc.start(t)
	osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.05, gain = 0.3, freq = 2000, q = 1, type = 'bandpass', when = 0 }) {
	const ac = audio()
	if (!ac) return
	if (!noiseBuffer) {
		noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate)
		const data = noiseBuffer.getChannelData(0)
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
	}
	const t = ac.currentTime + when
	const src = ac.createBufferSource()
	const filter = ac.createBiquadFilter()
	const amp = ac.createGain()
	src.buffer = noiseBuffer
	filter.type = type
	filter.frequency.value = freq
	filter.Q.value = q
	amp.gain.setValueAtTime(gain, t)
	amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
	src.connect(filter).connect(amp).connect(ac.destination)
	src.start(t)
	src.stop(t + dur + 0.02)
}

let lastTick = 0

const sounds = {
	tick() {
		const now = performance.now()
		if (now - lastTick < 28) return
		lastTick = now
		noise({ dur: 0.025, gain: 0.35, freq: 3200, q: 2 })
		tone({ freq: 1500, type: 'square', dur: 0.02, gain: 0.03 })
	},
	whoosh() {
		noise({ dur: 0.35, gain: 0.12, freq: 900, q: 0.7 })
	},
	ping() {
		tone({ freq: 2093, dur: 0.7, gain: 0.08 })
		tone({ freq: 3136, dur: 0.45, gain: 0.04 })
		tone({ freq: 5274, dur: 0.25, gain: 0.02 })
	},
	// 硬幣在地上晃動時的細碎金屬聲
	chink() {
		tone({ freq: 2400 + Math.random() * 900, dur: 0.07, gain: 0.05 })
		noise({ dur: 0.02, gain: 0.12, freq: 5000, q: 2 })
	},
	clack() {
		noise({ dur: 0.06, gain: 0.45, freq: 1400, q: 1.4 })
		noise({ dur: 0.04, gain: 0.25, freq: 2600, q: 2, when: 0.05 })
	},
	chime() {
		;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
			tone({ freq, type: 'triangle', dur: 0.5, gain: 0.09, when: i * 0.08 })
		})
	},
	pop() {
		tone({ freq: 420, to: 880, type: 'sine', dur: 0.09, gain: 0.08 })
	},
}

const play = Object.fromEntries(Object.entries(sounds).map(([name, fn]) => [name, () => {
	if (!muted.value) fn()
}]))

export function useSound() {
	const toggle = () => {
		muted.value = !muted.value
		if (!muted.value) play.pop()
	}
	return { muted, toggle, ...play }
}
