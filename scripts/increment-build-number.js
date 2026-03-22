import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Ensure the bundle and macOS objects exist
if (!config.bundle) config.bundle = {};
if (!config.bundle.macOS) config.bundle.macOS = {};

// Get current bundleVersion or default to 0
let currentBuild = parseInt(config.bundle.macOS.bundleVersion) || 0;
const nextBuild = currentBuild + 1;

config.bundle.macOS.bundleVersion = nextBuild.toString();

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`Incremented macOS bundleVersion to ${nextBuild}`);
