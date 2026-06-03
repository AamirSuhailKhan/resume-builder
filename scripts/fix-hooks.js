/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const hooks = ['useEffect', 'useState', 'useMemo', 'useCallback', 'useRef'];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.next') {
      walk(dirPath, callback);
    } else if (!isDirectory && (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx'))) {
      callback(dirPath);
    }
  });
}

let fixedFiles = [];
let clientAdded = [];

walk(process.cwd(), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  let usedHooks = [];
  hooks.forEach(hook => {
    // Basic regex: boundary, hookName, opening paren.
    // e.g. \buseEffect\(
    const regex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    if (regex.test(content)) {
      usedHooks.push(hook);
    }
  });
  
  if (usedHooks.length === 0) return; // No hooks used
  
  // Check if we already have `import ... from 'react'`
  const reactImportRegex = /import\s+({[^}]*}|\*\s+as\s+React|React)\s+from\s+['"]react['"];?/g;
  let hasReactImport = false;
  let match;
  let existingHooks = new Set();
  
  while ((match = reactImportRegex.exec(content)) !== null) {
    hasReactImport = true;
    const importBody = match[1];
    if (importBody.startsWith('{')) {
      const extracted = importBody.replace(/[{}]/g, '').split(',').map(s => s.trim());
      extracted.forEach(h => existingHooks.add(h));
    }
  }
  
  // Determine which ones are missing
  let missingHooks = usedHooks.filter(h => !existingHooks.has(h));
  
  // Exclude cases where it's used as React.useEffect
  missingHooks = missingHooks.filter(h => {
    const reactDotHook = new RegExp(`React\\.${h}`, 'g');
    if (reactDotHook.test(content) && content.match(new RegExp(`\\b${h}\\s*\\(`, 'g')).length === content.match(reactDotHook)?.length) {
      return false; // it's exclusively used as React.hook
    }
    return true;
  });

  if (missingHooks.length > 0) {
    if (hasReactImport) {
      // Modify the first react import
      content = content.replace(/import\s+({[^}]*})\s+from\s+['"]react['"];?/, (fullMatch, body) => {
        let items = body.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        missingHooks.forEach(h => { if (!items.includes(h)) items.push(h); });
        return `import { ${items.join(', ')} } from "react";`;
      });
      
      // If the above didn't match (e.g. `import React from 'react'`)
      if (!content.includes(`import { ${missingHooks[0]}`)) {
         const newImport = `import { ${missingHooks.join(', ')} } from "react";\n`;
         // find last import or start
         content = content.replace(/import\s+React\s+from\s+['"]react['"];?/, (match) => {
           return match + '\n' + newImport;
         });
      }
    } else {
      // Add new react import
      const newImport = `import { ${missingHooks.join(', ')} } from "react";\n`;
      
      // Insert after "use client" if it exists, otherwise at the top of imports
      if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
         content = content.replace(/^(["']use client["'];?\s*)/, `$1\n${newImport}`);
      } else {
         content = newImport + content;
      }
    }
  }
  
  // Ensure "use client" for components (tsx)
  if (filePath.endsWith('.tsx') && !content.includes('"use client"') && !content.includes("'use client'")) {
    content = `"use client";\n\n` + content;
    clientAdded.push(filePath.replace(process.cwd(), ''));
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    fixedFiles.push({ file: filePath.replace(process.cwd(), ''), missingHooks });
  }
});

console.log(JSON.stringify({ fixedFiles, clientAdded }, null, 2));
