import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base 用相對路徑，部署到 github.io 根目錄或子路徑都能運作
export default defineConfig({
	base: './',
	plugins: [vue()],
})
