// 把轉盤選項編碼成網址安全的 base64（支援中文）
export function encodeItems(items) {
	const bytes = new TextEncoder().encode(JSON.stringify(items))
	let binary = ''
	bytes.forEach(b => { binary += String.fromCharCode(b) })
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeItems(text) {
	try {
		const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
		const list = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0))))
		if (Array.isArray(list)) return list.map(String).filter(Boolean).slice(0, 60)
	} catch {}
	return null
}
