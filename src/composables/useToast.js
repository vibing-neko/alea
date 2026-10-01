import { ref } from 'vue'

const message = ref('')
let timer = 0

export function useToast() {
	const show = text => {
		message.value = text
		clearTimeout(timer)
		timer = setTimeout(() => { message.value = '' }, 2200)
	}
	return { message, show }
}
