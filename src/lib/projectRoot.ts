import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const hasProjectMarkers = (candidate: string) =>
	existsSync(path.join(candidate, 'src', 'content')) && existsSync(path.join(candidate, 'package.json'));

const resolveProjectRoot = () => {
	const fromModule = fileURLToPath(import.meta.url);
	const candidates = [
		process.cwd(),
		fileURLToPath(new URL('../..', import.meta.url)),
		fileURLToPath(new URL('../../..', import.meta.url)),
		fileURLToPath(new URL('../../../..', import.meta.url)),
		path.dirname(path.dirname(fromModule)),
	];

	for (const candidate of candidates) {
		if (hasProjectMarkers(candidate)) return candidate;
	}

	return process.cwd();
};

export const projectRoot = resolveProjectRoot();
