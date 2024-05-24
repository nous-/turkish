<script>
  import { words as wrds } from '@/words';
  import { commitHash, commitCount } from '@/build';

  const words = wrds.map(word => word.split('|'))
  
  function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }
  
  let currentWords;
  let index;
  let turkish = false;
  let currentWord;
  let flip = false;
  newGroup();
  
  function newGroup() {
    currentWords = shuffle(words).slice(0, 100);
    index = -1;
    next();
  }

  function next() {
    index++;
    if (index >= currentWords.length) {
      index = 0;
      currentWords = shuffle(currentWords);
    } else {
      turkish = Math.random() > 0.5;
    }
    currentWord = currentWords[index]
  }
  
  function keydown(e) {
    if (e.code === 'Space' || e.type === 'pointerdown') {
      if (!flip) {
        turkish = !turkish;
        flip = true;
      } else {
        flip = false;
        next();
      }
    }
  }
  </script>
  
  <svelte:window on:keydown={keydown} on:pointerdown={keydown} />
  
  <div class='select-none absolute text-center left-1/2 top-1/2 text-5xl md:text-6xl -translate-y-1/2 -translate-x-1/2 px-2 md:max-w-lg'>
    {currentWord[turkish ? 0 : 1]}
  </div>

  <div class='absolute bottom-0 inset-x-0 text-center p-2 text-xs text-gray-500'>
    <button class='bg-slate-500 rounded text-white px-2 py-1' on:click={newGroup}>New random group of 100</button>
    [Space] or click/tap - {words.length} Cards - v{commitCount} - <a target="_blank" href='https://variancestudios.com'>Made by Andrew Gilgallon</a>
  </div>

  <style>
    :global(body) {
      padding: 0;
      margin: 0;
    }
  </style>