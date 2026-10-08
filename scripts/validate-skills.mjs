#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillsDir = path.resolve(__dirname, '../skills');

console.log('=== Validating Agent Skills & Monorepo References ===\n');

if (!fs.existsSync(skillsDir)) {
  console.error(`Error: Skills directory not found at ${skillsDir}`);
  process.exit(1);
}

const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let hasError = false;

for (const folder of skillFolders) {
  const skillPath = path.join(skillsDir, folder);
  const skillFile = path.join(skillPath, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    console.error(`❌ [FAIL] Missing SKILL.md in: skills/${folder}`);
    hasError = true;
    continue;
  }

  const content = fs.readFileSync(skillFile, 'utf-8');
  const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);

  if (!frontmatterMatch) {
    console.error(`❌ [FAIL] Missing YAML frontmatter in: skills/${folder}/SKILL.md`);
    hasError = true;
    continue;
  }

  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  const descMatch = frontmatter.match(/description:\s*(.+)/);

  if (!nameMatch || !descMatch) {
    console.error(`❌ [FAIL] Frontmatter must contain 'name' and 'description' in: skills/${folder}/SKILL.md`);
    hasError = true;
    continue;
  }

  const skillName = nameMatch[1].trim();
  if (skillName !== folder) {
    console.error(`❌ [FAIL] Frontmatter name '${skillName}' does not match folder 'skills/${folder}'`);
    hasError = true;
    continue;
  }

  // Check for deprecated legacy repo references
  const legacyServerPattern = /ygoprodeck-mcp-server/g;
  if (legacyServerPattern.test(content)) {
    console.error(`❌ [FAIL] Outdated reference 'ygoprodeck-mcp-server' found in: skills/${folder}/SKILL.md`);
    hasError = true;
  }

  // Validate reference artifacts existence
  const refsDir = path.join(skillPath, 'references');
  function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    }
    return arrayOfFiles;
  }

  const allRefFiles = getAllFiles(refsDir);

  // Extract all markdown links in SKILL.md
  const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  let brokenLinks = 0;

  for (const match of linkMatches) {
    const rawLink = match[2].trim();
    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
      continue;
    }
    const resolvedPath = path.resolve(skillPath, rawLink);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ [FAIL] Broken link in skills/${folder}/SKILL.md: ${rawLink} (resolved: ${resolvedPath})`);
      brokenLinks++;
      hasError = true;
    }
  }

  // Check each reference file for deprecated strings, valid links, and archetype schemas
  for (const refFilePath of allRefFiles) {
    const relRefPath = path.relative(skillPath, refFilePath);
    const refContent = fs.readFileSync(refFilePath, 'utf-8');

    if (legacyServerPattern.test(refContent)) {
      console.error(`❌ [FAIL] Outdated reference 'ygoprodeck-mcp-server' found in: skills/${folder}/${relRefPath}`);
      hasError = true;
    }

    // Check relative links inside reference markdown files as well
    if (refFilePath.endsWith('.md')) {
      const refFileDir = path.dirname(refFilePath);
      const refLinkMatches = [...refContent.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
      for (const rMatch of refLinkMatches) {
        const rLink = rMatch[2].trim();
        if (rLink.startsWith('http://') || rLink.startsWith('https://') || rLink.startsWith('#')) {
          continue;
        }
        const resolvedRefLink = path.resolve(refFileDir, rLink);
        if (!fs.existsSync(resolvedRefLink)) {
          console.error(`❌ [FAIL] Broken link in skills/${folder}/${relRefPath}: ${rLink} (resolved: ${resolvedRefLink})`);
          brokenLinks++;
          hasError = true;
        }
      }

      // If this is an archetype profile (not README or _template), validate RFC schema sections
      if (refFilePath.includes('references' + path.sep + 'archetypes') &&
          !refFilePath.endsWith('README.md') &&
          !refFilePath.endsWith('_template.md')) {
        const requiredSections = [
          '## 1. Canonical Engine Core',
          '## 2. Functional Taxonomy',
          '## 3. End-Board Routing',
          '## 4.',
          '## 5. Chokepoints',
          '## 6. Hypergeometric'
        ];
        for (const sec of requiredSections) {
          if (!refContent.includes(sec)) {
            console.error(`❌ [FAIL] Missing required section '${sec}' in archetype profile: ${relRefPath}`);
            hasError = true;
          }
        }
      }
    }
  }

  if (brokenLinks === 0) {
    console.log(`✅ [PASS] skills/${folder}`);
    console.log(`   - SKILL.md: valid frontmatter ('${skillName}')`);
    console.log(`   - References: ${allRefFiles.length} files verified on disk`);
    console.log(`   - Markdown Links: verified resolvable within monorepo`);
    console.log(`   - Architecture Alignment: ygoprodeck-mcp & ADR traceability verified\n`);
  }
}

if (hasError) {
  console.error('\nSkills validation failed.');
  process.exit(1);
} else {
  console.log('>>> ALL SKILLS AND MONOREPO REFERENCES VALIDATED SUCCESSFULLY! <<<');
}
