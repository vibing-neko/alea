import { createTimeline, stagger, spring } from 'animejs'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function make(parent, className, html = '') {
	const node = document.createElement('div')
	node.className = className
	node.innerHTML = html
	parent.appendChild(node)
	return node
}

function makePanels(layer, count, color) {
	const wrap = make(layer, 'theme-curtain__panels')
	return Array.from({ length: count }, (_, i) => {
		const panel = make(wrap, 'theme-curtain__panel')
		panel.style.background = color(i)
		return panel
	})
}

function makeLabel(layer, theme) {
	const label = make(layer, `theme-curtain__label is-${theme.id}`, `<small>${theme.en}</small><span>${theme.name}</span>`)
	label.style.setProperty('--label-font', theme.font)
	return label
}

// Noir：金邊黑幕從中間往兩側落下，再升起
function goldBlinds(layer, theme, origin, apply) {
	const panels = makePanels(layer, 7, () => theme.bg)
	panels.forEach(p => { p.style.transformOrigin = '50% 0%' })
	const label = makeLabel(layer, theme)
	return createTimeline()
		.add(panels, { scaleY: [0, 1], duration: 560, ease: 'inOut(3)', delay: stagger(60, { from: 'center' }) })
		.add(label, { opacity: [0, 1], translateY: [14, 0], letterSpacing: ['0.6em', '0.2em'], duration: 420, ease: 'out(3)' }, '-=160')
		.call(apply)
		.add(label, { opacity: 0, translateY: -10, duration: 260, ease: 'in(2)' }, '+=260')
		.set(panels, { transformOrigin: '50% 100%' })
		.add(panels, { scaleY: 0, duration: 560, ease: 'inOut(3)', delay: stagger(60, { from: 'center' }) }, '-=80')
}

// Washi：從點擊位置像墨水一樣暈開，蓋上朱印
function inkSpread(layer, theme, origin, apply) {
	const disc = make(layer, 'theme-curtain__disc')
	disc.style.background = theme.bg
	const seal = make(layer, 'theme-curtain__seal', '<span>籤</span>')
	const label = makeLabel(layer, theme)
	const { x, y } = origin
	const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
	const state = { r: 0 }
	const draw = () => { disc.style.clipPath = `circle(${state.r}px at ${x}px ${y}px)` }
	draw()
	return createTimeline()
		.add(state, { r: radius, duration: 820, ease: 'inOut(2.6)', onUpdate: draw })
		.add(seal, { opacity: [0, 1], scale: [2.2, 1], rotate: [-18, -6], duration: 340, ease: 'out(4)' }, '-=220')
		.add(label, { opacity: [0, 1], translateY: [10, 0], duration: 360, ease: 'out(3)' }, '-=160')
		.call(apply)
		.add(layer, { opacity: 0, duration: 480, ease: 'out(2)' }, '+=360')
}

// Carnival：紅白條紋布幕 Q 彈落下，再拉開
function tentCurtain(layer, theme, origin, apply) {
	const panels = makePanels(layer, 10, i => i % 2 ? '#fff1d6' : '#e63946')
	panels.forEach(p => p.classList.add('is-tent'))
	const label = makeLabel(layer, theme)
	return createTimeline()
		.add(panels, { translateY: ['-110%', '0%'], ease: spring({ bounce: 0.38, duration: 620 }), delay: stagger(38) })
		.add(label, { opacity: [0, 1], scale: [0.3, 1], rotate: [-10, -3], ease: spring({ bounce: 0.55, duration: 560 }) }, '-=420')
		.call(apply)
		.add(label, { opacity: 0, scale: 0.6, duration: 220, ease: 'in(2)' }, '+=320')
		.add(panels, { translateY: '-110%', duration: 520, ease: 'in(3)', delay: stagger(40, { from: 'center' }) }, '-=80')
}

const effects = { noir: goldBlinds, washi: inkSpread, carnival: tentCurtain }

export function playThemeTransition(theme, origin, apply) {
	if (reduced()) {
		apply()
		return Promise.resolve()
	}
	const layer = make(document.body, 'theme-curtain')
	const timeline = effects[theme.id](layer, theme, origin, apply)
	return new Promise(resolve => {
		timeline.then(() => {
			layer.remove()
			resolve()
		})
	})
}
