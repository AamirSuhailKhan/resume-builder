const fs = require('fs');
const path = require('path');

const hooks = ['useEffect', 'useState', 'useMemo', 'useCallback', 'useRef'];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.next' && f !== 'extension') {
      walk(dirPath, callback);
    } else if (!isDirectory && (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx'))) {
      callback(dirPath);
    }
  });
}

walk(process.cwd(), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  let usedHooks = [];
  hooks.forEach(hook => {
    const regex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    if (regex.test(content)) {
      usedHooks.push(hook);
    }
  });
  
  if (usedHooks.length === 0) return;
  
  // Find all explicitly imported hooks
  let importedHooks = new Set();
  const importRegex = /import\s+(?:{[^}]*}|React|\*\s+as\s+React)\s+from\s+['"]react['"];?/g;
  let match;
  let hasReactImport = false;
  
  while ((match = importRegex.exec(content)) !== null) {
    hasReactImport = true;
    const body = match[0];
    if (body.includes('{')) {
      const extracted = body.substring(body.indexOf('{') + 1, body.indexOf('}')).split(',').map(s => s.trim());
      extracted.forEach(h => importedHooks.add(h));
    }
  }
  
  let missingHooks = usedHooks.filter(h => !importedHooks.has(h));
  
  missingHooks = missingHooks.filter(h => {
    const reactDotHook = new RegExp(`React\\.${h}\\s*\\(`, 'g');
    const standaloneHook = new RegExp(`(?<!React\\.)\\b${h}\\s*\\(`, 'g');
    return standaloneHook.test(content);
  });

  if (missingHooks.length > 0) {
    console.log(`Fixing ${filePath.replace(process.cwd(), '')} - missing: ${missingHooks.join(', ')}`);
    const newImportLine = `import { ${missingHooks.join(', ')} } from "react";\n`;
    
    // Add "use client" if it's a TSX file and doesn't have it
    let clientAdded = false;
    if (filePath.endsWith('.tsx') && !content.includes('"use client"') && !content.includes("'use client'")) {
      content = `"use client";\n\n` + content;
      clientAdded = true;
    }

    if (hasReactImport) {
      // Find the existing react import and replace it or append to it
      // Let's just prepend the new import at the top (after 'use client' if exists)
      const parts = content.split(/\r?\n/);
      let insertIndex = 0;
      if (parts[0].includes('use client')) {
        insertIndex = 1;
      }
      parts.splice(insertIndex, 0, newImportLine);
      content = parts.join('\n');
    } else {
      const parts = content.split(/\r?\n/);
      let insertIndex = 0;
      if (parts[0].includes('use client')) {
        insertIndex = 1;
      }
      parts.splice(insertIndex, 0, newImportLine);
      content = parts.join('\n');
    }
  } else {
    // Hooks are used and imported, just ensure 'use client' for TSX files
    if (filePath.endsWith('.tsx') && !content.includes('"use client"') && !content.includes("'use client'")) {
      content = `"use client";\n\n` + content;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});
