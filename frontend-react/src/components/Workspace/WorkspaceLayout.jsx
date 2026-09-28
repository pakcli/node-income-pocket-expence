import React, { useState, useRef, useEffect } from 'react';
import { FlowCanvasView } from '../Flow/FlowCanvasView.jsx';
import { NodeInspector } from '../Inspector/NodeInspector.jsx';
import { TableLedger } from '../Table/TableLedger.jsx';
import { PanelSplitter } from './PanelSplitter.jsx';

export function WorkspaceLayout({
  currentView, // 'flow' | 'split' | 'table'
  isInspectorOpen,
  onToggleInspector,
  canvasMode,
  activePocketFilterIds,
  scopeFilter,
  tableSortOrder,
  onToggleSortOrder,
  isDetailedMode,
  onToggleDetailedMode,
  tableFilter,
  onTableFilterChange,
  nodeClickAction,
  onNodeClickActionChange,
  selectedNodeId,
  onSelectNode,
  onOpenCreateNode,
  onEditTransaction,
  panelWidths,
  onPanelWidthsChange,
  dateRange,
  onDateRangeChange,
  presetView,
  onPresetViewChange,
  customMinBalance,
  onCustomMinBalanceChange,
  selectedIncomeIds,
  onSelectedIncomeIdsChange,
  showToast
}) {
  const containerRef = useRef(null);

  // Local width state initialized from persisted settings or default
  const [widths, setWidths] = useState(() => ({
    canvas: panelWidths?.canvas || null,
    inspector: panelWidths?.inspector || null,
    table: panelWidths?.table || null
  }));

  // Sync external panelWidths changes
  useEffect(() => {
    if (panelWidths) {
      setWidths({
        canvas: panelWidths.canvas || null,
        inspector: panelWidths.inspector || null,
        table: panelWidths.table || null
      });
    }
  }, [panelWidths]);

  const handleResetSplitters = () => {
    const next = { canvas: null, inspector: null, table: null };
    setWidths(next);
    onPanelWidthsChange(next);
    showToast('Ukuran panel dikembalikan ke default');
  };

  // Drag splitter between Canvas and Inspector/Table
  const handleDragCanvasSplitter = (deltaX) => {
    const container = containerRef.current;
    if (!container) return;

    const currentCanvasWidth = container.querySelector('#canvasWrapper')?.getBoundingClientRect().width || 400;
    const minLeft = 240;
    const maxLeft = container.getBoundingClientRect().width - 240;

    let newCanvasWidth = Math.max(minLeft, Math.min(maxLeft, currentCanvasWidth + deltaX));
    const next = { ...widths, canvas: `${newCanvasWidth}px` };
    setWidths(next);
    onPanelWidthsChange(next);
  };

  // Drag splitter between Inspector and Table in Split mode
  const handleDragInspectorSplitter = (deltaX) => {
    const container = containerRef.current;
    if (!container) return;

    const currentInspectorWidth = container.querySelector('#inspectorSidebar')?.getBoundingClientRect().width || 320;
    const minInspector = 200;
    const maxInspector = 500;

    let newInspectorWidth = Math.max(minInspector, Math.min(maxInspector, currentInspectorWidth + deltaX));
    const next = { ...widths, inspector: `${newInspectorWidth}px` };
    setWidths(next);
    onPanelWidthsChange(next);
  };

  const containerClasses = [
    'workspace-container',
    `mode-${currentView}`,
    !isInspectorOpen ? 'inspector-hidden' : ''
  ].filter(Boolean).join(' ');

  return (
    <main id="workspaceContainer" ref={containerRef} className={containerClasses}>
      {/* 1. Flow Canvas Panel */}
      <div
        style={{
          display: currentView === 'table' ? 'none' : 'flex',
          flex: widths.canvas ? 'none' : undefined,
          width: widths.canvas || undefined,
          minWidth: 240
        }}
      >
        <FlowCanvasView
          canvasMode={canvasMode}
          activePocketFilterIds={activePocketFilterIds}
          onNodeSelect={(id) => {
            onSelectNode(id);
          }}
          onToggleInspector={onToggleInspector}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          presetView={presetView}
          onPresetViewChange={onPresetViewChange}
          customMinBalance={customMinBalance}
          onCustomMinBalanceChange={onCustomMinBalanceChange}
          selectedIncomeIds={selectedIncomeIds}
          onSelectedIncomeIdsChange={onSelectedIncomeIdsChange}
          scopeFilter={scopeFilter}
          showToast={showToast}
        />
      </div>

      {/* Splitter 1: Canvas to Inspector / Table */}
      {currentView !== 'table' && (
        <PanelSplitter
          id="splitterCanvas"
          onDrag={handleDragCanvasSplitter}
          onReset={handleResetSplitters}
        />
      )}

      {/* 2. Node Inspector Panel */}
      {isInspectorOpen && (
        <div
          style={{
            flex: widths.inspector ? 'none' : undefined,
            width: widths.inspector || undefined,
            minWidth: 200
          }}
        >
          <NodeInspector
            selectedNodeId={selectedNodeId}
            isOpen={isInspectorOpen}
            onClose={onToggleInspector}
            onOpenCreateNode={onOpenCreateNode}
            showToast={showToast}
          />
        </div>
      )}

      {/* Splitter 2: Inspector to Table (Only in Split View when Inspector is Open) */}
      {currentView === 'split' && isInspectorOpen && (
        <PanelSplitter
          id="splitterInspector"
          onDrag={handleDragInspectorSplitter}
          onReset={handleResetSplitters}
        />
      )}

      {/* 3. Table Ledger Panel */}
      <div
        style={{
          display: currentView === 'flow' ? 'none' : 'flex',
          flex: 1,
          minWidth: 240
        }}
      >
        <TableLedger
          isDetailedMode={isDetailedMode}
          onToggleDetailedMode={onToggleDetailedMode}
          sortOrder={tableSortOrder}
          onToggleSortOrder={onToggleSortOrder}
          tableFilter={tableFilter}
          onTableFilterChange={onTableFilterChange}
          scopeFilter={scopeFilter}
          activePocketFilterIds={activePocketFilterIds}
          nodeClickAction={nodeClickAction}
          onNodeClickActionChange={onNodeClickActionChange}
          onSelectNode={onSelectNode}
          onEditTransaction={onEditTransaction}
          dateRange={dateRange}
          presetView={presetView}
          customMinBalance={customMinBalance}
          selectedIncomeIds={selectedIncomeIds}
          showToast={showToast}
        />
      </div>
    </main>
  );
}
