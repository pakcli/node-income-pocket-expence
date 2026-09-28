import { store } from './store.js';
import { i18n } from './i18n.js';

const safeRaf = (typeof requestAnimationFrame === 'function') 
  ? requestAnimationFrame 
  : (cb) => setTimeout(() => cb(Date.now()), 16);

const safeCancelRaf = (typeof cancelAnimationFrame === 'function') 
  ? cancelAnimationFrame 
  : (id) => clearTimeout(id);

export class TimelineController {
  constructor(flowCanvas) {
    this.flowCanvas = flowCanvas;
    this.isPlaying = false;
    this.playbackSpeed = 1; // 1x, 2x, 0.5x
    this.currentProgress = 0; // Float 0.0 to 1.0 (smooth playhead)
    this.currentFrame = -1; // -1 means "Live All Time"
    this.transactions = [];
    this.mode = 'step'; // 'step' (1.5s per transition) | 'duration' (date range & proportional duration)
    this.rafId = null;
    this.lastRafTime = null;
    this.isLive = true;

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
    this.progressFill = document.getElementById('timelineProgressFill');
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
    });

    // Continuous scrubber input (dragging like a video)
    this.scrubber?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const ratio = Math.max(0, Math.min(1, val / 1000));
      this.seekProgress(ratio, true);
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
      this.pause();
    }
    this.renderKeyframeDiamonds();
    this.seekProgress(this.currentProgress, true);
    if (wasPlaying) {
      this.play();
    }
  }

  refresh() {
    const rawTxs = store?.state?.transactions || [];
    this.transactions = [...rawTxs].sort((a, b) => new Date(a.date) - new Date(b.date));

    const total = this.transactions.length;
    if (this.scrubber) {
      this.scrubber.min = '0';
      this.scrubber.max = '1000';
      this.scrubber.step = 'any';
    }

    if (this.currentFrame === -1 || this.currentFrame >= total) {
      this.currentFrame = total > 0 ? total - 1 : -1;
      this.currentProgress = total > 1 ? 1 : 0;
    }

    this.renderKeyframeDiamonds();
    if (this.isLive) {
      this.setLiveAll();
    } else {
      this.seekProgress(this.currentProgress, !this.isPlaying);
    }
  }

  getPinProgress(idx) {
    const total = this.transactions.length;
    if (total <= 1) return 0;
    if (this.mode === 'duration') {
      const tMin = new Date(this.transactions[0].date).getTime();
      const tMax = new Date(this.transactions[total - 1].date).getTime();
      const tSpan = Math.max(1, tMax - tMin);
      const tVal = new Date(this.transactions[idx].date).getTime();
      return Math.min(1, Math.max(0, (tVal - tMin) / tSpan));
    }
    return idx / (total - 1);
  }

  renderKeyframeDiamonds() {
    if (!this.keyframesTrack) return;
    this.keyframesTrack.innerHTML = '';
    const total = this.transactions.length;
    if (total <= 1) return;

    this.transactions.forEach((tx, idx) => {
      const pinProgress = this.getPinProgress(idx);
      const pct = pinProgress * 100;

      const diamond = document.createElement('div');
      diamond.className = `timeline-keyframe-diamond ${idx === this.currentFrame ? 'active' : (pinProgress <= this.currentProgress ? 'passed' : '')}`;
      diamond.style.left = `${pct.toFixed(2)}%`;
      if (typeof diamond.setAttribute === 'function') {
        diamond.setAttribute('data-index', String(idx));
      }
      diamond.title = `[Pin ${idx + 1}/${total}] ${i18n.formatDate(tx.date)}: ${tx.fromLabel} ➔ ${tx.toLabel} (${i18n.formatCurrency(tx.amount)})`;

      // Make clicking the marked pin changes effortless
      diamond.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      diamond.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.jumpToPin(idx);
      });

      this.keyframesTrack.appendChild(diamond);
    });
  }

  jumpToPin(idx) {
    const total = this.transactions.length;
    if (total === 0) return;
    const pinProgress = this.getPinProgress(idx);
    this.seekProgress(pinProgress, true);
  }

  // Linear progress mapping to active transaction and sub-hop wire progress (0 to 1)
  getProgressMapping(progress) {
    const total = this.transactions.length;
    if (total === 0) return { frameIndex: -1, subProgress: 0 };
    if (total === 1) return { frameIndex: 0, subProgress: 1 };

    if (this.mode === 'duration') {
      const tMin = new Date(this.transactions[0].date).getTime();
      const tMax = new Date(this.transactions[total - 1].date).getTime();
      const tSpan = Math.max(1, tMax - tMin);
      if (tSpan <= 1) {
        const scaled = progress * (total - 1);
        const frameIndex = Math.min(total - 1, Math.floor(scaled));
        return { frameIndex, subProgress: scaled - frameIndex };
      }
      const targetTime = tMin + progress * tSpan;
      for (let i = 0; i < total - 1; i++) {
        const tA = new Date(this.transactions[i].date).getTime();
        const tB = new Date(this.transactions[i + 1].date).getTime();
        if (targetTime >= tA && targetTime <= tB) {
          const sub = (tB > tA) ? ((targetTime - tA) / (tB - tA)) : 0;
          return { frameIndex: i, subProgress: sub };
        }
      }
      return { frameIndex: total - 1, subProgress: 1.0 };
    }

    // Step Mode (Linear progression across N-1 segments)
    const scaled = progress * (total - 1);
    let frameIndex = Math.floor(scaled);
    if (frameIndex >= total - 1) {
      return { frameIndex: total - 1, subProgress: 1.0 };
    }
    const subProgress = scaled - frameIndex;
    return { frameIndex, subProgress };
  }

  seekProgress(progress, pause = true) {
    if (pause) {
      this.pause();
    }
    this.isLive = false;
    this.btnLive?.classList.remove('active');
    this.currentProgress = Math.max(0, Math.min(1, progress));

    if (this.scrubber) {
      this.scrubber.value = String(Math.round(this.currentProgress * 1000));
    }
    if (this.progressFill?.style) {
      this.progressFill.style.width = `${(this.currentProgress * 100).toFixed(2)}%`;
    }

    const { frameIndex, subProgress } = this.getProgressMapping(this.currentProgress);
    const prevFrame = this.currentFrame;
    this.currentFrame = frameIndex;

    this.updateUI();

    if (this.flowCanvas) {
      const tx = this.transactions[frameIndex];
      if (tx) {
        if (prevFrame !== frameIndex || this.flowCanvas.highlightedTxId !== tx.id) {
          this.flowCanvas.highlightTimelineTx(tx.id, this.isPlaying, this.playbackSpeed, subProgress);
        } else {
          this.flowCanvas.setCashProgress(subProgress);
        }
      }
    }
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
    const total = this.transactions.length;
    if (total === 0) return;

    this.isPlaying = true;
    this.isLive = false;

    if (this.playIcon) this.playIcon.textContent = '⏸';
    if (this.playLabel) this.playLabel.textContent = 'PAUSE';
    this.btnPlay?.classList.add('playing');
    this.btnLive?.classList.remove('active');

    // If at the end or live overview, wrap around to 0
    if (this.currentProgress >= 0.999) {
      this.currentProgress = 0;
    }

    if (this.flowCanvas) {
      this.flowCanvas.resumeCashAnimation();
    }

    this.lastRafTime = performance.now();
    this.startPlaybackLoop();
  }

  startPlaybackLoop() {
    if (this.rafId) {
      safeCancelRaf(this.rafId);
      this.rafId = null;
    }

    const total = this.transactions.length;
    const transitionMs = 1500; // 1.5s per transition at 1x
    const totalDurationMs = Math.max(1000, (total - 1) * transitionMs);

    const loop = (now) => {
      if (!this.isPlaying) return;

      const dt = (now - this.lastRafTime) * this.playbackSpeed;
      this.lastRafTime = now;

      this.currentProgress += dt / totalDurationMs;

      if (this.currentProgress >= 1) {
        this.currentProgress = 1;
        this.seekProgress(1, false);
        // Loop back after a brief hold
        setTimeout(() => {
          if (this.isPlaying) {
            this.currentProgress = 0;
            this.lastRafTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this.rafId = safeRaf(loop);
          }
        }, 600);
        return;
      }

      this.seekProgress(this.currentProgress, false);
      this.rafId = safeRaf(loop);
    };

    this.rafId = safeRaf(loop);
  }

  pause() {
    this.isPlaying = false;
    if (this.rafId) {
      safeCancelRaf(this.rafId);
      this.rafId = null;
    }
    if (this.playIcon) this.playIcon.textContent = '▶';
    if (this.playLabel) this.playLabel.textContent = 'PLAY';
    this.btnPlay?.classList.remove('playing');
    if (this.flowCanvas) {
      this.flowCanvas.pauseCashAnimation();
    }
  }

  step(delta, pause = true) {
    const total = this.transactions.length;
    if (total === 0) return;
    const nextFrame = Math.max(0, Math.min(total - 1, (this.currentFrame >= 0 ? this.currentFrame : 0) + delta));
    this.jumpTo(nextFrame, pause);
  }

  jumpTo(frameIndex, pause = true) {
    const total = this.transactions.length;
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(total - 1, frameIndex));
    const pinProgress = this.getPinProgress(clamped);
    this.seekProgress(pinProgress, pause);
  }

  jumpToTx(txId, playAnimation = true) {
    if (!this.transactions || this.transactions.length === 0) {
      this.refresh();
    }
    const idx = this.transactions.findIndex(t => t.id === txId);
    if (idx !== -1) {
      this.jumpTo(idx, true);
      if (playAnimation && this.flowCanvas) {
        const tx = this.transactions[idx];
        if (typeof this.flowCanvas.playCashAnimationForTx === 'function') {
          this.flowCanvas.playCashAnimationForTx(tx);
        }
      }
    }
  }

  setLiveAll() {
    this.pause();
    this.isLive = true;
    const total = this.transactions.length;
    this.currentFrame = total > 0 ? total - 1 : -1;
    this.currentProgress = 1;
    if (this.scrubber) this.scrubber.value = '1000';
    if (this.progressFill?.style) this.progressFill.style.width = '100%';
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

    // Highlight diamond pins
    const diamonds = this.keyframesTrack?.querySelectorAll('.timeline-keyframe-diamond');
    diamonds?.forEach((d, idx) => {
      const pinProgress = this.getPinProgress(idx);
      const isPassed = pinProgress <= this.currentProgress + 0.005;
      const isActive = idx === this.currentFrame;
      d.classList.toggle('passed', isPassed);
      d.classList.toggle('active', isActive);
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

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('timelineFrameChanged', {
        detail: {
          frameIndex: this.currentFrame,
          tx: this.transactions[this.currentFrame] || null,
          isLive: this.isLive
        }
      }));
    }
  }

  syncFlowCanvas() {
    if (this.flowCanvas) {
      if (this.currentFrame >= 0 && this.currentFrame < this.transactions.length) {
        const tx = this.transactions[this.currentFrame];
        this.flowCanvas.highlightTimelineTx(tx.id, this.isPlaying, this.playbackSpeed);
      } else {
        this.flowCanvas.highlightTimelineTx(null, false, this.playbackSpeed);
      }
    }
  }
}
