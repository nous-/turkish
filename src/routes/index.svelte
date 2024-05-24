<script>
  import { words as wrds } from '@/words';
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
    if (!flip) {
      turkish = !turkish;
      flip = true;
    } else {
      flip = false;
      next();
    }
  }
  </script>
  
  <svelte:window on:keydown={keydown} on:pointerdown={keydown} />
  
  <div>
    {currentWord[turkish ? 0 : 1]}
  </div>
  
  <style>
    :global(body) {
      padding: 0;
      margin: 0;
    }
    div {
      user-select: none;
      position: absolute;
      text-align: center;
      width: 100%;
      top: 50%;
      transform: translateY(-50%);
      font-size: 56px;
    }
  </style>