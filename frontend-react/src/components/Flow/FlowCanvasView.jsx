import React, { useEffect, useRef } from 'react';
import { FlowCanvas } from '../../services/flow.js';
import { TimelineController } from '../../services/timeline.js';
import { TimelineRangeControls } from './TimelineRangeControls.jsx';

export function FlowCanvasView({
  canvasMode,
  activePocketFilterIds,
  onNodeSelect,
  onToggleInspector,
  dateRange,
  onDateRangeChange,
  presetView,
  onPresetViewChange,
  customMinBalance,
  onCustomMinBalanceChange,
  selectedIncomeIds,
  onSelectedIncomeIdsChange,
  scopeFilter,
  showToast
}) {
  const flowCanvasRef = useRef(null);
  const timelineControllerRef = useRef(null);

  // Initialize FlowCanvas and TimelineController once on mount
  useEffect(() => {
    const canvas = new FlowCanvas('flowViewport', (nodeId) => {
      onNodeSelect(nodeId);
    });

    if (activePocketFilterIds && activePocketFilterIds.length > 0) {
      canvas.setActivePockets(activePocketFilterIds);
    }
    canvas.setMode(canvasMode || 'both');
    canvas.render();
    flowCanvasRef.current = canvas;

    const timeline = new TimelineController(canvas);
    timelineControllerRef.current = timeline;

    const handleResize = () => {
      if (flowCanvasRef.current) {
        flowCanvasRef.current.render();
      }
    };
    window.addEventListener('resize', handleResize);

    const handleStoreUpdated = () => {
      if (flowCanvasRef.current) flowCanvasRef.current.render();
      if (timelineControllerRef.current) timelineControllerRef.current.refresh();
    };
    window.addEventListener('storeUpdated', handleStoreUpdated);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storeUpdated', handleStoreUpdated);
    };
  }, []);

  // Sync canvas mode changes
  useEffect(() => {
    if (flowCanvasRef.current) {
      flowCanvasRef.current.setMode(canvasMode);
    }
  }, [canvasMode]);

  // Sync active pockets changes (dimming & particle suppression)
  useEffect(() => {
    if (flowCanvasRef.current) {
      flowCanvasRef.current.setActivePockets(activePocketFilterIds);
    }
  }, [activePocketFilterIds]);

  return (
    <section id="canvasWrapper" className="canvas-wrapper">
      <div className="canvas-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ fontWeight: 600 }}>Interaksi Alur: Klik Node untuk inspeksi riwayat & mutasi</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>[Pemasukan] ──&gt; [Kantong & Rekening] ──&gt; [Pos Pengeluaran]</span>
          <button
            type="button"
            id="btnToggleInspectorFromCanvas"
            className="mode-btn"
            style={{
              padding: '2px 8px',
              fontSize: 10,
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              borderRadius: 4,
              cursor: 'pointer'
            }}
            title="Buka / Tutup Panel Detail"
            onClick={onToggleInspector}
          >
            🔍 Detail Panel
          </button>
        </div>
      </div>

      <div id="flowViewport" className="flow-viewport"></div>

      {/* Blender Timeline Panel (Docked Scrubber & Transport) */}
      <div id="timelinePanel" className="blender-timeline-panel">
        <div className="timeline-left">
          <div className="timeline-transport-group">
            <button id="btnTimelineFirst" className="timeline-btn" title="First Keyframe (Home)">⏮</button>
            <button id="btnTimelinePrev" className="timeline-btn" title="Step Back (Left Arrow)">◀</button>
            <button id="btnTimelinePlay" className="timeline-btn btn-timeline-play" title="Play/Pause (Spacebar)">
              <span id="timelinePlayIcon">▶</span>
              <span id="timelinePlayLabel">PLAY</span>
            </button>
            <button id="btnTimelineNext" className="timeline-btn" title="Step Forward (Right Arrow)">▶</button>
            <button id="btnTimelineLast" className="timeline-btn" title="Latest Keyframe (End)">⏭</button>
          </div>
          <div className="timeline-frame-pill">
            <span className="timeline-frame-tag">FRAME</span>
            <span id="timelineFrameCount" className="timeline-frame-val">0</span>
          </div>
          <div id="timelineActiveTx" className="timeline-active-tx" title="Transaksi Aktif pada Frame Ini">
            Semua Alur Aktif (Live Overview)
          </div>
        </div>

        <div className="timeline-center">
          <div className="timeline-track-container">
            <div id="timelineProgressFill" className="timeline-progress-fill"></div>
            <div id="timelineKeyframesTrack" className="timeline-keyframes-track"></div>
            <input type="range" id="timelineScrubber" className="timeline-scrubber" min="0" max="1000" defaultValue="0" step="any" />
          </div>
        </div>

        <div className="timeline-right">
          <div className="timeline-mode-dropdown-wrapper">
            <select id="timelineModeSelect" className="timeline-mode-select" title="Pilih Mode Timeline" defaultValue="step">
              <option value="step">⚡ Step (1.5s / transisi • 3s full)</option>
              <option value="duration">📅 Date Range &amp; Duration</option>
            </select>
          </div>
          <span id="timelineDateBadge" className="timeline-badge-date">LIVE ALL TIME</span>
          <button id="btnTimelineLive" className="timeline-btn-live active" title="Reset ke Tampilan Semua Transaksi">
            <span className="live-indicator-dot"></span> LIVE
          </button>
          <button id="btnTimelineSpeed" className="timeline-btn-speed" title="Kecepatan Animasi">1x</button>
        </div>
      </div>

      {/* Timeline View Range & Scoped Presets Bar (Below Timeline) */}
      <TimelineRangeControls
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        presetView={presetView}
        onPresetViewChange={onPresetViewChange}
        customMinBalance={customMinBalance}
        onCustomMinBalanceChange={onCustomMinBalanceChange}
        selectedIncomeIds={selectedIncomeIds}
        onSelectedIncomeIdsChange={onSelectedIncomeIdsChange}
        scopeFilter={scopeFilter}
        activePocketFilterIds={activePocketFilterIds}
        showToast={showToast}
      />
    </section>
  );
}
