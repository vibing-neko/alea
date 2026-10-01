import { ref, watch } from 'vue'

// 自動同步到 localStorage 的 ref；讀寫失敗（無痕模式等）時就只存在記憶體
export function usePersisted(key, initial) {
	let value = initial
	try {
		const raw = localStorage.getItem(key)
		if (raw !== null) value = JSON.parse(raw)
	} catch {}
	const state = ref(value)
	watch(state, v => {
		try {
			localStorage.setItem(key, JSON.stringify(v))
		} catch {}
	}, { deep: true })
	return state
}
