// 简单的测试逻辑
const words = ['DeFi Yield', 'Staking Rewards', 'Smart Investing'];
let wordIndex = 0;
let isDeleting = false;
let isPaused = false;
let displayText = '';
const typeSpeed = 100;
const deleteSpeed = 50;
const pauseDuration = 2000;

console.log('Starting typewriter simulation...');
console.log('Words:', words);
console.log('Loop enabled: true');

function simulateStep() {
  const currentWord = words[wordIndex];
  
  if (isPaused) {
    console.log(`⏸️  Paused for ${pauseDuration}ms...`);
    setTimeout(() => {
      isPaused = false;
      if (displayText.length >= currentWord.length) {
        isDeleting = true;
      }
      simulateStep();
    }, pauseDuration);
    return;
  }
  
  if (isDeleting) {
    if (displayText.length > 0) {
      displayText = currentWord.slice(0, displayText.length - 1);
      console.log(`⌫ Deleting: "${displayText}"`);
      setTimeout(simulateStep, deleteSpeed);
    } else {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      isPaused = true;
      console.log(`✅ Switched to word ${wordIndex}: "${words[wordIndex]}"`);
      setTimeout(simulateStep, pauseDuration);
    }
  } else {
    if (displayText.length < currentWord.length) {
      displayText = currentWord.slice(0, displayText.length + 1);
      console.log(`⌨️  Typing: "${displayText}"`);
      setTimeout(simulateStep, typeSpeed);
    } else {
      isPaused = true;
      console.log(`⏸️  Word complete, pausing...`);
      setTimeout(simulateStep, pauseDuration);
    }
  }
}

// Start simulation
simulateStep();
