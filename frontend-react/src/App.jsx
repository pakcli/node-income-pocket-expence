import React, { useState, useCallback, useMemo } from 'react';
import { useStore } from './hooks/useStore.js';
import { useSettings } from './hooks/useSettings.js';
import { MasterHeader } from './components/Header/MasterHeader.jsx';
import { KpiBar } from './components/Kpis/KpiBar.jsx';
import { WorkspaceLayout } from './components/Workspace/WorkspaceLayout.jsx';
import { Toast } from './components/Toast/Toast.jsx';
import { ModalAddIncome } from './components/Modals/ModalAddIncome.jsx';
import { ModalAddExpense } from './components/Modals/ModalAddExpense.jsx';
import { ModalTransfer } from './components/Modals/ModalTransfer.jsx';
import { ModalAddPocket } from './components/Modals/ModalAddPocket.jsx';
import { ModalEditTransaction } from './components/Modals/ModalEditTransaction.jsx';
import { ModalAddAccount } from './components/Modals/ModalAddAccount.jsx';

export default function App() {
  const { pockets } = useStore();

  const pocketIds = useMemo(() => pockets.map(p => p.id), [pockets]);
  const { settings, updateSetting, updateSettings } = useSettings(pocketIds);

  // Modal control
  const [activeModal, setActiveModal] = useState(null); // 'income' | 'expense' | 'transfer' | 'pocket' | 'addAccount' | null
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Inspector node selection
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const handleSelectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    if (!settings.isInspectorOpen) {
      updateSetting('isInspectorOpen', true);
    }
  }, [settings.isInspectorOpen, updateSetting]);

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      <Toast toast={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Row 1: Master Executive Header */}
      <MasterHeader
        currentView={settings.currentView}
        onViewChange={(view) => updateSetting('currentView', view)}
        canvasMode={settings.canvasMode}
        onCanvasModeChange={(mode) => updateSetting('canvasMode', mode)}
        scopeFilter={settings.scopeFilter}
        onScopeFilterChange={(scope) => updateSetting('scopeFilter', scope)}
        onOpenModal={(modalName) => setActiveModal(modalName)}
        showToast={showToast}
      />

      {/* Row 2: Financial Flow KPI Bar */}
      <KpiBar
        activePocketFilterIds={settings.activePocketFilterIds}
        onPocketFilterChange={(ids) => updateSetting('activePocketFilterIds', ids)}
        showToast={showToast}
      />

      {/* Row 3: Resizable Master Workspace Panels */}
      <WorkspaceLayout
        currentView={settings.currentView}
        isInspectorOpen={settings.isInspectorOpen}
        onToggleInspector={() => updateSetting('isInspectorOpen', !settings.isInspectorOpen)}
        canvasMode={settings.canvasMode}
        activePocketFilterIds={settings.activePocketFilterIds}
        scopeFilter={settings.scopeFilter}
        tableSortOrder={settings.tableSortOrder}
        onToggleSortOrder={() => updateSetting('tableSortOrder', settings.tableSortOrder === 'latest' ? 'oldest' : 'latest')}
        isDetailedMode={settings.isTableDetailedMode}
        onToggleDetailedMode={() => updateSetting('isTableDetailedMode', !settings.isTableDetailedMode)}
        tableFilter={settings.tableFilter}
        onTableFilterChange={(filter) => updateSetting('tableFilter', filter)}
        nodeClickAction={settings.nodeClickAction}
        onNodeClickActionChange={(action) => updateSetting('nodeClickAction', action)}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
        onOpenCreateNode={() => setActiveModal('pocket')}
        onEditTransaction={(tx) => setEditingTransaction(tx)}
        panelWidths={settings.panelWidths}
        onPanelWidthsChange={(widths) => updateSetting('panelWidths', widths)}
        showToast={showToast}
      />

      {/* Modals Container */}
      <ModalAddIncome
        isOpen={activeModal === 'income'}
        onClose={() => setActiveModal(null)}
        showToast={showToast}
      />
      <ModalAddExpense
        isOpen={activeModal === 'expense'}
        onClose={() => setActiveModal(null)}
        showToast={showToast}
      />
      <ModalTransfer
        isOpen={activeModal === 'transfer'}
        onClose={() => setActiveModal(null)}
        showToast={showToast}
      />
      <ModalAddPocket
        isOpen={activeModal === 'pocket'}
        onClose={() => setActiveModal(null)}
        showToast={showToast}
      />
      <ModalAddAccount
        isOpen={activeModal === 'addAccount'}
        onClose={() => setActiveModal(null)}
        showToast={showToast}
      />
      <ModalEditTransaction
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        showToast={showToast}
      />
    </div>
  );
}
