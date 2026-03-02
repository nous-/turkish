#!/usr/bin/env node
/**
 * Upload generated audio files to Firebase Storage.
 * Requires: GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON) and
 *           FIREBASE_STORAGE_BUCKET (e.g. your-project.appspot.com).
 * Reads from audio/ (output of generate-audio.js) and uploads to gs://bucket/audio/*.mp3
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const AUDIO_DIR = join(ROOT, 'audio');

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

if (!credentialsPath || !bucketName) {
	console.error('Set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_STORAGE_BUCKET');
	process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));

initializeApp({
	credential: cert(serviceAccount),
	storageBucket: bucketName
});

const bucket = getStorage().bucket();
const remotePrefix = 'audio';

async function uploadAll() {
	const files = readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3'));
	if (files.length === 0) {
		console.log('No .mp3 files in audio/');
		return;
	}
	for (const file of files) {
		const localPath = join(AUDIO_DIR, file);
		const dest = `${remotePrefix}/${file}`;
		await bucket.upload(localPath, {
			destination: dest,
			metadata: { contentType: 'audio/mpeg' }
		});
		console.log('Uploaded', file, '->', dest);
	}
	// Public URL pattern: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/audio%2FFILE?alt=media
	const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o`;
	console.log('\nBase URL for audio (encode path):', baseUrl);
	console.log('Example:', `${baseUrl}/${encodeURIComponent(remotePrefix + '/' + (files[0] || ''))}?alt=media`);
}

uploadAll().catch((e) => {
	console.error(e);
	process.exit(1);
});
