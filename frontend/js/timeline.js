// Timeline Controller - Blender Timeline Panel Engine (Brief v04)
// Features: Dual Mode (Default 1 tx/0.1s vs Date Range & Duration), Scrubber, Transport Controls, Live Playback Simulation

import { store } from './store.js';
import { i18n } from './i18n.js';

export class TimelineController {
  constructor(flowCanvas) {
    this.flowCanvas = flowCanvas;
    this.isPlaying = false;
    this.playTimer = null;
    this.playbackSpeed = 1; // 1x, 2x, 0.5x
    this.currentFrame = -1; // -1 means "Live All Time"
    this.transactions = [];
    this.mode = 'step'; // 'step' (default 0.1s/tx) | 'duration' (date range & proportional duration)

    try {
      this.initElements();
    } catch (err) {
      console.error('TimelineController initElements error:', err);
    }

    try {
      this.bindEvents();
    } catch (err) {
      console.error('TimelineController bindEvents error:', err);
    }

    try {
      this.refresh();
    } catch (err) {
      console.error('TimelineController refresh error:', err);
    }

    // Expose instance globally for debugging & testing
    if (typeof window !== 'undefined') {
      window.timelineController = this;
    }
  }

  initElements() {
    this.btnFirst = document.getElementById('btnTimelineFirst');
    this.btnPrev = document.getElementById('btnTimelinePrev');
    this.btnPlay = document.getElementById('btnTimelinePlay');
    this.playIcon = document.getElementById('timelinePlayIcon');
    this.playLabel = document.getElementById('timelinePlayLabel');
    this.btnNext = document.getElementById('btnTimelineNext');
    this.btnLast = document.getElementById('btnTimelineLast');
    this.frameCount = document.getElementById('timelineFrameCount');
    this.activeTxText = document.getElementById('timelineActiveTx');
    this.keyframesTrack = document.getElementById('timelineKeyframesTrack');
    this.scrubber = document.getElementById('timelineScrubber');
    this.dateBadge = document.getElementById('timelineDateBadge');
    this.btnLive = document.getElementById('btnTimelineLive');
    this.btnSpeed = document.getElementById('btnTimelineSpeed');
    this.modeSelect = document.getElementById('timelineModeSelect');
  }

