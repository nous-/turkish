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
  
  let currentWords = shuffle(words);
  let index = 0;
  let turkish = false;
  let currentWord;
  let flip = false;
  next();
      
  function next() {
    index++;
    if (index >= words.length) {
      index = 0;
      currentWords = shuffle(words);
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
  
  <div class='select-none absolute text-center w-full top-1/2 text-6xl -translate-y-1/2'>
    {currentWord[turkish ? 0 : 1]}
  </div>

  <div class='absolute bottom-0 right-0 p-2 text-xs text-gray-500'>
    [Space] or click/tap - {words.length} Cards - v{commitCount}
  </div>

  <style>
    :global(body) {
      padding: 0;
      margin: 0;
    }
  </style>