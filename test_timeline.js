// Test Timeline Controller Logic and Dual Mode
const fs = require('fs');
const path = require('path');

// Mock browser globals for Node test environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.document = {
  activeElement: null,
  createElement: () => ({
    className: '',
    style: {},
    title: '',
    addEventListener: () => {}
  }),
  getElementById: (id) => ({
    id,
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    addEventListener: (event, handler) => {},
    innerHTML: '',
    textContent: '',
    appendChild: () => {},
    querySelectorAll: () => []
  })
};

async function testTimeline() {
  console.log('🧪 Testing Timeline Controller Dual Mode & Playback Engine...');

  const timelineModule = await import('./frontend/js/timeline.js');
  const storeModule = await import('./frontend/js/store.js');

  const { TimelineController } = timelineModule;
  const { store } = storeModule;

  // Verify store has transactions
  if (!store.state.transactions || store.state.transactions.length === 0) {
    throw new Error('Store has no transactions to test timeline!');
  }
  console.log(`[PASS] Store initialized with ${store.state.transactions.length} transactions.`);

  // Mock flowCanvas
  let highlightedTx = null;
  const mockFlowCanvas = {
    highlightTimelineTx: (id) => {
      highlightedTx = id;
    }
  };

  const timeline = new TimelineController(mockFlowCanvas);

  // 1. Verify initialization
  if (timeline.transactions.length !== store.state.transactions.length) {
    throw new Error(`Expected ${store.state.transactions.length} transactions in timeline, got ${timeline.transactions.length}`);
  }
  console.log(`[PASS] TimelineController loaded ${timeline.transactions.length} frames.`);

  // 2. Test Step Mode
  timeline.setMode('step');
  if (timeline.mode !== 'step') throw new Error('Mode should be step');
  console.log('[PASS] Step mode set correctly.');

  // 3. Test jumpTo
  timeline.jumpTo(0, true);
  if (timeline.currentFrame !== 0) throw new Error('Current frame should be 0');
  if (highlightedTx !== timeline.transactions[0].id) throw new Error('First tx should be highlighted');
  console.log('[PASS] jumpTo(0) successfully highlighted frame 0.');

  // 4. Test step forward
  timeline.step(1, false);
  if (timeline.currentFrame !== 1) throw new Error('Current frame should be 1');
  console.log('[PASS] step(1) stepped to frame 1.');

  // 5. Test Duration Mode
  timeline.setMode('duration');
  if (timeline.mode !== 'duration') throw new Error('Mode should be duration');
  console.log('[PASS] Duration mode set correctly.');

  // 6. Test Play and Pause
  timeline.play();
  if (!timeline.isPlaying) throw new Error('Timeline should be playing');
  console.log('[PASS] play() started playback.');

  timeline.pause();
  if (timeline.isPlaying) throw new Error('Timeline should be paused');
  console.log('[PASS] pause() stopped playback.');

  // 7. Test setLiveAll
  timeline.setLiveAll();
  if (timeline.currentFrame !== timeline.transactions.length - 1) {
    throw new Error('setLiveAll should jump to last frame');
  }
  console.log('[PASS] setLiveAll() reset to overview.');

  console.log('\n🎉 ALL TIMELINE CONTROLLER TESTS PASSED!\n');
}

testTimeline().catch(err => {
  console.error('❌ Timeline test failed:', err);
  process.exit(1);
});
