#!/usr/bin/env node
/**
 * Generate MP3 audio for each Turkish word via 11Labs TTS.
 * Requires: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (optional, 11Labs will use a default).
 * Output: audio/*.mp3 (one per word), filenames = slug(tr).mp3
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { words } from '../vocabulary/words.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const AUDIO_DIR = join(ROOT, 'audio');

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // 11Labs default Adam

if (!apiKey) {
	console.error('Missing ELEVENLABS_API_KEY');
	process.exit(1);
}

/** Slug for filename: lowercase, spaces -> hyphen, keep Turkish letters and alphanumeric */
function slug(text) {
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '') // keep Latin extended (Turkish)
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '') || 'word';
}

async function generateOne(word, voice, outPath) {
	const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Accept': 'audio/mpeg',
			'Content-Type': 'application/json',
			'xi-api-key': apiKey
		},
		body: JSON.stringify({
			text: word,
			model_id: 'eleven_multilingual_v2',
			voice_settings: {
				stability: 0.95,
				similarity_boost: 0.85
			}
		})
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`11Labs API ${res.status}: ${t}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(outPath, buf);
}

async function main() {
	mkdirSync(AUDIO_DIR, { recursive: true });

	const manifest = {};
	for (let i = 0; i < words.length; i++) {
		const { tr } = words[i];
		const name = slug(tr);
		const filename = `${name}.mp3`;
		const outPath = join(AUDIO_DIR, filename);
		manifest[tr] = filename;
		if (existsSync(outPath)) {
			console.log(`[${i + 1}/${words.length}] ${tr} (skip, exists)`);
			continue;
		}
		try {
			await generateOne(tr, voiceId, outPath);
			console.log(`[${i + 1}/${words.length}] ${tr} -> ${filename}`);
		} catch (e) {
			console.error(`Failed ${tr}:`, e.message);
		}
	}

	const manifestPath = join(AUDIO_DIR, 'manifest.json');
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
	console.log('Wrote', manifestPath);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
