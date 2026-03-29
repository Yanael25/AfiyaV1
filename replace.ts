import * as fs from 'fs';
import * as path from 'path';

const replacements = [
  { from: /#F5F0E8/gi, to: '#FAFAF8' },
  { from: /#E8E0D0/gi, to: '#ECECEA' },
  { from: /#F0EAE0/gi, to: '#F2F2F0' },
];

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const { from, to } of replacements) {
        content = content.replace(from, to);
      }
      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory('./src/screens');
