// 使用 crypto.getRandomValues 產生公平的亂數（拒絕取樣，避免取模偏差）
const buf = new Uint32Array(1)

// 回傳 [0, max) 的整數
export function randomInt(max) {
	const limit = Math.floor(0x100000000 / max) * max
	do {
		crypto.getRandomValues(buf)
	} while (buf[0] >= limit)
	return buf[0] % max
}

// 回傳 [0, 1) 的浮點數
export function randomFloat() {
	crypto.getRandomValues(buf)
	return buf[0] / 0x100000000
}

export function shuffle(list) {
	const arr = [...list]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = randomInt(i + 1)
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}
