<script>
	import { words } from '$lib/vocabulary.js';
	import successUrl from '$lib/assets/success.mp3?url';
	import wrongUrl from '$lib/assets/wrong.mp3?url';

	let round = $state(null);
	let selectedLeft = $state(null);
	let matchedPairs = $state([]); // [leftIndex, rightIndex] for each correct match
	let wrongFlash = $state(null); // { left, right } to flash red briefly
	let gridVisible = $state(true);
	let refilledCells = $state({ left: [], right: [] });
	let currentStreak = $state(0);
	let bestStreak = $state(0); // best "correct in a row" this round
	let roundStartedAt = $state(null); // set on first tap, used to check 30s
	let roundComplete = $state(false); // 30s elapsed, show summary

	const AUDIO_BASE = (() => {
		const env = typeof import.meta.env !== 'undefined' && import.meta.env?.PUBLIC_FIREBASE_AUDIO_BASE_URL;
		if (env) return env.replace(/\/?$/, '');
		return 'https://firebasestorage.googleapis.com/v0/b/turkish-a3231.firebasestorage.app/o';
	})();

	function slug(text) {
		return (
			text
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '')
				.replace(/-+/g, '-')
				.replace(/^-|-$/g, '') || 'word'
		);
	}

	function getAudioUrl(turkishWord) {
		const filename = `${slug(turkishWord)}.mp3`;
		const path = `audio/${filename}`;
		return `${AUDIO_BASE}/${encodeURIComponent(path)}?alt=media`;
	}

	const preloadedAudio = new Map(); // only the current on-screen audio words -> HTMLAudioElement (client-only)

	// Lazy-initialized so prerender/SSR doesn't touch Audio
	let successAudio = null;
	let wrongAudio = null;

	function getSuccessAudio() {
		if (typeof Audio === 'undefined') return null;
		if (!successAudio) {
			successAudio = new Audio(successUrl);
			successAudio.preload = 'auto';
			successAudio.load();
		}
		return successAudio;
	}

	function getWrongAudio() {
		if (typeof Audio === 'undefined') return null;
		if (!wrongAudio) {
			wrongAudio = new Audio(wrongUrl);
			wrongAudio.preload = 'auto';
			wrongAudio.load();
		}
		return wrongAudio;
	}

	function preloadAudioForRound(r) {
		if (typeof Audio === 'undefined' || !r?.leftItems) return;
		preloadedAudio.clear();
		for (const item of r.leftItems) {
			if (typeof item === 'object' && item?.type === 'audio' && item.tr) {
				const word = item.tr;
				const url = getAudioUrl(word);
				if (!url) continue;
				const audio = new Audio(url);
				audio.preload = 'auto';
				audio.load();
				preloadedAudio.set(word, audio);
			}
		}
	}

	function playWord(turkishWord) {
		if (typeof Audio === 'undefined') return Promise.resolve();
		const url = getAudioUrl(turkishWord);
		if (!url) return Promise.resolve();
		const cached = preloadedAudio.get(turkishWord);
		const audio = cached || new Audio(url);
		if (cached) audio.currentTime = 0;
		return new Promise((resolve, reject) => {
			audio.onended = () => resolve();
			audio.onerror = () => reject(new Error('Audio failed to load'));
			audio.play().catch(reject);
		});
	}

	function shuffle(arr) {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function pickPairs(wordList, count = 5) {
		const indices = shuffle(wordList.map((_, i) => i)).slice(0, count);
		return indices.map((i) => wordList[i]);
	}

	function createRound(wordList) {
		if (wordList.length < 5) throw new Error('Need at least 5 words');
		const pairs = pickPairs(wordList, 5);
		const leftItems = pairs.map((p) =>
			Math.random() < 0.5 ? p.tr : { type: 'audio', tr: p.tr }
		);
		const rightRaw = pairs.map((p) => p.en);
		const rightPerm = shuffle([0, 1, 2, 3, 4]);
		const rightItems = rightPerm.map((i) => rightRaw[i]);
		const correctMap = rightPerm.map((_, leftIndex) => rightPerm.indexOf(leftIndex));
		return { leftItems, rightItems, correctMap };
	}

	function playSuccess() {
		const a = getSuccessAudio();
		if (a) {
			a.currentTime = 0;
			a.play().catch(() => {});
		}
	}

	function playWrong() {
		const a = getWrongAudio();
		if (a) {
			a.currentTime = 0;
			a.play().catch(() => {});
		}
	}

	function startRound() {
		round = createRound(words);
		selectedLeft = null;
		matchedPairs = [];
		wrongFlash = null;
		refilledCells = { left: [], right: [] };
		currentStreak = 0;
		bestStreak = 0;
		roundStartedAt = null;
		roundComplete = false;
		gridVisible = true;
	}

	function refillSlot(leftIdx, rightIdx) {
		if (!round) return;
		const currentTurks = round.leftItems.map((v) =>
			typeof v === 'object' && v?.tr ? v.tr : v
		);
		const available = words.filter((w) => !currentTurks.includes(w.tr));
		const pool = available.length ? available : words;
		const newPair = pool[Math.floor(Math.random() * pool.length)];

		// Mix: 50/50 word or audio on left; right is always English
		const newLeft =
			Math.random() < 0.5 ? newPair.tr : { type: 'audio', tr: newPair.tr };
		const newRight = newPair.en;

		round = {
			...round,
			leftItems: round.leftItems.map((v, i) => (i === leftIdx ? newLeft : v)),
			rightItems: round.rightItems.map((v, i) => (i === rightIdx ? newRight : v))
		};
		preloadAudioForRound(round);
		matchedPairs = matchedPairs.filter(([l, r]) => !(l === leftIdx && r === rightIdx));
		refilledCells = { left: [leftIdx], right: [rightIdx] };
		setTimeout(() => {
			refilledCells = { left: [], right: [] };
		}, 320);
	}

	function selectLeft(index) {
		if (round && (matchedPairs.some(([l]) => l === index) || roundComplete)) return;
		if (round && roundStartedAt == null) roundStartedAt = Date.now();
		selectedLeft = index;
		wrongFlash = null;
	}

	function selectRight(rightIndex) {
		if (round == null || selectedLeft == null || roundComplete) return;
		if (roundStartedAt == null) roundStartedAt = Date.now();
		const correct = round.correctMap[selectedLeft] === rightIndex;
		if (correct) {
			currentStreak += 1;
			bestStreak = Math.max(bestStreak, currentStreak);
			const leftIdx = selectedLeft;
			const rightIdx = rightIndex;
			matchedPairs = [...matchedPairs, [leftIdx, rightIdx]];
			playSuccess();
			selectedLeft = null;
			const elapsed = (Date.now() - roundStartedAt) / 1000;
			if (elapsed >= 30) {
				roundComplete = true;
			} else {
				setTimeout(() => refillSlot(leftIdx, rightIdx), 400);
			}
		} else {
			currentStreak = 0;
			wrongFlash = { left: selectedLeft, right: rightIndex };
			playWrong();
			setTimeout(() => (wrongFlash = null), 400);
		}
	}

	async function playLeft(turkish) {
		await playWord(turkish);
	}

	function isLeftMatched(leftIdx) {
		return matchedPairs.some(([l]) => l === leftIdx);
	}

	function isRightMatched(rightIdx) {
		return matchedPairs.some(([, r]) => r === rightIdx);
	}

	const rows = [0, 1, 2, 3, 4];

	$effect(() => {
		if (!round && words?.length >= 5) startRound();
	});

	$effect(() => {
		if (round) preloadAudioForRound(round);
	});
</script>

<svelte:head>
	<title>Turkish Matching</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-dvh p-4 box-border">
	{#if round}
		<div
			class="grid grid-cols-2 gap-x-5 gap-y-3 items-stretch w-full max-w-md transition-opacity duration-200 {gridVisible ? 'opacity-100' : 'opacity-0'}"
			role="grid"
		>
			{#each rows as row}
				<button
					type="button"
					class="min-h-14 w-full flex items-center justify-center py-3 px-4 text-base sm:text-lg border border-slate-300 rounded-lg bg-slate-50 text-center transition-opacity duration-300 hover:enabled:bg-slate-100 disabled:cursor-default {selectedLeft === row ? 'bg-slate-200' : ''} {isLeftMatched(row) ? 'opacity-25 pointer-events-none' : ''} {wrongFlash?.left === row ? 'shake ring-2 ring-red-400' : ''} {refilledCells.left.includes(row) ? 'fade-in' : ''}"
					role="gridcell"
					disabled={isLeftMatched(row)}
					onclick={typeof round.leftItems[row] === 'object' && round.leftItems[row].type === 'audio' ? () => { selectLeft(row); playLeft(round.leftItems[row].tr); } : () => selectLeft(row)}
				>
					{#if typeof round.leftItems[row] === 'object' && round.leftItems[row].type === 'audio'}
						<span class="inline-flex items-center justify-center size-8 text-slate-600" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-8">
								<path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
								<path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
							</svg>
						</span>
					{:else}
						<span>{round.leftItems[row]}</span>
					{/if}
				</button>
				<div class="min-h-14 flex items-center justify-center" role="gridcell">
					<button
						type="button"
						class="w-full min-h-14 py-3 px-4 text-base sm:text-lg border rounded-lg flex items-center justify-center text-center transition-all duration-200 disabled:cursor-default {isRightMatched(row) ? 'bg-emerald-200 border-emerald-500 opacity-25 pointer-events-none' : 'bg-slate-50 border-slate-300 hover:enabled:bg-slate-100'} {wrongFlash?.right === row ? 'bg-red-100 border-red-400 ring-2 ring-red-400 shake' : ''} {refilledCells.right.includes(row) ? 'fade-in' : ''}"
						disabled={isRightMatched(row)}
						onclick={() => selectRight(row)}
					>
						{round.rightItems[row]}
					</button>
				</div>
			{/each}
		</div>

		{#if roundComplete}
			<div class="fixed inset-0 flex flex-col items-center justify-center bg-slate-900/60 p-4 z-10" role="dialog" aria-labelledby="round-complete-title">
				<div class="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-sm w-full text-center">
					<h2 id="round-complete-title" class="text-xl font-semibold text-slate-800 mb-2">Time's up!</h2>
					<p class="text-slate-600 mb-6">
						{bestStreak} correct in a row
					</p>
					<button
						type="button"
						onclick={() => startRound()}
						class="w-full py-3 px-5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
					>
						Start again
					</button>
				</div>
			</div>
		{/if}
	{:else}
		<p>Loading…</p>
	{/if}
</div>

<style>
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-6px); }
		40% { transform: translateX(6px); }
		60% { transform: translateX(-4px); }
		80% { transform: translateX(4px); }
	}
	.shake {
		animation: shake 0.4s ease-in-out;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.fade-in {
		opacity: 0;
		animation: fadeIn 0.4s ease-out both;
	}
</style>
