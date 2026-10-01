// 圓角立方體幾何（單位尺寸 100px）：6 個平面 + 12 條四分之一圓柱邊 + 8 個球角
// 邊由數條窄長條拼成圓弧，角由數片圓片交疊近似成球，外輪廓就不會出現缺口
export const R = 12
export const A = 50 - R

const STRIPS = 4
const STRIP_W = 2 * R * Math.tan(Math.PI / (4 * STRIPS)) * 1.35
const BALL = R * 2 * 0.98

const add = (a, b) => a.map((v, i) => v + b[i])
const mul = (a, k) => a.map(v => v * k)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = a => mul(a, 1 / Math.hypot(...a))

// 以 u、v、n 為元素的 x、y、z 軸，中心移到 p
const matrix = (u, v, n, p) => `matrix3d(${[...u, 0, ...v, 0, ...n, 0, ...p, 1].map(x => +x.toFixed(4)).join(',')})`

const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
// 長度多 2px 伸進球角，避免接縫
const stripSize = { width: `${2 * A + 2}px`, height: `${STRIP_W}px`, margin: `${-STRIP_W / 2}px 0 0 ${-A - 1}px` }
const ballSize = { width: `${BALL}px`, height: `${BALL}px`, margin: `${-BALL / 2}px 0 0 ${-BALL / 2}px` }

export const ROUND_PARTS = []

AXES.forEach((u, ax) => {
	const [b1, b2] = AXES.filter((_, i) => i !== ax)
	for (const s1 of [-1, 1]) {
		for (const s2 of [-1, 1]) {
			const axis = add(mul(b1, s1 * A), mul(b2, s2 * A))
			for (let k = 0; k < STRIPS; k++) {
				const t = (k + 0.5) / STRIPS * Math.PI / 2
				const n = add(mul(b1, s1 * Math.cos(t)), mul(b2, s2 * Math.sin(t)))
				ROUND_PARTS.push({ kind: k === 1 || k === 2 ? 'strip mid' : 'strip', style: { ...stripSize, transform: matrix(u, cross(n, u), n, add(axis, mul(n, R))) } })
			}
		}
	}
})

for (const sx of [-1, 1]) {
	for (const sy of [-1, 1]) {
		for (const sz of [-1, 1]) {
			const c = [sx * A, sy * A, sz * A]
			for (const n of [...AXES, unit([sx, sy, sz])]) {
				const u = unit(cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]))
				ROUND_PARTS.push({ kind: 'ball', style: { ...ballSize, transform: matrix(u, cross(n, u), n, c) } })
			}
		}
	}
}
