const fs = require('fs');
const glob = require('child_process').execSync('find app -name "*.tsx" -o -name "*.ts"').toString().split('\n').filter(Boolean);

let count = 0;
for (const file of glob) {
  if (file === 'app/lib/time.ts') continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace toLocaleString
  content = content.replace(/new Date\((.*?)\)\.toLocaleString\(\)/g, 'formatDateTime($1)');
  // Replace toLocaleDateString
  content = content.replace(/new Date\((.*?)\)\.toLocaleDateString\(\)/g, 'formatDate($1)');
  // Special case if there are empty ones like new Date().toLocaleString()
  content = content.replace(/new Date\(\)\.toLocaleString\(\)/g, 'formatDateTime(new Date())');
  content = content.replace(/new Date\(\)\.toLocaleDateString\(\)/g, 'formatDate(new Date())');

  if (content !== original) {
    // Need to import formatDateTime/formatDate
    const needsTimeImports = [];
    if (content.includes('formatDateTime(')) needsTimeImports.push('formatDateTime');
    if (content.includes('formatDate(')) needsTimeImports.push('formatDate');

    if (needsTimeImports.length > 0 && !content.includes('from "@/app/lib/time"')) {
      // Find last import
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIdx = i;
        }
      }
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, `import { ${needsTimeImports.join(', ')} } from "@/app/lib/time";`);
        content = lines.join('\n');
      } else {
        content = `import { ${needsTimeImports.join(', ')} } from "@/app/lib/time";\n` + content;
      }
    } else if (needsTimeImports.length > 0) {
      // It already imports from "@/app/lib/time" but we might need to add formatDateTime/formatDate to it.
      // Let's just be careful here, I'll regex replace the import statement.
      let timeImportMatch = content.match(/import \{([^}]+)\} from "@\/app\/lib\/time"/);
      if (timeImportMatch) {
        let existing = timeImportMatch[1];
        needsTimeImports.forEach(imp => {
          if (!existing.includes(imp)) {
            existing += `, ${imp}`;
          }
        });
        content = content.replace(timeImportMatch[0], `import {${existing}} from "@/app/lib/time"`);
      }
    }

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    count++;
  }
}
console.log(`Fixed ${count} files.`);
