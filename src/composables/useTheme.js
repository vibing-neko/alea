import { computed } from 'vue'
import { usePersisted } from './usePersisted.js'
import { THEMES, themeById } from '../lib/themes.js'
import { playThemeTransition } from '../lib/themeTransition.js'

const theme = usePersisted('alea:theme', document.documentElement.dataset.theme)
if (!THEMES.some(t => t.id === theme.value)) theme.value = 'noir'
let busy = false

function apply(id) {
	theme.value = id
	document.documentElement.dataset.theme = id
	document.querySelector('meta[name=theme-color]')?.setAttribute('content', themeById(id).meta)
}
apply(theme.value)

export function useTheme() {
	const current = computed(() => themeById(theme.value))

	async function switchTheme(id, origin) {
		if (busy || id === theme.value) return
		busy = true
		try {
			await playThemeTransition(themeById(id), origin, () => apply(id))
		} finally {
			busy = false
		}
	}

	return { theme, current, themes: THEMES, switchTheme }
}
