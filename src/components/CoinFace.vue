<script setup>
// 硬幣的一面；漸層與浮雕濾鏡定義在 CoinView 的共用 <defs>
defineProps({ side: String })

const BEADS = 60
const BEAD_GAP = (2 * Math.PI * 78 / BEADS).toFixed(3)

// 正面的梅花：五片花瓣與花蕊
const petals = Array.from({ length: 5 }, (_, k) => {
	const rad = (-90 + k * 72) * Math.PI / 180
	return { x: 100 + 19 * Math.cos(rad), y: 100 + 19 * Math.sin(rad) }
})
const stamens = Array.from({ length: 10 }, (_, k) => {
	const rad = (k * 36 - 90) * Math.PI / 180
	return { x1: 100 + 6 * Math.cos(rad), y1: 100 + 6 * Math.sin(rad), x2: 100 + 13 * Math.cos(rad), y2: 100 + 13 * Math.sin(rad) }
})

// 反面的月桂葉：沿圓弧排列，左右對稱
const leaves = []
for (let k = 0; k < 7; k++) {
	const deg = 112 + k * 14
	const rad = deg * Math.PI / 180
	const x = 100 + 54 * Math.cos(rad)
	const y = 100 + 54 * Math.sin(rad)
	leaves.push({ x, y, rotate: deg + 90 - 28 })
	leaves.push({ x: 200 - x, y, rotate: -(deg + 90 - 28) })
}
</script>

<template>
	<svg viewBox="0 0 200 200" class="coin-svg" aria-hidden="true">
		<circle cx="100" cy="100" r="100" fill="url(#coin-metal)" />
		<circle cx="100" cy="100" r="86" fill="url(#coin-lathe)" />
		<!-- 凸起外緣：左上受光、右下背光 -->
		<circle cx="100" cy="100" r="93" fill="none" stroke="url(#coin-rim)" stroke-width="13" />
		<circle cx="100" cy="100" r="86.2" fill="none" stroke="url(#coin-bevel)" stroke-width="1.6" />

		<g filter="url(#coin-emboss)" class="relief">
			<circle cx="100" cy="100" r="78" fill="none" class="beads" :stroke-dasharray="`0 ${BEAD_GAP}`" />

			<template v-if="side === 'front'">
				<text class="arc"><textPath href="#coin-arc-top" startOffset="50%" text-anchor="middle">ALEA · IACTA · EST</textPath></text>
				<text class="arc"><textPath href="#coin-arc-bottom" startOffset="50%" text-anchor="middle">MMXXVI</textPath></text>
				<circle v-for="(pt, k) in petals" :key="'p' + k" class="petal" :cx="pt.x" :cy="pt.y" r="17" />
				<circle cx="100" cy="100" r="8" class="pistil" />
				<g class="stamens">
					<line v-for="(st, k) in stamens" :key="'s' + k" :x1="st.x1" :y1="st.y1" :x2="st.x2" :y2="st.y2" />
					<circle v-for="(st, k) in stamens" :key="'d' + k" :cx="st.x2" :cy="st.y2" r="1.7" />
				</g>
				<path class="star" d="M42 100 l3 -7 l3 7 l-3 7 z M152 100 l3 -7 l3 7 l-3 7 z" />
			</template>

			<template v-else>
				<text class="arc"><textPath href="#coin-arc-top" startOffset="50%" text-anchor="middle">FORTUNA</textPath></text>
				<ellipse
					v-for="(leaf, k) in leaves"
					:key="k"
					class="leaf"
					:cx="leaf.x"
					:cy="leaf.y"
					rx="7.5"
					ry="3.2"
					:transform="`rotate(${leaf.rotate} ${leaf.x} ${leaf.y})`"
				/>
				<text class="numeral" x="100" y="90" text-anchor="middle" dominant-baseline="central">1</text>
				<text class="arc small" x="100" y="148" text-anchor="middle">ALEA</text>
			</template>
		</g>
	</svg>
</template>

<style scoped>
.coin-svg {
	display: block;
	width: 100%;
	height: 100%;
}

.relief { fill: var(--coin-relief); }
.beads { stroke: var(--coin-relief); stroke-width: 4.4; stroke-linecap: round; }

.arc {
	font-family: var(--coin-arc-font);
	font-weight: 700;
	font-size: 15px;
	letter-spacing: 3px;
}

.arc.small { font-size: 12px; letter-spacing: 4px; }

.numeral {
	font-family: var(--coin-numeral-font);
	font-weight: 700;
	font-size: 82px;
}

.petal { stroke: var(--coin-deep); stroke-opacity: 0.35; stroke-width: 1; }
.pistil { fill: var(--coin-mid); }
.stamens line { stroke: var(--coin-deep); stroke-opacity: 0.55; stroke-width: 1.2; }
.stamens circle { fill: var(--coin-deep); fill-opacity: 0.55; }
</style>
