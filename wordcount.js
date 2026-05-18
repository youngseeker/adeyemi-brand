import fs from 'fs';
import path from 'path';

const WORDS_PER_MINUTE = 200;

function calculateReadingTime(content) {
  const cleanContent = content.replace(/---[\s\S]*?---/, ''); // Remove frontmatter
  const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

const dir = './src/content/posts';
const files = fs.readdirSync(dir).filter(file => file.endsWith('.mdx'));

const results = files.map(file => {
  const fullPath = path.join(dir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const readingTime = calculateReadingTime(content);
  return { file, readingTime };
});

results.forEach(res => console.log(`${res.file}: ${res.readingTime} min`));

const times = results.map(r => r.readingTime);
console.log(`\nRange: ${Math.min(...times)} - ${Math.max(...times)} min`);