  bindEvents() {
    this.btnPlay?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.btnFirst?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.jumpTo(0, true);
    });

    this.btnLast?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.jumpTo(Math.max(0, this.transactions.length - 1), true);
    });

    this.btnPrev?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.step(-1, true);
    });

    this.btnNext?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.step(1, true);
    });

    this.btnLive?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setLiveAll();
    });

    this.modeSelect?.addEventListener('change', (e) => {
      this.setMode(e.target.value);
    });

    this.btnSpeed?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playbackSpeed = this.playbackSpeed === 1 ? 2 : (this.playbackSpeed === 2 ? 0.5 : 1);
      if (this.btnSpeed) this.btnSpeed.textContent = `${this.playbackSpeed}x`;
      if (this.isPlaying) {
        this.clearTimer();
        this.scheduleNextFrame();
      }
    });

    this.scrubber?.addEventListener('input', (e) => {
      const frame = parseInt(e.target.value, 10);
      this.jumpTo(frame, true);
    });

    // Global keyboard shortcuts (Space: play/pause, Arrow keys: step)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.step(-1, true);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.step(1, true);
      }
    });

    // Resilient store listeners
    window.addEventListener('storeUpdated', () => this.refresh());
    window.addEventListener('accountChanged', () => this.refresh());

    if (store && typeof store.subscribe === 'function') {
      try {
        store.subscribe(() => this.refresh());
      } catch (err) {
        console.warn('store.subscribe attachment warning:', err);
      }
    }
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.modeSelect) this.modeSelect.value = newMode;
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.clearTimer();
    }
    this.renderKeyframeDiamonds();
    this.updateUI();
    if (wasPlaying) {
      this.scheduleNextFrame();
    }
  }

  refresh() {
    // Sort transactions chronological ascending for timeline playback
    const rawTxs = store?.state?.transactions || [];
    this.transactions = [...rawTxs].sort((a, b) => new Date(a.date) - new Date(b.date));

    const total = this.transactions.length;
    if (this.scrubber) {
      this.scrubber.min = '0';
      this.scrubber.max = String(Math.max(0, total - 1));
      if (this.currentFrame === -1 || this.currentFrame >= total) {
        this.currentFrame = total > 0 ? total - 1 : -1;
      }
      this.scrubber.value = String(this.currentFrame >= 0 ? this.currentFrame : 0);
    }

    this.renderKeyframeDiamonds();
    this.updateUI();
  }

  renderKeyframeDiamonds() {
    if (!this.keyframesTrack) return;
    this.keyframesTrack.innerHTML = '';
    const total = this.transactions.length;
    if (total <= 1) return;

    let tMin = 0;
    let tSpan = 1;
    if (this.mode === 'duration') {
      tMin = new Date(this.transactions[0].date).getTime();
      const tMax = new Date(this.transactions[total - 1].date).getTime();
      tSpan = Math.max(1, tMax - tMin);
    }

    this.transactions.forEach((tx, idx) => {
      let pct = 0;
      if (this.mode === 'duration') {
        const tVal = new Date(tx.date).getTime();
        pct = Math.min(100, Math.max(0, ((tVal - tMin) / tSpan) * 100));
      } else {
        pct = (idx / (total - 1)) * 100;
      }

      const diamond = document.createElement('div');
      diamond.className = `timeline-keyframe-diamond ${idx === this.currentFrame ? 'active' : (idx < this.currentFrame ? 'passed' : '')}`;
      diamond.style.left = `${pct}%`;
      diamond.title = `[Frame ${idx + 1}/${total}] ${i18n.formatDate(tx.date)}: ${tx.fromLabel} ➔ ${tx.toLabel} (${i18n.formatCurrency(tx.amount)})`;
      diamond.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpTo(idx, true);
      });
      this.keyframesTrack.appendChild(diamond);
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (!this.transactions || this.transactions.length === 0) {
      this.refresh();
    }
    if (!this.transactions || this.transactions.length === 0) {
      console.warn('Timeline: Tidak ada transaksi untuk dimainkan.');
      return;
    }

    this.clearTimer();
    this.isPlaying = true;

    if (this.playIcon) this.playIcon.textContent = '⏸';
    if (this.playLabel) this.playLabel.textContent = 'PAUSE';
    this.btnPlay?.classList.add('playing');
    this.btnLive?.classList.remove('active');

    // If at the end or live overview (-1), wrap around to frame 0
    if (this.currentFrame >= this.transactions.length - 1 || this.currentFrame === -1) {
      this.jumpTo(0, false);
    }

    this.scheduleNextFrame();
  }

  scheduleNextFrame() {
    if (!this.isPlaying) return;
    this.clearTimer();

    const total = this.transactions.length;
    if (total === 0) {
      this.pause();
      return;
    }

    // If already at the end frame, hold for a moment then loop back to frame 0
    if (this.currentFrame >= total - 1) {
      const holdTime = this.mode === 'duration' ? 800 : 600;
      this.playTimer = setTimeout(() => {
        if (!this.isPlaying) return;
        this.jumpTo(0, false);
        this.scheduleNextFrame();
      }, holdTime);
      return;
    }

    let frameDelay = 500; // default 0.5s per transition (total 1s across 2 hops)

    if (this.mode === 'duration') {
      const t1 = new Date(this.transactions[this.currentFrame].date).getTime();
      const t2 = new Date(this.transactions[this.currentFrame + 1].date).getTime();
      const tFirst = new Date(this.transactions[0].date).getTime();
      const tLast = new Date(this.transactions[total - 1].date).getTime();
      const totalSpan = Math.max(1, tLast - tFirst);
      const deltaRatio = Math.max(0, (t2 - t1) / totalSpan);

      // Dynamic duration based on actual date gap: between 300ms and 1500ms
      frameDelay = Math.max(300, Math.min(1500, Math.round((400 + deltaRatio * 2200) / this.playbackSpeed)));
    } else {
      // Default: Step Mode (0.5s per transition, total 1.0s across 2 hops)
      frameDelay = Math.max(100, Math.floor(500 / this.playbackSpeed));
    }

    this.playTimer = setTimeout(() => {
      if (!this.isPlaying) return;
      this.step(1, false);
      this.scheduleNextFrame();
    }, frameDelay);
  }

  clearTimer() {
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  pause() {
    this.isPlaying = false;
    this.clearTimer();
    if (this.playIcon) this.playIcon.textContent = '▶';
    if (this.playLabel) this.playLabel.textContent = 'PLAY';
    this.btnPlay?.classList.remove('playing');
  }

  step(delta, pause = true) {
    if (this.transactions.length === 0) return;
    const nextFrame = Math.max(0, Math.min(this.transactions.length - 1, this.currentFrame + delta));
    this.jumpTo(nextFrame, pause);
  }

  jumpTo(frameIndex, pause = true) {
    if (pause && this.isPlaying) {
      this.pause();
    }

    this.currentFrame = frameIndex;
    if (this.scrubber) this.scrubber.value = String(this.currentFrame);

    const isLast = this.currentFrame === this.transactions.length - 1;
    if (isLast && !this.isPlaying) {
      this.btnLive?.classList.add('active');
    } else {
      this.btnLive?.classList.remove('active');
    }

    this.updateUI();
    this.syncFlowCanvas();
  }

  setLiveAll() {
    this.pause();
    this.currentFrame = this.transactions.length - 1;
    if (this.scrubber) this.scrubber.value = String(this.currentFrame);
    this.btnLive?.classList.add('active');
    this.updateUI();
    if (this.flowCanvas) {
      this.flowCanvas.highlightTimelineTx(null);
    }
  }

  updateUI() {
    const total = this.transactions.length;
    if (this.frameCount) {
      this.frameCount.textContent = this.currentFrame >= 0 ? `${this.currentFrame + 1} / ${total}` : `0 / ${total}`;
    }

    // Update active diamonds
    const diamonds = this.keyframesTrack?.querySelectorAll('.timeline-keyframe-diamond');
    diamonds?.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.currentFrame);
      d.classList.toggle('passed', idx < this.currentFrame);
    });

    if (this.currentFrame >= 0 && this.currentFrame < total) {
      const tx = this.transactions[this.currentFrame];
      if (this.activeTxText) {
        const sign = tx.type === 'income' ? '+' : '-';
        this.activeTxText.innerHTML = `
          <span style="color: #60a5fa; font-weight: 700;">${i18n.formatDate(tx.date)}</span> &bull; 
          <span style="color: #f1f5f9;">${tx.fromLabel} ➔ ${tx.toLabel}</span> &bull; 
          <span style="font-family: monospace; font-weight: 800; color: ${tx.type === 'income' ? '#34d399' : (tx.type === 'expense' ? '#f87171' : '#c084fc')};">
            ${sign}${i18n.formatCurrency(tx.amount)}
          </span>
          ${tx.note ? `<span style="color: #94a3b8; font-style: italic;">("${tx.note}")</span>` : ''}
        `;
      }
      if (this.dateBadge) {
        if (this.mode === 'duration' && total > 1) {
          const dStart = i18n.formatDate(this.transactions[0].date);
          const dEnd = i18n.formatDate(this.transactions[total - 1].date);
          this.dateBadge.textContent = `${i18n.formatDate(tx.date)} [${dStart} ➔ ${dEnd}]`;
        } else {
          this.dateBadge.textContent = `${i18n.formatDate(tx.date)}`;
        }
      }
    } else {
      if (this.activeTxText) this.activeTxText.textContent = 'Semua Alur Aktif (Live Overview)';
      if (this.dateBadge) {
        if (this.mode === 'duration' && total > 1) {
          const dStart = i18n.formatDate(this.transactions[0].date);
          const dEnd = i18n.formatDate(this.transactions[total - 1].date);
          this.dateBadge.textContent = `${dStart} ➔ ${dEnd}`;
        } else {
          this.dateBadge.textContent = 'LIVE ALL TIME';
        }
      }
    }
  }

  syncFlowCanvas() {
    if (this.flowCanvas) {
      if (this.currentFrame >= 0 && this.currentFrame < this.transactions.length) {
        const tx = this.transactions[this.currentFrame];
        this.flowCanvas.highlightTimelineTx(tx.id);
      } else {
        this.flowCanvas.highlightTimelineTx(null);
      }
    }
  }
}
