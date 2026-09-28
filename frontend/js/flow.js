// Flow Canvas Engine - Blender Node Style (Brief v04)
// Features: Bulletproof Window Pointer Drag-and-Drop, Live Drop Target Ghost Slot, Clean Frame Headers, Auto-Expanding Canvas Height

import { store } from './store.js';
import { i18n } from './i18n.js';

const ORDER_STORAGE_KEY = 'spm_node_sort_order_v1';

export class FlowCanvas {
  constructor(containerId, onSelectNode) {
    this.container = document.getElementById(containerId);
    this.onSelectNode = onSelectNode;
    this.mode = 'both'; // 'simple' | 'irl' | 'both'
    this.selectedNodeId = null;

    // Load custom sort order for each column
    this.sortOrder = this.loadSortOrder();

    // Node registry
    this.nodePositions = {};
    this.columnSlots = {};
    this.activeDragCleanup = null;

    window.addEventListener('resize', () => this.render());
  }

  loadSortOrder() {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { income: [], pocket: [], expense: [] };
  }

  saveSortOrder() {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(this.sortOrder));
    } catch (e) {}
  }

  setMode(mode) {
    this.mode = mode;
    this.render();
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.render();
    if (this.onSelectNode) {
      this.onSelectNode(nodeId);
    }
  }

  getSortedItems(items, columnKey) {
    const order = this.sortOrder[columnKey] || [];
    const sorted = [...items].sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
    this.sortOrder[columnKey] = sorted.map(i => i.id);
    return sorted;
  }

  render() {
    if (!this.container) return;

    // If an active drag listener was lingering, clean it up safely
    if (this.activeDragCleanup) {
      this.activeDragCleanup();
      this.activeDragCleanup = null;
    }

    this.container.innerHTML = '';

    const width = this.container.clientWidth || 800;

    // Calculate required canvas height dynamically so nodes NEVER get cramped or overlap
    const maxColCount = Math.max(
      store.state.incomeSources.length,
      store.state.pockets.length,
      store.state.expenseCategories.length,
      3
    );
    const nodeHeight = 114;
    const spacing = 24;
    const totalNodeHeight = 96;

    let height;
    if (this.mode === 'simple') {
      height = Math.max(480, this.container.clientHeight || 480);
    } else if (this.mode === 'both') {
      const neededHeight = 56 + totalNodeHeight + 24 + (maxColCount * (nodeHeight + spacing)) + 80;
      height = Math.max(680, neededHeight, this.container.clientHeight || 680);
    } else { // 'irl'
      const neededHeight = maxColCount * (nodeHeight + spacing) + 120;
      height = Math.max(580, neededHeight, this.container.clientHeight || 580);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('flow-svg');
    this.svg = svg;

    // Defs for Blender-style filters, markers & gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="blender-shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.6" />
      </filter>

      <filter id="blender-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f97316" flood-opacity="0.9" />
      </filter>

      <filter id="blender-drag-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000000" flood-opacity="0.9" />
      </filter>

      <marker id="socket-arrow-green" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10b981" />
      </marker>
      <marker id="socket-arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
      </marker>
      <marker id="socket-arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f87171" />
      </marker>
      <marker id="socket-arrow-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#c084fc" />
      </marker>
    `;
    svg.appendChild(defs);

    // Layer 1: Blender Frames Group
    const framesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    framesGroup.classList.add('frames-group');
    svg.appendChild(framesGroup);
    this.framesGroup = framesGroup;

    // Layer 2: Wire Edges Group
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.classList.add('edges-group');
    svg.appendChild(edgesGroup);
    this.edgesGroup = edgesGroup;

    // Layer 3: Nodes Group
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.classList.add('nodes-group');
    svg.appendChild(nodesGroup);
    this.nodesGroup = nodesGroup;

    // Layer 4: Drop Target Ghost Preview Group (topmost layer, pointer-events none)
    const previewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    previewGroup.classList.add('preview-group');
    previewGroup.style.pointerEvents = 'none';
    svg.appendChild(previewGroup);
    this.previewGroup = previewGroup;

    if (this.mode === 'simple') {
      this.renderSimpleMode(width, height, nodeHeight, spacing);
    } else if (this.mode === 'both') {
      this.renderBothMode(width, height, nodeHeight, spacing);
    } else {
      this.renderIRLMode(width, height, nodeHeight, spacing);
    }

    this.container.appendChild(svg);
  }

  // MODE 1: SIMPLE MODE (Macro View - Only 3 Aggregate Total Nodes)
  renderSimpleMode(width, height, nodeHeight, spacing) {
    const totalIncome = store.getTotalIncome();
    const totalBalance = store.getTotalBalance();
    const totalExpense = store.getTotalExpense();

    const incomes = store.state.incomeSources;
    const pockets = store.state.pockets;
    const expenses = store.state.expenseCategories;

    const nodeWidth = Math.min(260, Math.max(200, width * 0.28));
    const totalNodeHeight = 98;

    const col1X = Math.max(20, width * 0.04);
    const col2X = width * 0.38;
    const col3X = Math.min(width - nodeWidth - 20, width * 0.72);

    const centerY = Math.max(90, Math.floor((height - totalNodeHeight) / 2) - 20);

    this.nodePositions = {};
    this.columnSlots = {};

    // 1. Render 3 Frames for Macro Overview
    this.renderBlenderFrame(this.framesGroup, {
      title: 'TOTAL INFLOW (SUMMARY)',
      accentColor: '#10b981',
      x: col1X - 12,
      y: centerY - 36,
      width: nodeWidth + 24,
      height: totalNodeHeight + 54
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'TOTAL WALLETS (SUMMARY)',
      accentColor: '#38bdf8',
      x: col2X - 12,
      y: centerY - 36,
      width: nodeWidth + 24,
      height: totalNodeHeight + 54
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'TOTAL EXPENSES (SUMMARY)',
      accentColor: '#f87171',
      x: col3X - 12,
      y: centerY - 36,
      width: nodeWidth + 24,
      height: totalNodeHeight + 54
    });

    // 2. Col 1 Total Node
    this.nodePositions['total-income'] = {
      id: 'total-income',
      outX: col1X + nodeWidth,
      outY: centerY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-income',
      x: col1X,
      y: centerY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL PEMASUKAN',
      theme: 'income',
      headerColor: '#065f46',
      badge: 'TOTAL',
      currentValue: `+${i18n.formatCurrency(totalIncome)}`,
      valueLabel: 'Total Dana Masuk',
      subtitle: `${incomes.length} Sumber Dana Terdaftar`,
      inputs: [],
      outputs: [{ label: 'Total Inflow ▶', yOffset: 64, color: '#10b981' }],
      selected: this.selectedNodeId === 'total-income'
    });

    // 3. Col 2 Total Node
    this.nodePositions['total-pocket'] = {
      id: 'total-pocket',
      inX: col2X,
      inY: centerY + 64,
      outX: col2X + nodeWidth,
      outY: centerY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-pocket',
      x: col2X,
      y: centerY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL SALDO KANTONG',
      theme: 'pocket',
      headerColor: '#1e40af',
      badge: 'TOTAL',
      currentValue: i18n.formatCurrency(totalBalance),
      valueLabel: 'Saldo Likuiditas Kas',
      subtitle: `${pockets.length} Kantong & Rekening`,
      inputs: [{ label: 'Inflow', yOffset: 64, color: '#38bdf8' }],
      outputs: [{ label: 'Outflow ▶', yOffset: 64, color: '#f87171' }],
      selected: this.selectedNodeId === 'total-pocket'
    });

    // 4. Col 3 Total Node
    this.nodePositions['total-expense'] = {
      id: 'total-expense',
      inX: col3X,
      inY: centerY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-expense',
      x: col3X,
      y: centerY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL PENGELUARAN',
      theme: 'expense',
      headerColor: '#991b1b',
      badge: 'TOTAL',
      currentValue: `-${i18n.formatCurrency(totalExpense)}`,
      valueLabel: 'Total Dana Keluar',
      subtitle: `${expenses.length} Pos Pengeluaran`,
      inputs: [{ label: 'Bayar Beban', yOffset: 64, color: '#f87171' }],
      outputs: [],
      selected: this.selectedNodeId === 'total-expense'
    });

    this.renderEdges();
  }

  // MODE 2: BOTH MODE (Total Summary at Top of Each Column + IRL Multi-Nodes Below in Same Panel)
  renderBothMode(width, height, nodeHeight, spacing) {
    const incomes = this.getSortedItems(store.state.incomeSources, 'income');
    const pockets = this.getSortedItems(store.state.pockets, 'pocket');
    const expenses = this.getSortedItems(store.state.expenseCategories, 'expense');

    const totalIncome = store.getTotalIncome();
    const totalBalance = store.getTotalBalance();
    const totalExpense = store.getTotalExpense();

    const nodeWidth = Math.min(250, Math.max(195, width * 0.27));
    const totalNodeHeight = 96;

    const col1X = Math.max(20, width * 0.04);
    const col2X = width * 0.38;
    const col3X = Math.min(width - nodeWidth - 20, width * 0.72);

    const topY = 56;
    const detailStartY = topY + totalNodeHeight + 24;

    const calcY = (items, customSpacing = spacing) => {
      return items.map((_, i) => detailStartY + i * (nodeHeight + customSpacing));
    };

    const incY = calcY(incomes);
    const pktY = calcY(pockets, spacing + 6);
    const expY = calcY(expenses);

    this.nodePositions = {};

    // Column Slots for IRL drag sorting (strictly for detail nodes below totals)
    this.columnSlots = {
      income: incY.map((y, idx) => ({ y, index: idx, x: col1X, width: nodeWidth, height: nodeHeight })),
      pocket: pktY.map((y, idx) => ({ y, index: idx, x: col2X, width: nodeWidth, height: nodeHeight })),
      expense: expY.map((y, idx) => ({ y, index: idx, x: col3X, width: nodeWidth, height: nodeHeight }))
    };

    // Calculate Column Enclosure Heights for Frames
    const maxIncY = incY.length > 0 ? (incY[incY.length - 1] + nodeHeight) : (detailStartY + 40);
    const maxPktY = pktY.length > 0 ? (pktY[pktY.length - 1] + nodeHeight) : (detailStartY + 40);
    const maxExpY = expY.length > 0 ? (expY[expY.length - 1] + nodeHeight) : (detailStartY + 40);

    // 1. Render Enclosing Blender Frames
    this.renderBlenderFrame(this.framesGroup, {
      title: 'INFLOW SOURCES (TOTAL + DETAIL)',
      accentColor: '#10b981',
      x: col1X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: maxIncY - 20 + 20
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'WALLETS & TRANSFERS (TOTAL + DETAIL)',
      accentColor: '#38bdf8',
      x: col2X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: maxPktY - 20 + 20
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'EXPENSE OUTFLOWS (TOTAL + DETAIL)',
      accentColor: '#f87171',
      x: col3X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: maxExpY - 20 + 20
    });

    // 2. Render Top Total Summary Nodes (Fixed at Top of Columns)
    // Col 1 Total
    this.nodePositions['total-income'] = {
      id: 'total-income',
      outX: col1X + nodeWidth,
      outY: topY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-income',
      x: col1X,
      y: topY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL PEMASUKAN',
      theme: 'income',
      headerColor: '#065f46',
      badge: 'TOTAL',
      currentValue: `+${i18n.formatCurrency(totalIncome)}`,
      valueLabel: 'Total Dana Masuk',
      subtitle: `${incomes.length} Sumber Dana Masuk`,
      inputs: [],
      outputs: [{ label: 'Total Inflow ▶', yOffset: 64, color: '#10b981' }],
      selected: this.selectedNodeId === 'total-income'
    });

    // Col 2 Total
    this.nodePositions['total-pocket'] = {
      id: 'total-pocket',
      inX: col2X,
      inY: topY + 64,
      outX: col2X + nodeWidth,
      outY: topY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-pocket',
      x: col2X,
      y: topY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL SALDO KANTONG',
      theme: 'pocket',
      headerColor: '#1e40af',
      badge: 'TOTAL',
      currentValue: i18n.formatCurrency(totalBalance),
      valueLabel: 'Saldo Likuiditas Kas',
      subtitle: `${pockets.length} Kantong Aktif`,
      inputs: [{ label: 'Inflow', yOffset: 64, color: '#38bdf8' }],
      outputs: [{ label: 'Outflow ▶', yOffset: 64, color: '#f87171' }],
      selected: this.selectedNodeId === 'total-pocket'
    });

    // Col 3 Total
    this.nodePositions['total-expense'] = {
      id: 'total-expense',
      inX: col3X,
      inY: topY + 64
    };
    this.createBlenderTotalNode(this.nodesGroup, {
      id: 'total-expense',
      x: col3X,
      y: topY,
      width: nodeWidth,
      height: totalNodeHeight,
      title: 'TOTAL PENGELUARAN',
      theme: 'expense',
      headerColor: '#991b1b',
      badge: 'TOTAL',
      currentValue: `-${i18n.formatCurrency(totalExpense)}`,
      valueLabel: 'Total Dana Keluar',
      subtitle: `${expenses.length} Pos Pengeluaran`,
      inputs: [{ label: 'Bayar Beban', yOffset: 64, color: '#f87171' }],
      outputs: [],
      selected: this.selectedNodeId === 'total-expense'
    });

    // 3. Render IRL Individual Nodes (Below the Totals)
    // Incomes
    incomes.forEach((inc, i) => {
      const x = col1X;
      const y = incY[i];
      this.nodePositions[inc.id] = {
        id: inc.id,
        columnKey: 'income',
        x, y, width: nodeWidth, height: nodeHeight,
        outX: x + nodeWidth,
        outY: y + 84
      };

      this.createBlenderNode(this.nodesGroup, {
        id: inc.id,
        columnKey: 'income',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: inc.label,
        theme: 'income',
        headerColor: '#065f46',
        badge: 'SOURCE',
        currentValue: i18n.formatCurrency(inc.total),
        valueLabel: 'Total Dana Masuk',
        inputs: [],
        outputs: [{ label: 'Transfer Out ▶', yOffset: 84, color: '#10b981' }],
        selected: this.selectedNodeId === inc.id
      });
    });

    // Pockets
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      this.nodePositions[pkt.id] = {
        id: pkt.id,
        columnKey: 'pocket',
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x,
        inY: y + 74,
        outX: x + nodeWidth,
        outY: y + 74,
        transferOutX: x + nodeWidth,
        transferOutY: y + 96
      };

      this.createBlenderNode(this.nodesGroup, {
        id: pkt.id,
        columnKey: 'pocket',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: pkt.label,
        theme: 'pocket',
        headerColor: '#1e40af',
        badge: pkt.category.toUpperCase(),
        currentValue: i18n.formatCurrency(pkt.balance),
        valueLabel: 'Saldo Sekarang',
        inputs: [{ label: 'Inflow (Masuk)', yOffset: 74, color: '#38bdf8' }],
        outputs: [
          { label: 'Belanja Out ▶', yOffset: 74, color: '#f87171' },
          { label: 'Transfer ⇄', yOffset: 96, color: '#c084fc' }
        ],
        selected: this.selectedNodeId === pkt.id
      });
    });

    // Expenses
    expenses.forEach((exp, i) => {
      const x = col3X;
      const y = expY[i];
      this.nodePositions[exp.id] = {
        id: exp.id,
        columnKey: 'expense',
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x,
        inY: y + 84
      };

      this.createBlenderNode(this.nodesGroup, {
        id: exp.id,
        columnKey: 'expense',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: exp.label,
        theme: 'expense',
        headerColor: '#991b1b',
        badge: 'EXPENSE',
        currentValue: i18n.formatCurrency(exp.total),
        valueLabel: 'Total Pengeluaran',
        inputs: [{ label: 'Bayar In', yOffset: 84, color: '#f87171' }],
        outputs: [],
        selected: this.selectedNodeId === exp.id
      });
    });

    // 4. Render All Edges (Top Aggregate Macro + IRL Micro)
    this.renderEdges();
  }

  renderIRLMode(width, height, nodeHeight, spacing) {
    const incomes = this.getSortedItems(store.state.incomeSources, 'income');
    const pockets = this.getSortedItems(store.state.pockets, 'pocket');
    const expenses = this.getSortedItems(store.state.expenseCategories, 'expense');

    const nodeWidth = Math.min(245, Math.max(195, width * 0.27));

    const col1X = width * 0.04;
    const col2X = width * 0.38;
    const col3X = width * 0.72;

    const calcY = (items, customSpacing = spacing) => {
      const startY = 60;
      return items.map((_, i) => startY + i * (nodeHeight + customSpacing));
    };

    const incY = calcY(incomes);
    const pktY = calcY(pockets, spacing + 6);
    const expY = calcY(expenses);

    this.nodePositions = {};
    this.columnSlots = {
      income: incY.map((y, idx) => ({ y, index: idx, x: col1X, width: nodeWidth, height: nodeHeight })),
      pocket: pktY.map((y, idx) => ({ y, index: idx, x: col2X, width: nodeWidth, height: nodeHeight })),
      expense: expY.map((y, idx) => ({ y, index: idx, x: col3X, width: nodeWidth, height: nodeHeight }))
    };

    // Render Frames for IRL Mode
    this.renderBlenderFrame(this.framesGroup, {
      title: 'INFLOW SOURCES',
      accentColor: '#10b981',
      x: col1X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: (incomes.length * nodeHeight) + (incomes.length * spacing) + 40
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'WALLETS & TRANSFERS',
      accentColor: '#38bdf8',
      x: col2X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: (pockets.length * nodeHeight) + (pockets.length * (spacing + 6)) + 40
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: 'EXPENSE OUTFLOWS',
      accentColor: '#f87171',
      x: col3X - 12,
      y: 20,
      width: nodeWidth + 24,
      height: (expenses.length * nodeHeight) + (expenses.length * spacing) + 40
    });

    // Incomes
    incomes.forEach((inc, i) => {
      const x = col1X;
      const y = incY[i];
      this.nodePositions[inc.id] = {
        id: inc.id,
        columnKey: 'income',
        x, y, width: nodeWidth, height: nodeHeight,
        outX: x + nodeWidth,
        outY: y + 84
      };

      this.createBlenderNode(this.nodesGroup, {
        id: inc.id,
        columnKey: 'income',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: inc.label,
        theme: 'income',
        headerColor: '#065f46',
        badge: 'SOURCE',
        currentValue: i18n.formatCurrency(inc.total),
        valueLabel: 'Total Dana Masuk',
        inputs: [],
        outputs: [{ label: 'Transfer Out ▶', yOffset: 84, color: '#10b981' }],
        selected: this.selectedNodeId === inc.id
      });
    });

    // Pockets
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      this.nodePositions[pkt.id] = {
        id: pkt.id,
        columnKey: 'pocket',
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x,
        inY: y + 74,
        outX: x + nodeWidth,
        outY: y + 74,
        transferOutX: x + nodeWidth,
        transferOutY: y + 96
      };

      this.createBlenderNode(this.nodesGroup, {
        id: pkt.id,
        columnKey: 'pocket',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: pkt.label,
        theme: 'pocket',
        headerColor: '#1e40af',
        badge: pkt.category.toUpperCase(),
        currentValue: i18n.formatCurrency(pkt.balance),
        valueLabel: 'Saldo Sekarang',
        inputs: [{ label: 'Inflow (Masuk)', yOffset: 74, color: '#38bdf8' }],
        outputs: [
          { label: 'Belanja Out ▶', yOffset: 74, color: '#f87171' },
          { label: 'Transfer ⇄', yOffset: 96, color: '#c084fc' }
        ],
        selected: this.selectedNodeId === pkt.id
      });
    });

    // Expenses
    expenses.forEach((exp, i) => {
      const x = col3X;
      const y = expY[i];
      this.nodePositions[exp.id] = {
        id: exp.id,
        columnKey: 'expense',
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x,
        inY: y + 84
      };

      this.createBlenderNode(this.nodesGroup, {
        id: exp.id,
        columnKey: 'expense',
        slotIndex: i,
        x, y, width: nodeWidth, height: nodeHeight,
        title: exp.label,
        theme: 'expense',
        headerColor: '#991b1b',
        badge: 'EXPENSE',
        currentValue: i18n.formatCurrency(exp.total),
        valueLabel: 'Total Pengeluaran',
        inputs: [{ label: 'Bayar In', yOffset: 84, color: '#f87171' }],
        outputs: [],
        selected: this.selectedNodeId === exp.id
      });
    });

    this.renderEdges();
  }

  // Draw Clean Non-Overlapping Blender Frame
  renderBlenderFrame(parent, { title, accentColor, x, y, width, height }) {
    const frameG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    frameG.classList.add('blender-frame');

    // Outer Enclosure Box
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
    rect.setAttribute('fill', 'rgba(15, 23, 42, 0.45)');
    rect.setAttribute('stroke', 'rgba(255, 255, 255, 0.10)');
    rect.setAttribute('stroke-width', '1.5');
    rect.setAttribute('stroke-dasharray', '5,4');
    frameG.appendChild(rect);

    // Frame Header Bar
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerRect.setAttribute('x', x.toString());
    headerRect.setAttribute('y', y.toString());
    headerRect.setAttribute('width', width.toString());
    headerRect.setAttribute('height', '28');
    headerRect.setAttribute('rx', '8');
    headerRect.setAttribute('ry', '8');
    headerRect.setAttribute('fill', 'rgba(30, 41, 59, 0.85)');
    headerRect.setAttribute('stroke', accentColor);
    headerRect.setAttribute('stroke-width', '1');
    headerRect.setAttribute('stroke-opacity', '0.45');
    frameG.appendChild(headerRect);

    // Color Accent Dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', (x + 12).toString());
    dot.setAttribute('cy', (y + 14).toString());
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', accentColor);
    frameG.appendChild(dot);

    // Clean Title (Truncated if too long)
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (x + 22).toString());
    label.setAttribute('y', (y + 18).toString());
    label.setAttribute('font-size', '10');
    label.setAttribute('font-weight', '800');
    label.setAttribute('letter-spacing', '0.5');
    label.setAttribute('fill', accentColor);
    const maxChars = Math.max(10, Math.floor((width - 90) / 8));
    label.textContent = title.length > maxChars ? title.slice(0, maxChars) + '...' : title;
    frameG.appendChild(label);

    // Distinct Pill Badge on Right
    const badgeW = 60;
    const badgeX = x + width - badgeW - 8;
    const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeRect.setAttribute('x', badgeX.toString());
    badgeRect.setAttribute('y', (y + 5).toString());
    badgeRect.setAttribute('width', badgeW.toString());
    badgeRect.setAttribute('height', '18');
    badgeRect.setAttribute('rx', '4');
    badgeRect.setAttribute('ry', '4');
    badgeRect.setAttribute('fill', 'rgba(15, 23, 42, 0.7)');
    badgeRect.setAttribute('stroke', 'rgba(255, 255, 255, 0.08)');
    frameG.appendChild(badgeRect);

    const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hint.setAttribute('x', (badgeX + badgeW / 2).toString());
    hint.setAttribute('y', (y + 17).toString());
    hint.setAttribute('text-anchor', 'middle');
    hint.setAttribute('font-size', '9');
    hint.setAttribute('font-weight', '700');
    hint.setAttribute('fill', '#94a3b8');
    hint.textContent = '⇅ SORT';
    frameG.appendChild(hint);

    parent.appendChild(frameG);
  }

  renderEdges() {
    this.edgesGroup.innerHTML = '';

    // 1. Top Aggregate Macro Edges (Simple & Both Mode)
    if (this.mode === 'simple' || this.mode === 'both') {
      const fromCol1 = this.nodePositions['total-income'];
      const toCol2 = this.nodePositions['total-pocket'];
      const toCol3 = this.nodePositions['total-expense'];

      if (fromCol1 && toCol2) {
        const isHighlighted = this.selectedNodeId === 'total-income' || this.selectedNodeId === 'total-pocket';
        this.drawBlenderBezierEdge(this.edgesGroup, fromCol1.outX, fromCol1.outY, toCol2.inX, toCol2.inY, '#10b981', 'url(#socket-arrow-green)', isHighlighted);
      }

      if (toCol2 && toCol3) {
        const isHighlighted = this.selectedNodeId === 'total-pocket' || this.selectedNodeId === 'total-expense';
        this.drawBlenderBezierEdge(this.edgesGroup, toCol2.outX, toCol2.outY, toCol3.inX, toCol3.inY, '#f87171', 'url(#socket-arrow-red)', isHighlighted);
      }
    }

    // 2. Individual Transaction Edges (IRL & Both Mode)
    if (this.mode === 'irl' || this.mode === 'both') {
      const edgeDrawn = new Set();

      store.state.transactions.forEach(tx => {
        const edgeKey = `${tx.fromId}->${tx.toId}`;
        if (edgeDrawn.has(edgeKey)) return;
        edgeDrawn.add(edgeKey);

        const fromSocket = this.nodePositions[tx.fromId];
        const toSocket = this.nodePositions[tx.toId];

        if (fromSocket && toSocket) {
          let startX, startY, endX, endY;
          const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;

          if (tx.type === 'transfer') {
            startX = fromSocket.transferOutX || fromSocket.outX;
            startY = fromSocket.transferOutY || fromSocket.outY;
            endX = toSocket.inX;
            endY = toSocket.inY;
            this.drawBlenderArcEdge(this.edgesGroup, startX, startY, endX, endY, '#c084fc', 'url(#socket-arrow-purple)', isHighlighted);
          } else {
            startX = fromSocket.outX;
            startY = fromSocket.outY;
            endX = toSocket.inX;
            endY = toSocket.inY;
            const color = tx.type === 'income' ? '#10b981' : '#f87171';
            const marker = tx.type === 'income' ? 'url(#socket-arrow-green)' : 'url(#socket-arrow-red)';
            this.drawBlenderBezierEdge(this.edgesGroup, startX, startY, endX, endY, color, marker, isHighlighted);
          }
        }
      });
    }
  }

  // Draw Dedicated Blender Total Node (Pinned Aggregate at Top of Columns)
  createBlenderTotalNode(parent, { id, x, y, width, height, title, theme, headerColor, badge, currentValue, valueLabel, subtitle, inputs, outputs, selected }) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node-blender node-blender-total node-${theme} ${selected ? 'node-selected' : ''}`);
    group.setAttribute('id', `node-el-${id}`);
    group.setAttribute('transform', `translate(0, 0)`);
    group.style.cursor = 'pointer';

    if (selected) {
      group.setAttribute('filter', 'url(#blender-glow)');
    } else {
      group.setAttribute('filter', 'url(#blender-shadow)');
    }

    // Outer Node Body Container
    const bodyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bodyRect.setAttribute('x', x.toString());
    bodyRect.setAttribute('y', y.toString());
    bodyRect.setAttribute('width', width.toString());
    bodyRect.setAttribute('height', height.toString());
    bodyRect.setAttribute('rx', '8');
    bodyRect.setAttribute('ry', '8');
    bodyRect.setAttribute('fill', '#1c212c');
    let borderColor = '#3b82f6';
    if (theme === 'income') borderColor = '#10b981';
    if (theme === 'expense') borderColor = '#ef4444';
    bodyRect.setAttribute('stroke', selected ? '#f97316' : borderColor);
    bodyRect.setAttribute('stroke-width', selected ? '2.5' : '1.4');
    bodyRect.setAttribute('stroke-opacity', selected ? '1' : '0.55');
    group.appendChild(bodyRect);

    // Header Bar
    const headerHeight = 26;
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const r = 8;
    const pathD = `
      M ${x + r} ${y}
      H ${x + width - r}
      Q ${x + width} ${y} ${x + width} ${y + r}
      V ${y + headerHeight}
      H ${x}
      V ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
    headerRect.setAttribute('d', pathD);
    headerRect.setAttribute('fill', headerColor);
    group.appendChild(headerRect);

    // Header Sigma Symbol
    const sigmaText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sigmaText.setAttribute('x', (x + 10).toString());
    sigmaText.setAttribute('y', (y + 17).toString());
    sigmaText.setAttribute('font-size', '13');
    sigmaText.setAttribute('font-weight', '900');
    sigmaText.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
    sigmaText.textContent = 'Σ';
    group.appendChild(sigmaText);

    // Header Title
    const headerTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    headerTitle.setAttribute('x', (x + 24).toString());
    headerTitle.setAttribute('y', (y + 17).toString());
    headerTitle.setAttribute('font-size', '11');
    headerTitle.setAttribute('font-weight', '800');
    headerTitle.setAttribute('letter-spacing', '0.5');
    headerTitle.setAttribute('fill', '#ffffff');
    headerTitle.textContent = title;
    group.appendChild(headerTitle);

    // Header Badge Pill
    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', (x + width - 10).toString());
    badgeText.setAttribute('y', (y + 17).toString());
    badgeText.setAttribute('text-anchor', 'end');
    badgeText.setAttribute('font-size', '9');
    badgeText.setAttribute('font-weight', '800');
    badgeText.setAttribute('letter-spacing', '0.5');
    badgeText.setAttribute('fill', 'rgba(255, 255, 255, 0.85)');
    badgeText.textContent = badge || 'TOTAL';
    group.appendChild(badgeText);

    // Content: Value Label
    const valLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valLabel.setAttribute('x', (x + 12).toString());
    valLabel.setAttribute('y', (y + 42).toString());
    valLabel.setAttribute('font-size', '10');
    valLabel.setAttribute('font-weight', '600');
    valLabel.setAttribute('fill', '#94a3b8');
    valLabel.textContent = `${valueLabel}:`;
    group.appendChild(valLabel);

    // Big Currency Total Value
    const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valText.setAttribute('x', (x + 12).toString());
    valText.setAttribute('y', (y + 61).toString());
    valText.setAttribute('font-size', '15');
    valText.setAttribute('font-weight', '900');
    valText.setAttribute('font-family', "'JetBrains Mono', monospace");
    let valColor = '#38bdf8';
    if (theme === 'income') valColor = '#34d399';
    if (theme === 'expense') valColor = '#f87171';
    valText.setAttribute('fill', valColor);
    valText.textContent = currentValue;
    group.appendChild(valText);

    // Subtitle Info (e.g. "4 Kantong Aktif")
    if (subtitle) {
      const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subText.setAttribute('x', (x + 12).toString());
      subText.setAttribute('y', (y + 78).toString());
      subText.setAttribute('font-size', '9');
      subText.setAttribute('font-weight', '600');
      subText.setAttribute('fill', '#64748b');
      subText.textContent = subtitle;
      group.appendChild(subText);
    }

    // Input Sockets
    inputs.forEach(inp => {
      const socketY = y + inp.yOffset;
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', x.toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', inp.color || '#38bdf8');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      if (inp.label) {
        const socketLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        socketLabel.setAttribute('x', (x + 10).toString());
        socketLabel.setAttribute('y', (socketY + 3.5).toString());
        socketLabel.setAttribute('font-size', '9');
        socketLabel.setAttribute('font-weight', '700');
        socketLabel.setAttribute('fill', '#94a3b8');
        socketLabel.textContent = `● ${inp.label}`;
        group.appendChild(socketLabel);
      }
    });

    // Output Sockets
    outputs.forEach(out => {
      const socketY = y + out.yOffset;
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', (x + width).toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', out.color || '#f87171');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      if (out.label) {
        const socketLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        socketLabel.setAttribute('x', (x + width - 10).toString());
        socketLabel.setAttribute('y', (socketY + 3.5).toString());
        socketLabel.setAttribute('text-anchor', 'end');
        socketLabel.setAttribute('font-size', '9');
        socketLabel.setAttribute('font-weight', '700');
        socketLabel.setAttribute('fill', '#94a3b8');
        socketLabel.textContent = `${out.label} ●`;
        group.appendChild(socketLabel);
      }
    });

    // Node click to inspect
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(id);
    });

    parent.appendChild(group);
  }

  createBlenderNode(parent, { id, columnKey, slotIndex, x, y, width, height, title, theme, headerColor, badge, currentValue, valueLabel, inputs, outputs, selected }) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node-blender node-${theme} ${selected ? 'node-selected' : ''}`);
    group.setAttribute('id', `node-el-${id}`);
    group.setAttribute('transform', `translate(0, 0)`);
    group.style.cursor = 'grab';

    if (selected) {
      group.setAttribute('filter', 'url(#blender-glow)');
    } else {
      group.setAttribute('filter', 'url(#blender-shadow)');
    }

    // 1. Outer Node Body Container
    const bodyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bodyRect.setAttribute('x', x.toString());
    bodyRect.setAttribute('y', y.toString());
    bodyRect.setAttribute('width', width.toString());
    bodyRect.setAttribute('height', height.toString());
    bodyRect.setAttribute('rx', '8');
    bodyRect.setAttribute('ry', '8');
    bodyRect.setAttribute('fill', '#20242d');
    bodyRect.setAttribute('stroke', selected ? '#f97316' : '#374151');
    bodyRect.setAttribute('stroke-width', selected ? '2.5' : '1.2');
    group.appendChild(bodyRect);

    // 2. Node Header
    const headerHeight = 28;
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const r = 8;
    const pathD = `
      M ${x + r} ${y}
      H ${x + width - r}
      Q ${x + width} ${y} ${x + width} ${y + r}
      V ${y + headerHeight}
      H ${x}
      V ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;
    headerRect.setAttribute('d', pathD);
    headerRect.setAttribute('fill', headerColor);
    group.appendChild(headerRect);

    // Drag Grip Dots
    const gripG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gripG.innerHTML = `
      <circle cx="${x + 10}" cy="${y + 11}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 15}" cy="${y + 11}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 10}" cy="${y + 17}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 15}" cy="${y + 17}" r="1.5" fill="rgba(255,255,255,0.7)" />
    `;
    group.appendChild(gripG);

    // Header Title
    const headerTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    headerTitle.setAttribute('x', (x + 22).toString());
    headerTitle.setAttribute('y', (y + 18).toString());
    headerTitle.setAttribute('font-size', '12');
    headerTitle.setAttribute('font-weight', '700');
    headerTitle.setAttribute('fill', '#ffffff');
    const maxChars = Math.floor(width / 13) - 2;
    headerTitle.textContent = title.length > maxChars ? title.slice(0, maxChars) + '...' : title;
    group.appendChild(headerTitle);

    // Header Badge Pill
    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', (x + width - 10).toString());
    badgeText.setAttribute('y', (y + 18).toString());
    badgeText.setAttribute('text-anchor', 'end');
    badgeText.setAttribute('font-size', '9');
    badgeText.setAttribute('font-weight', '800');
    badgeText.setAttribute('fill', 'rgba(255, 255, 255, 0.75)');
    badgeText.textContent = badge;
    group.appendChild(badgeText);

    // 3. Content Body - Line 1: Current Value
    const valLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valLabel.setAttribute('x', (x + 12).toString());
    valLabel.setAttribute('y', (y + 44).toString());
    valLabel.setAttribute('font-size', '10');
    valLabel.setAttribute('font-weight', '600');
    valLabel.setAttribute('fill', '#94a3b8');
    valLabel.textContent = `${valueLabel}:`;
    group.appendChild(valLabel);

    const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valText.setAttribute('x', (x + 12).toString());
    valText.setAttribute('y', (y + 62).toString());
    valText.setAttribute('font-size', '14');
    valText.setAttribute('font-weight', '800');
    valText.setAttribute('font-family', "'JetBrains Mono', monospace");
    let valColor = '#38bdf8';
    if (theme === 'income') valColor = '#34d399';
    if (theme === 'expense') valColor = '#f87171';
    valText.setAttribute('fill', valColor);
    valText.textContent = currentValue;
    group.appendChild(valText);

    // Divider Line
    const divLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    divLine.setAttribute('x1', (x + 8).toString());
    divLine.setAttribute('y1', (y + 68).toString());
    divLine.setAttribute('x2', (x + width - 8).toString());
    divLine.setAttribute('y2', (y + 68).toString());
    divLine.setAttribute('stroke', '#2d3340');
    divLine.setAttribute('stroke-width', '1');
    group.appendChild(divLine);

    // 4. Input Sockets & Labels (Left side)
    inputs.forEach(inp => {
      const socketY = y + inp.yOffset;
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', x.toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', inp.color || '#38bdf8');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      const socketLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      socketLabel.setAttribute('x', (x + 10).toString());
      socketLabel.setAttribute('y', (socketY + 4).toString());
      socketLabel.setAttribute('font-size', '10');
      socketLabel.setAttribute('font-weight', '600');
      socketLabel.setAttribute('fill', '#cbd5e1');
      socketLabel.textContent = `● ${inp.label}`;
      group.appendChild(socketLabel);
    });

    // 5. Output Sockets & Labels (Right side)
    outputs.forEach(out => {
      const socketY = y + out.yOffset;
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', (x + width).toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', out.color || '#f87171');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      const socketLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      socketLabel.setAttribute('x', (x + width - 10).toString());
      socketLabel.setAttribute('y', (socketY + 4).toString());
      socketLabel.setAttribute('text-anchor', 'end');
      socketLabel.setAttribute('font-size', '10');
      socketLabel.setAttribute('font-weight', '600');
      socketLabel.setAttribute('fill', '#cbd5e1');
      socketLabel.textContent = `${out.label} ●`;
      group.appendChild(socketLabel);
    });

    // 6. Attach Safe Window-Based Drag Sort Listener
    this.attachSafeDragSortListeners(group, id, columnKey, slotIndex, x, y, width, height);

    parent.appendChild(group);
  }

  attachSafeDragSortListeners(nodeGroup, id, columnKey, initialSlotIndex, x, initialY, width, height) {
    const slots = this.columnSlots[columnKey] || [];

    const onPointerDown = (downEvent) => {
      // Only primary mouse button or touch
      if (downEvent.button !== 0 && downEvent.pointerType === 'mouse') return;

      const startY = downEvent.clientY;
      let isDragging = false;
      let ghostLineG = null;
      let currentTargetIndex = initialSlotIndex;
      let rafId = null;
      let pendingDeltaY = null;

      // Helper to compute target slot index
      const computeTargetIndex = (visualY) => {
        let bestIdx = initialSlotIndex;
        let minDiff = Infinity;
        slots.forEach((s, idx) => {
          const diff = Math.abs(visualY - s.y);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        });
        return bestIdx;
      };

      // Helper to compute insertion line Y coordinate
      const computeLineY = (targetIdx, initialIdx, deltaY) => {
        if (!slots.length) return initialY;
        if (targetIdx === initialIdx) {
          const s = slots[initialIdx];
          return deltaY < 0 ? (s.y - 10) : (s.y + height + 10);
        }
        if (targetIdx < initialIdx) {
          const s = slots[targetIdx];
          if (targetIdx === 0) {
            return s.y - 10;
          }
          const prev = slots[targetIdx - 1];
          return (prev.y + height + s.y) / 2;
        } else {
          const s = slots[targetIdx];
          if (targetIdx === slots.length - 1) {
            return s.y + height + 10;
          }
          const next = slots[targetIdx + 1];
          return (s.y + height + next.y) / 2;
        }
      };

      // Create glowing ghost insertion line (●── DROP HERE ──●)
      const createGhostLine = (lineY) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('blender-ghost-line');

        const x1 = x - 6;
        const x2 = x + width + 6;
        const midX = x + width / 2;

        // 1. Ambient Glow Line
        const glowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        glowLine.classList.add('ghost-glow-line');
        glowLine.setAttribute('x1', x1.toString());
        glowLine.setAttribute('y1', lineY.toString());
        glowLine.setAttribute('x2', x2.toString());
        glowLine.setAttribute('y2', lineY.toString());
        glowLine.setAttribute('stroke', '#f97316');
        glowLine.setAttribute('stroke-width', '5');
        glowLine.setAttribute('stroke-linecap', 'round');
        glowLine.setAttribute('filter', 'url(#blender-glow)');
        g.appendChild(glowLine);

        // 2. Crisp Core Line
        const coreLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        coreLine.classList.add('ghost-core-line');
        coreLine.setAttribute('x1', x1.toString());
        coreLine.setAttribute('y1', lineY.toString());
        coreLine.setAttribute('x2', x2.toString());
        coreLine.setAttribute('y2', lineY.toString());
        coreLine.setAttribute('stroke', '#f97316');
        coreLine.setAttribute('stroke-width', '2.5');
        coreLine.setAttribute('stroke-dasharray', '8 4');
        coreLine.setAttribute('stroke-linecap', 'round');
        g.appendChild(coreLine);

        // 3. Left Endpoint Circle
        const leftCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        leftCircle.classList.add('ghost-left-circle');
        leftCircle.setAttribute('cx', x1.toString());
        leftCircle.setAttribute('cy', lineY.toString());
        leftCircle.setAttribute('r', '5');
        leftCircle.setAttribute('fill', '#f97316');
        leftCircle.setAttribute('stroke', '#0f172a');
        leftCircle.setAttribute('stroke-width', '2');
        g.appendChild(leftCircle);

        // 4. Right Endpoint Circle
        const rightCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rightCircle.classList.add('ghost-right-circle');
        rightCircle.setAttribute('cx', x2.toString());
        rightCircle.setAttribute('cy', lineY.toString());
        rightCircle.setAttribute('r', '5');
        rightCircle.setAttribute('fill', '#f97316');
        rightCircle.setAttribute('stroke', '#0f172a');
        rightCircle.setAttribute('stroke-width', '2');
        g.appendChild(rightCircle);

        // 5. Center Subtle Pill Badge
        const badgeW = 90;
        const badgeH = 18;
        const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgeRect.classList.add('ghost-badge-rect');
        badgeRect.setAttribute('x', (midX - badgeW / 2).toString());
        badgeRect.setAttribute('y', (lineY - badgeH / 2).toString());
        badgeRect.setAttribute('width', badgeW.toString());
        badgeRect.setAttribute('height', badgeH.toString());
        badgeRect.setAttribute('rx', '9');
        badgeRect.setAttribute('ry', '9');
        badgeRect.setAttribute('fill', '#0f172a');
        badgeRect.setAttribute('stroke', '#f97316');
        badgeRect.setAttribute('stroke-width', '1.2');
        g.appendChild(badgeRect);

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.classList.add('ghost-badge-text');
        badgeText.setAttribute('x', midX.toString());
        badgeText.setAttribute('y', (lineY + 3.5).toString());
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('font-size', '9');
        badgeText.setAttribute('font-weight', '800');
        badgeText.setAttribute('letter-spacing', '0.6');
        badgeText.setAttribute('fill', '#f97316');
        badgeText.textContent = 'DROP HERE';
        g.appendChild(badgeText);

        return g;
      };

      const updateGhostLine = (lineY) => {
        if (!ghostLineG) return;
        const lines = ghostLineG.querySelectorAll('line');
        lines.forEach(l => {
          l.setAttribute('y1', lineY.toString());
          l.setAttribute('y2', lineY.toString());
        });
        const circles = ghostLineG.querySelectorAll('circle');
        circles.forEach(c => {
          c.setAttribute('cy', lineY.toString());
        });
        const rect = ghostLineG.querySelector('.ghost-badge-rect');
        if (rect) rect.setAttribute('y', (lineY - 9).toString());
        const text = ghostLineG.querySelector('.ghost-badge-text');
        if (text) text.setAttribute('y', (lineY + 3.5).toString());
      };

      const onWindowPointerMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;

        // Threshold to initiate drag
        if (!isDragging && Math.abs(deltaY) > 5) {
          isDragging = true;
          document.body.style.cursor = 'grabbing';
          nodeGroup.classList.add('node-dragging');
          nodeGroup.setAttribute('filter', 'url(#blender-drag-shadow)');
          // Bring dragged node to the top layer of nodesGroup
          this.nodesGroup.appendChild(nodeGroup);

          const initialLineY = computeLineY(initialSlotIndex, initialSlotIndex, deltaY);
          ghostLineG = createGhostLine(initialLineY);
          this.previewGroup.appendChild(ghostLineG);
        }

        if (isDragging) {
          pendingDeltaY = deltaY;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (pendingDeltaY === null) return;
              const currentDeltaY = pendingDeltaY;

              // Move dragged node visually
              nodeGroup.setAttribute('transform', `translate(0, ${currentDeltaY})`);

              // Calculate closest slot in this column
              const currentVisualY = initialY + currentDeltaY;
              const bestIdx = computeTargetIndex(currentVisualY);

              if (bestIdx !== currentTargetIndex) {
                currentTargetIndex = bestIdx;
              }

              const lineY = computeLineY(currentTargetIndex, initialSlotIndex, currentDeltaY);
              updateGhostLine(lineY);

              // Live Wire Tracking: move socket coords during drag
              const pos = this.nodePositions[id];
              if (pos) {
                if (pos.outY !== undefined) pos.outY = (pos.y + 84) + currentDeltaY;
                if (pos.inY !== undefined) pos.inY = (pos.y + 84) + currentDeltaY;
                if (pos.transferOutY !== undefined) pos.transferOutY = (pos.y + 96) + currentDeltaY;
                this.renderEdges();
              }
            });
          }
        }
      };

      const onWindowPointerUp = () => {
        // ALWAYS remove global window listeners cleanly
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        document.body.style.cursor = '';
        this.activeDragCleanup = null;

        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        if (ghostLineG) {
          ghostLineG.remove();
          ghostLineG = null;
        }

        nodeGroup.classList.remove('node-dragging');

        if (!isDragging) {
          // Normal click -> Select node for inspector
          this.selectNode(id);
          return;
        }

        // Apply Reorder
        const currentOrder = [...(this.sortOrder[columnKey] || [])];
        const currentIndex = currentOrder.indexOf(id);

        if (currentIndex !== -1 && currentTargetIndex !== currentIndex) {
          currentOrder.splice(currentIndex, 1);
          currentOrder.splice(currentTargetIndex, 0, id);
          this.sortOrder[columnKey] = currentOrder;
          this.saveSortOrder();
        }

        // Re-render canvas: resets all transform:translate, re-calculates clean non-overlapping coordinates!
        this.render();
      };

      this.activeDragCleanup = () => {
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        document.body.style.cursor = '';
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (ghostLineG) {
          ghostLineG.remove();
          ghostLineG = null;
        }
        nodeGroup.classList.remove('node-dragging');
      };

      window.addEventListener('pointermove', onWindowPointerMove);
      window.addEventListener('pointerup', onWindowPointerUp);
      window.addEventListener('pointercancel', onWindowPointerUp);
    };

    nodeGroup.addEventListener('pointerdown', onPointerDown);
  }

  drawBlenderBezierEdge(parent, x1, y1, x2, y2, color, marker, isHighlighted) {
    const dx = Math.abs(x2 - x1) * 0.55;
    const cp1x = x1 + dx;
    const cp1y = y1;
    const cp2x = x2 - dx;
    const cp2y = y2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', isHighlighted ? '3.5' : '2.2');
    path.setAttribute('stroke-opacity', isHighlighted ? '1' : '0.65');
    if (isHighlighted) {
      path.setAttribute('stroke-dasharray', '8,4');
      path.classList.add('edge-animated');
    }
    path.setAttribute('marker-end', marker);
    parent.appendChild(path);
  }

  drawBlenderArcEdge(parent, x1, y1, x2, y2, color, marker, isHighlighted) {
    const offset = 48;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = Math.max(x1, x2) + offset;
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', isHighlighted ? '3' : '2');
    path.setAttribute('stroke-opacity', isHighlighted ? '1' : '0.7');
    path.setAttribute('stroke-dasharray', '6,3');
    path.setAttribute('marker-end', marker);
    parent.appendChild(path);
  }
}
