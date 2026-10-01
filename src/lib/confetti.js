import { animate, utils } from 'animejs'

// 從 (x, y) 噴出彩紙，顏色取自目前主題的 --confetti-* 變數
export function burst(x, y, count = 42) {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
	const style = getComputedStyle(document.documentElement)
	const colors = [1, 2, 3, 4].map(i => style.getPropertyValue(`--confetti-${i}`).trim())
	const layer = document.createElement('div')
	layer.className = 'confetti'
	const pieces = Array.from({ length: count }, () => {
		const piece = document.createElement('i')
		piece.style.left = `${x}px`
		piece.style.top = `${y}px`
		piece.style.background = utils.randomPick(colors)
		piece.style.width = `${utils.random(6, 12)}px`
		piece.style.height = `${utils.random(8, 16)}px`
		if (Math.random() < 0.3) piece.style.borderRadius = '50%'
		layer.appendChild(piece)
		return piece
	})
	document.body.appendChild(layer)
	animate(pieces, {
		x: () => utils.random(-280, 280),
		y: [
			{ to: () => utils.random(-340, -140), duration: 520, ease: 'out(3)' },
			{ to: () => utils.random(160, 460), duration: 1200, ease: 'in(1.8)' },
		],
		rotate: () => utils.random(-900, 900),
		rotateX: () => utils.random(-720, 720),
		opacity: { to: 0, delay: 1200, duration: 500 },
		duration: 1720,
		onComplete: () => layer.remove(),
	})
}
