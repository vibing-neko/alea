<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { animate, cleanInlineStyles } from 'animejs'
import AppHeader from './components/AppHeader.vue'
import AppToast from './components/AppToast.vue'
import { useMotion } from './composables/useMotion.js'

const route = useRoute()
const { dur } = useMotion()

watch(() => route.meta.title, title => {
	if (title) document.title = title
})

// 換頁過場
function onEnter(el, done) {
	animate(el, {
		opacity: [0, 1],
		translateY: [18, 0],
		duration: dur(560),
		ease: 'out(4)',
		onComplete: self => {
			cleanInlineStyles(self)
			done()
		},
	})
}

function onLeave(el, done) {
	animate(el, {
		opacity: 0,
		translateY: -10,
		duration: dur(200),
		ease: 'in(2)',
		onComplete: done,
	})
}
</script>

<template>
	<AppHeader />
	<main>
		<RouterView v-slot="{ Component }">
			<Transition :css="false" mode="out-in" @enter="onEnter" @leave="onLeave">
				<component :is="Component" />
			</Transition>
		</RouterView>
	</main>
	<AppToast />
</template>
