const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commitHash = execSync('git rev-parse HEAD').toString().trim();
const commitCount = execSync('git rev-list --count HEAD').toString().trim();

const outputPath = path.join(__dirname, 'src', 'build.js');
const content = `export const commitHash = '${commitHash}';\nexport const commitCount = ${commitCount};\n`;
fs.writeFileSync(outputPath, content, 'utf8');
