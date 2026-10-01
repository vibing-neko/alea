import { spring } from 'animejs'

// 每個主題的名稱、色票（給切換器與轉場用）以及動態個性
export const THEMES = [
	{
		id: 'noir',
		name: '午夜賭場',
		en: 'Noir',
		meta: '#0d1f1a',
		swatch: ['#0d1f1a', '#c9a45c', '#8c2f2f'],
		bg: '#0d1f1a',
		ink: '#efe6d2',
		accent: '#c9a45c',
		font: '"Cormorant Garamond", "Noto Serif TC", serif',
		motion: {
			spinEase: 'out(4)',
			land: () => spring({ bounce: 0.18, duration: 520 }),
			pop: () => spring({ bounce: 0.25, duration: 600 }),
			toss: 1,
		},
	},
	{
		id: 'washi',
		name: '紙本籤詩',
		en: 'Washi',
		meta: '#f4efe4',
		swatch: ['#f4efe4', '#1f1b16', '#c23b22'],
		bg: '#f4efe4',
		ink: '#1f1b16',
		accent: '#c23b22',
		font: '"LXGW WenKai TC", "Noto Serif TC", serif',
		motion: {
			spinEase: 'out(3)',
			land: () => spring({ bounce: 0.06, duration: 420 }),
			pop: () => spring({ bounce: 0.1, duration: 500 }),
			toss: 0.8,
		},
	},
	{
		id: 'carnival',
		name: '遊樂園',
		en: 'Carnival',
		meta: '#fff1d6',
		swatch: ['#e63946', '#fff1d6', '#1d7fd1'],
		bg: '#fff1d6',
		ink: '#2b1a3f',
		accent: '#e63946',
		font: '"Shrikhand", "Noto Sans TC", sans-serif',
		motion: {
			spinEase: 'out(3.4)',
			land: () => spring({ bounce: 0.5, duration: 760 }),
			pop: () => spring({ bounce: 0.55, duration: 800 }),
			toss: 1.25,
		},
	},
]

export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0]
