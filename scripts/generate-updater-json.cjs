const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to generate latest.json for Tauri updater
 * Usage: node scripts/generate-updater-json.js <version> <signature_file_or_string> <asset_url> [notes]
 */

const version = process.argv[2];
const signatureInput = process.argv[3];
const assetUrl = process.argv[4];
const notes = process.argv[5] || "Bug fixes and performance improvements.";

if (!version || !signatureInput || !assetUrl) {
  console.error("Usage: node scripts/generate-updater-json.js <version> <signature_file_or_string> <asset_url> [notes]");
  process.exit(1);
}

let signature = signatureInput;
if (fs.existsSync(signatureInput)) {
  signature = fs.readFileSync(signatureInput, 'utf8').trim();
}

const updateData = {
  version: version.startsWith('v') ? version : `v${version}`,
  notes: notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-x86_64": {
      signature: signature,
      url: assetUrl
    },
    "darwin-aarch64": {
      signature: signature,
      url: assetUrl
    }
  }
};

const outputPath = path.join(process.cwd(), 'updater', 'latest.json');
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(updateData, null, 2));

console.log(`Successfully generated ${outputPath}`);
console.log(`Version: ${updateData.version}`);
