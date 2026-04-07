const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Protect button texts or solid bg texts by temporarily replacing them
  // If a class string contains bg-brand, bg-accent, bg-red, bg-green, bg-black, bg-[#10b981] etc...
  // Wait, regex to find class="..." or className="..." and modify inside it.
  
  // We'll replace text-white with text-slate-900 
  // ONLY IF the same line does NOT contain "bg-brand", "bg-accent", "bg-red-", "bg-green-", "bg-black", "bg-[#"
  let lines = content.split('\n');
  for (let i=0; i<lines.length; i++) {
    let line = lines[i];
    
    // Switch slates
    line = line.replace(/text-slate-300/g, 'text-slate-600');
    line = line.replace(/text-slate-400/g, 'text-slate-500');
    
    // Replace text-white if no solid bg is detected on the line
    if (line.includes('text-white') && !line.match(/bg-(brand|accent|red|green|blue|black|indigo|purple|emerald)/) && !line.includes('text-white"')) {
        // Note: we might accidentally hit some buttons.
        // Actually, Rambus uses lots of white backgrounds. Let's just turn text-white into text-slate-900
        line = line.replace(/text-white/g, 'text-slate-900');
    }
    
    // Replace dark backgrounds that were hardcoded
    line = line.replace(/bg-\[\#0A0C15\]/g, 'bg-slate-50');
    line = line.replace(/bg-\[\#0D1015\]/g, 'bg-white');
    line = line.replace(/bg-\[\#060A08\]/g, 'bg-white');
    line = line.replace(/bg-\[\#07090C\]/g, 'bg-slate-50');
    line = line.replace(/bg-\[\#1C2035\]/g, 'bg-white');
    
    lines[i] = line;
  }
  
  content = lines.join('\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      // Don't touch page.tsx because we already designed it perfectly 
      if (!fullPath.endsWith('src\\app\\page.tsx') && !fullPath.endsWith('src/app/page.tsx')) {
         processFile(fullPath);
      }
    }
  }
}

traverseDir(path.join(__dirname, 'src', 'app', '(dashboard)'));
traverseDir(path.join(__dirname, 'src', 'components'));
traverseDir(path.join(__dirname, 'src', 'app', '(auth)'));
