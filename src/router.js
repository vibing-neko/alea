import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// github.io 沒有 SPA fallback，使用 hash 模式避免重新整理時 404
export default createRouter({
	history: createWebHashHistory(),
	routes: [
		{ path: '/', component: HomeView, meta: { title: 'Alea — 讓天意替你決定' } },
		{ path: '/wheel', component: () => import('./views/WheelView.vue'), meta: { title: '轉盤 · Alea' } },
		{ path: '/coin', component: () => import('./views/CoinView.vue'), meta: { title: '硬幣 · Alea' } },
		{ path: '/dice', component: () => import('./views/DiceView.vue'), meta: { title: '骰子 · Alea' } },
		{ path: '/:pathMatch(.*)*', redirect: '/' },
	],
	scrollBehavior: () => ({ top: 0 }),
})
