import { words } from './src/words.js';
import fs from 'fs';

function removeDuplicates(array) {
  const uniqueItems = new Set();
  return array.filter(item => {
    const isDuplicate = uniqueItems.has(item);
    uniqueItems.add(item);
    return !isDuplicate;
  });
}

console.log('Original words:', words.length);
const uniqueWords = removeDuplicates(words);
console.log('Unique words:', uniqueWords.length);

const updatedContent = `export const words = ${JSON.stringify(uniqueWords, null, 2)};`;
fs.writeFileSync('src/words.js', updatedContent, 'utf-8');