import { words } from './src/words.js';
import * as fs from 'fs';

function removeDuplicates(array) {
  const uniqueItems = new Set();
  const duplicates = new Set();
  
  const uniqueArray = array.filter(item => {
    if (uniqueItems.has(item)) {
      duplicates.add(item);
      return false;
    } else {
      uniqueItems.add(item);
      return true;
    }
  });

  return { uniqueArray, duplicates };
}

const { uniqueArray, duplicates } = removeDuplicates(words);
const updatedContent = `export const words = ${JSON.stringify(uniqueArray, null, 2)};`;
fs.writeFileSync('src/words.js', updatedContent, 'utf-8');

console.log('Original words:', words.length);
console.log('Unique words:', uniqueArray.length);
console.log('Duplicates:', Array.from(duplicates));
console.log('Done');