// Timeline Controller - Blender Timeline Panel Engine (Brief v04)
// Features: Keyframe Scrubber, Transport Controls, Live Playback Simulation, Frame Scrubbing

import { store } from './store.js';
import { i18n } from './i18n.js';

export class TimelineController {
  constructor(flowCanvas) {
    this.flowCanvas = flowCanvas;
    this.isPlaying = false;
    this.playInterval = null;
    this.playbackSpeed = 1; // 1x or 2x
    this.currentFrame = -1; // -1 means "Live All"
    this.transactions = [];

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
  }

  bindEvents() {
    this.btnPlay?.addEventListener('click', () => this.togglePlay());
    this.btnFirst?.addEventListener('click', () => this.jumpTo(0));
    this.btnLast?.addEventListener('click', () => this.jumpTo(Math.max(0, this.transactions.length - 1)));
    this.btnPrev?.addEventListener('click', () => this.step(-1));
    this.btnNext?.addEventListener('click', () => this.step(1));

    this.btnLive?.addEventListener('click', () => this.setLiveAll());

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
      this.jumpTo(frame, false);
    });

    // Spacebar to play/pause, Left/Right arrow keys to step
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input/textarea/select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.step(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.step(1);
      }
    });

    store.subscribe(() => {
      this.refresh();
    });
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

    this.transactions.forEach((tx, idx) => {
      const pct = (idx / (total - 1)) * 100;
      const diamond = document.createElement('div');
      diamond.className = `timeline-keyframe-diamond ${idx === this.currentFrame ? 'active' : ''}`;
      diamond.style.left = `${pct}%`;
      diamond.title = `${i18n.formatDate(tx.date)}: ${tx.fromLabel} ➔ ${tx.toLabel} (${i18n.formatCurrency(tx.amount)})`;
      diamond.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpTo(idx);
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
    this.isPlaying = true;
    if (this.playIcon) this.playIcon.textContent = '⏸';
    if (this.playLabel) this.playLabel.textContent = 'PAUSE';
    this.btnPlay?.classList.add('playing');
    this.btnLive?.classList.remove('active');

    // If at the end, restart from beginning
    if (this.currentFrame >= this.transactions.length - 1) {
      this.currentFrame = 0;
    }

    const intervalTime = Math.floor(1100 / this.playbackSpeed);
    this.playInterval = setInterval(() => {
      if (this.currentFrame < this.transactions.length - 1) {
        this.step(1);
      } else {
        this.pause();
      }
    }, intervalTime);
  }

  pause() {
    this.isPlaying = false;
    if (this.playIcon) this.playIcon.textContent = '▶';
    if (this.playLabel) this.playLabel.textContent = 'PLAY';
    this.btnPlay?.classList.remove('playing');
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  step(delta) {
    if (this.transactions.length === 0) return;
    const nextFrame = Math.max(0, Math.min(this.transactions.length - 1, this.currentFrame + delta));
    this.jumpTo(nextFrame);
  }

  jumpTo(frameIndex, pause = true) {
    if (pause && this.isPlaying) {
      this.pause();
    }

    this.currentFrame = frameIndex;
    if (this.scrubber) this.scrubber.value = this.currentFrame;

    const isLast = this.currentFrame === this.transactions.length - 1;
    if (isLast) {
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
    if (this.frameCount) {
      this.frameCount.textContent = this.currentFrame >= 0 ? `${this.currentFrame + 1} / ${this.transactions.length}` : '0';
    }

    // Update active diamonds
    const diamonds = this.keyframesTrack?.querySelectorAll('.timeline-keyframe-diamond');
    diamonds?.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.currentFrame);
      d.classList.toggle('passed', idx <= this.currentFrame);
    });

    if (this.currentFrame >= 0 && this.currentFrame < this.transactions.length) {
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
        this.dateBadge.textContent = `${i18n.formatDate(tx.date)}`;
      }
    } else {
      if (this.activeTxText) this.activeTxText.textContent = 'Semua Alur Aktif (Live Overview)';
      if (this.dateBadge) this.dateBadge.textContent = 'LIVE ALL TIME';
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
