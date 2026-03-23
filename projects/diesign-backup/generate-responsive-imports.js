const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'src/images');
const outputFile = path.join(__dirname, 'src/js/generated-responsive-imports.js');
const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (exts.includes(path.extname(fullPath).toLowerCase())) {
      results.push(fullPath);
    }
  });
  return results;
}

const images = walk(imagesDir);

const imports = images.map((img, i) => {
  // Get relative path from src/js
  const relPath = path.relative(path.join(__dirname, 'src/js'), img).replace(/\\/g, '/');
  return `import img${i} from '../${relPath}?sizes[]=480&sizes[]=640&sizes[]=960&sizes[]=1200&sizes[]=1440&sizes[]=1600&sizes[]=1920&sizes[]=2560&sizes[]=3840';`;
});

fs.writeFileSync(outputFile, imports.join('\n') + '\n');
console.log(`Generated ${imports.length} responsive imports in ${outputFile}`);