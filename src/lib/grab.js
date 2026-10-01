import { animate, utils } from 'animejs'

// 抓起元素讓它跟著指標移動，放開時回報位置與甩出的速度（px/ms）
// moved 很小時視為點擊
export function createGrab({ canGrab, onGrab, onMove, onRelease }) {
	let g = null
	let layer = 1

	function down(e, index, el) {
		if (!canGrab()) return
		e.preventDefault()
		el.setPointerCapture(e.pointerId)
		// 拿起的那個浮到最上層
		el.parentElement.style.zIndex = ++layer
		g = { index, el, x0: e.clientX, y0: e.clientY, x: 0, y: 0, vx: 0, vy: 0, t: e.timeStamp, moved: 0 }
		animate(el, { scale: 1.12, duration: 220, ease: 'out(3)' })
		onGrab?.(g)
	}

	function move(e) {
		if (!g) return
		const x = e.clientX - g.x0
		const y = e.clientY - g.y0
		const dt = Math.max(e.timeStamp - g.t, 1)
		g.vx = g.vx * 0.5 + (x - g.x) / dt * 0.5
		g.vy = g.vy * 0.5 + (y - g.y) / dt * 0.5
		g.moved = Math.max(g.moved, Math.hypot(x, y))
		onMove?.(g, x - g.x, y - g.y)
		g.x = x
		g.y = y
		g.t = e.timeStamp
		utils.set(g.el, { x, y })
	}

	function up(e) {
		if (!g) return
		const info = g
		g = null
		// 放開前停住超過 80ms，就當作沒有甩的速度
		if (e.timeStamp - info.t > 80) info.vx = info.vy = 0
		info.speed = Math.hypot(info.vx, info.vy)
		info.tap = info.moved < 6
		onRelease(info)
	}

	return { down, move, up }
}
