// Timeline Controller - Blender Timeline Panel Engine (Brief v04)
// Features: Dual Mode (Step 0.1s vs Date Range & Duration), Scrubber, Transport Controls, Live Playback Simulation

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

    this.initElements();
    this.bindEvents();
    this.refresh();
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
    this.btnPlay?.addEventListener('click', () => this.togglePlay());
    this.btnFirst?.addEventListener('click', () => this.jumpTo(0, true));
    this.btnLast?.addEventListener('click', () => this.jumpTo(Math.max(0, this.transactions.length - 1), true));
    this.btnPrev?.addEventListener('click', () => this.step(-1, true));
    this.btnNext?.addEventListener('click', () => this.step(1, true));

    this.btnLive?.addEventListener('click', () => this.setLiveAll());

    this.modeSelect?.addEventListener('change', (e) => {
      this.setMode(e.target.value);
    });

    this.btnSpeed?.addEventListener('click', () => {
      this.playbackSpeed = this.playbackSpeed === 1 ? 2 : (this.playbackSpeed === 2 ? 0.5 : 1);
      if (this.btnSpeed) this.btnSpeed.textContent = `${this.playbackSpeed}x`;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });

    this.scrubber?.addEventListener('input', (e) => {
      const frame = parseInt(e.target.value, 10);
      this.jumpTo(frame, true);
    });

    // Spacebar to play/pause, Left/Right arrow keys to step
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

    store.subscribe(() => {
      this.refresh();
    });
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.modeSelect) this.modeSelect.value = newMode;
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.renderKeyframeDiamonds();
    this.updateUI();
    if (wasPlaying) {
      this.play();
    }
  }

  refresh() {
    // Sort transactions chronological ascending for timeline playback
    this.transactions = [...store.state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    const total = this.transactions.length;
    if (this.scrubber) {
      this.scrubber.max = Math.max(0, total - 1);
      if (this.currentFrame === -1 || this.currentFrame >= total) {
        this.currentFrame = total > 0 ? total - 1 : -1;
      }
      this.scrubber.value = this.currentFrame >= 0 ? this.currentFrame : 0;
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
      diamond.className = `timeline-keyframe-diamond ${idx === this.currentFrame ? 'active' : ''}`;
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
    if (this.transactions.length === 0) return;
    this.clearTimer();
    this.isPlaying = true;

    if (this.playIcon) this.playIcon.textContent = '⏸';
    if (this.playLabel) this.playLabel.textContent = 'PAUSE';
    this.btnPlay?.classList.add('playing');
    this.btnLive?.classList.remove('active');

    // If at the end or at live overview, restart from beginning
    if (this.currentFrame >= this.transactions.length - 1 || this.currentFrame === -1) {
      this.jumpTo(0, false);
    }

    if (this.mode === 'duration') {
      this.scheduleDurationStep();
    } else {
      // Default: Step Mode (1 instance per 0.1s / 100ms)
      const stepDelay = Math.max(25, Math.floor(100 / this.playbackSpeed));
      this.playTimer = setInterval(() => {
        if (this.currentFrame < this.transactions.length - 1) {
          this.step(1, false); // Keep playing without self-pausing!
        } else {
          this.pause();
        }
      }, stepDelay);
    }
  }

  scheduleDurationStep() {
    if (!this.isPlaying) return;
    if (this.currentFrame >= this.transactions.length - 1) {
      this.pause();
      return;
    }

    const t1 = new Date(this.transactions[this.currentFrame].date).getTime();
    const t2 = new Date(this.transactions[this.currentFrame + 1].date).getTime();
    const tFirst = new Date(this.transactions[0].date).getTime();
    const tLast = new Date(this.transactions[this.transactions.length - 1].date).getTime();
    const totalSpan = Math.max(1, tLast - tFirst);
    const deltaRatio = Math.max(0, (t2 - t1) / totalSpan);

    // Dynamic duration: minimum 100ms, mapped up to 1400ms based on date gap
    const frameDelay = Math.max(80, Math.min(1400, Math.round((100 + deltaRatio * 3200) / this.playbackSpeed)));

    this.playTimer = setTimeout(() => {
      if (!this.isPlaying) return;
      this.step(1, false);
      if (this.currentFrame < this.transactions.length - 1) {
        this.scheduleDurationStep();
      } else {
        this.pause();
      }
    }, frameDelay);
  }

  clearTimer() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      clearTimeout(this.playTimer);
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
    if (this.scrubber) this.scrubber.value = this.currentFrame;

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
    if (this.scrubber) this.scrubber.value = this.currentFrame;
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
      d.classList.toggle('passed', idx <= this.currentFrame);
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
