const fs = require('fs');
const path = require('path');

const postsDir = 'src/content/posts';
const WPM = 220;

function analyze() {
  const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.mdx'));
  const results = [];

  files.forEach(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple way to strip frontmatter and count words
    // Assumes frontmatter is between --- and ---
    const parts = content.split('---');
    let body = content;
    if (parts.length >= 3) {
      body = parts.slice(2).join('---');
    }
    
    const words = body.trim().split(/\s+/).filter(word => word.length > 0).length;
    const minutes = Math.ceil(words / WPM);
    const slug = file.replace('.mdx', '');
    
    results.push({ slug, words, minutes });
  });

  results.sort((a, b) => a.words - b.words);

  console.log('Post Slug | Word Count | Est. Minutes');
  console.log('--- | --- | ---');
  results.forEach(res => {
    console.log(`${res.slug} | ${res.words} | ${res.minutes}`);
  });

  if (results.length > 0) {
    const shortest = results[0];
    const longest = results[results.length - 1];
    console.log('\nSummary:');
    console.log(`Shortest: ${shortest.slug} (${shortest.words} words)`);
    console.log(`Longest: ${longest.slug} (${longest.words} words)`);
  }
}

analyze();
