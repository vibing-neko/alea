import { ref, computed } from 'vue'
import { useTheme } from './useTheme.js'

const query = matchMedia('(prefers-reduced-motion: reduce)')
const reduced = ref(query.matches)
query.addEventListener('change', e => { reduced.value = e.matches })

// 目前主題的動態參數；使用者偏好減少動態時，時長大幅縮短
export function useMotion() {
	const { current } = useTheme()
	const profile = computed(() => current.value.motion)
	const dur = ms => reduced.value ? Math.round(ms * 0.15) : ms
	return { reduced, profile, dur }
}
