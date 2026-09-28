// Flow Canvas Engine - Blender Node Style (Brief v04)
// Features: Interactive Up/Down Drag Sorting, Blender Frames per Column, Live Wire Tracking

import { store } from './store.js';
import { i18n } from './i18n.js';

const ORDER_STORAGE_KEY = 'spm_node_sort_order_v1';

export class FlowCanvas {
  constructor(containerId, onSelectNode) {
    this.container = document.getElementById(containerId);
    this.onSelectNode = onSelectNode;
    this.mode = 'simple'; // 'simple' | 'irl'
    this.selectedNodeId = null;

    // Load custom sort order for each column
    this.sortOrder = this.loadSortOrder();

    // Active drag state
    this.dragState = null;
    this.nodePositions = {}; // id -> { x, y, width, height, type, ... }

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

  // Get items sorted according to custom sortOrder
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
    // Ensure all current IDs are recorded
    this.sortOrder[columnKey] = sorted.map(i => i.id);
    return sorted;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const width = this.container.clientWidth || 800;
    const height = Math.max(580, this.container.clientHeight || 580);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('flow-svg');
    this.svg = svg;

    // Defs for Blender-style filters, markers & gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <!-- Drop Shadow for Blender Nodes -->
      <filter id="blender-shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.6" />
      </filter>

      <!-- Selection Glow for Active Blender Node -->
      <filter id="blender-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f97316" flood-opacity="0.9" />
      </filter>

      <!-- Smooth Socket Arrow Markers -->
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

    // Layer 2: Connecting Wire Edges Group
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.classList.add('edges-group');
    svg.appendChild(edgesGroup);
    this.edgesGroup = edgesGroup;

    // Layer 3: Nodes Group
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.classList.add('nodes-group');
    svg.appendChild(nodesGroup);
    this.nodesGroup = nodesGroup;

    if (this.mode === 'simple') {
      this.renderSimpleMode(width, height);
    } else {
      this.renderIRLMode(width, height);
    }

    this.container.appendChild(svg);
  }

  renderSimpleMode(width, height) {
    const incomes = this.getSortedItems(store.state.incomeSources, 'income');
    const pockets = this.getSortedItems(store.state.pockets, 'pocket');
    const expenses = this.getSortedItems(store.state.expenseCategories, 'expense');

    const nodeWidth = Math.min(240, Math.max(190, width * 0.28));
    const nodeHeight = 112;

    const col1X = Math.max(20, width * 0.04);
    const col2X = width * 0.40;
    const col3X = Math.min(width - nodeWidth - 20, width * 0.74);

    const calcY = (items, totalHeight) => {
      const spacing = 22;
      const count = items.length;
      const totalBlock = count * nodeHeight + (count - 1) * spacing;
      const startY = Math.max(48, (totalHeight - totalBlock) / 2);
      return items.map((_, i) => startY + i * (nodeHeight + spacing));
    };

    const incY = calcY(incomes, height);
    const pktY = calcY(pockets, height);
    const expY = calcY(expenses, height);

    this.nodePositions = {};

    // 1. Render Blender Frames for the 3 columns
    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: INFLOW SOURCES (SUMBER)',
      accentColor: '#10b981',
      x: col1X - 12,
      y: Math.min(...incY) - 34,
      width: nodeWidth + 24,
      height: (incomes.length * nodeHeight) + ((incomes.length - 1) * 22) + 48
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: POCKETS & WALLETS (KANTONG)',
      accentColor: '#38bdf8',
      x: col2X - 12,
      y: Math.min(...pktY) - 34,
      width: nodeWidth + 24,
      height: (pockets.length * nodeHeight) + ((pockets.length - 1) * 22) + 48
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: OUTFLOW & EXPENSES (POS BIAYA)',
      accentColor: '#f87171',
      x: col3X - 12,
      y: Math.min(...expY) - 34,
      width: nodeWidth + 24,
      height: (expenses.length * nodeHeight) + ((expenses.length - 1) * 22) + 48
    });

    // 2. Render Incomes (Col 1)
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
        x, y, width: nodeWidth, height: nodeHeight,
        title: inc.label,
        theme: 'income',
        headerColor: '#065f46',
        badge: 'INCOME',
        currentValue: i18n.formatCurrency(inc.total),
        valueLabel: 'Total Dana Masuk',
        inputs: [],
        outputs: [{ label: 'Outflow (Alirkan)', yOffset: 84, color: '#10b981' }],
        selected: this.selectedNodeId === inc.id
      });
    });

    // 3. Render Pockets (Col 2)
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      this.nodePositions[pkt.id] = {
        id: pkt.id,
        columnKey: 'pocket',
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x,
        inY: y + 84,
        outX: x + nodeWidth,
        outY: y + 84
      };

      this.createBlenderNode(this.nodesGroup, {
        id: pkt.id,
        columnKey: 'pocket',
        x, y, width: nodeWidth, height: nodeHeight,
        title: pkt.label,
        theme: 'pocket',
        headerColor: '#1e40af',
        badge: pkt.category.toUpperCase(),
        currentValue: i18n.formatCurrency(pkt.balance),
        valueLabel: 'Saldo Sekarang',
        inputs: [{ label: 'Inflow (Masuk)', yOffset: 84, color: '#38bdf8' }],
        outputs: [{ label: 'Outflow (Belanja)', yOffset: 84, color: '#f87171' }],
        selected: this.selectedNodeId === pkt.id
      });
    });

    // 4. Render Expenses (Col 3)
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
        x, y, width: nodeWidth, height: nodeHeight,
        title: exp.label,
        theme: 'expense',
        headerColor: '#991b1b',
        badge: 'EXPENSE',
        currentValue: i18n.formatCurrency(exp.total),
        valueLabel: 'Total Terpakai',
        inputs: [{ label: 'Dana Masuk (In)', yOffset: 84, color: '#f87171' }],
        outputs: [],
        selected: this.selectedNodeId === exp.id
      });
    });

    this.renderEdges();
  }

  renderIRLMode(width, height) {
    const incomes = this.getSortedItems(store.state.incomeSources, 'income');
    const pockets = this.getSortedItems(store.state.pockets, 'pocket');
    const expenses = this.getSortedItems(store.state.expenseCategories, 'expense');

    const nodeWidth = Math.min(235, Math.max(185, width * 0.27));
    const nodeHeight = 114;

    const col1X = width * 0.04;
    const col2X = width * 0.38;
    const col3X = width * 0.72;

    const calcY = (items, totalHeight, spacing = 24) => {
      const count = items.length;
      const totalBlock = count * nodeHeight + (count - 1) * spacing;
      const startY = Math.max(48, (totalHeight - totalBlock) / 2);
      return items.map((_, i) => startY + i * (nodeHeight + spacing));
    };

    const incY = calcY(incomes, height);
    const pktY = calcY(pockets, height, 30);
    const expY = calcY(expenses, height);

    this.nodePositions = {};

    // Render Frames for IRL Mode
    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: INFLOW SOURCES',
      accentColor: '#10b981',
      x: col1X - 12,
      y: Math.min(...incY) - 34,
      width: nodeWidth + 24,
      height: (incomes.length * nodeHeight) + ((incomes.length - 1) * 24) + 48
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: WALLETS & TRANSFERS',
      accentColor: '#38bdf8',
      x: col2X - 12,
      y: Math.min(...pktY) - 34,
      width: nodeWidth + 24,
      height: (pockets.length * nodeHeight) + ((pockets.length - 1) * 30) + 48
    });

    this.renderBlenderFrame(this.framesGroup, {
      title: '📦 FRAME: EXPENSE OUTFLOWS',
      accentColor: '#f87171',
      x: col3X - 12,
      y: Math.min(...expY) - 34,
      width: nodeWidth + 24,
      height: (expenses.length * nodeHeight) + ((expenses.length - 1) * 24) + 48
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

  // Draw Blender Frame (Enclosure box with header)
  renderBlenderFrame(parent, { title, accentColor, x, y, width, height }) {
    const frameG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    frameG.classList.add('blender-frame');

    // Frame Outer Box
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
    rect.setAttribute('fill', 'rgba(15, 23, 42, 0.45)');
    rect.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
    rect.setAttribute('stroke-width', '1.5');
    rect.setAttribute('stroke-dasharray', '5,4');
    frameG.appendChild(rect);

    // Frame Header Bar
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerRect.setAttribute('x', x.toString());
    headerRect.setAttribute('y', y.toString());
    headerRect.setAttribute('width', width.toString());
    headerRect.setAttribute('height', '26');
    headerRect.setAttribute('rx', '8');
    headerRect.setAttribute('ry', '8');
    headerRect.setAttribute('fill', 'rgba(30, 41, 59, 0.7)');
    headerRect.setAttribute('stroke', accentColor);
    headerRect.setAttribute('stroke-width', '1');
    headerRect.setAttribute('stroke-opacity', '0.6');
    frameG.appendChild(headerRect);

    // Frame Label Text
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (x + 10).toString());
    label.setAttribute('y', (y + 17).toString());
    label.setAttribute('font-size', '10');
    label.setAttribute('font-weight', '700');
    label.setAttribute('letter-spacing', '0.5');
    label.setAttribute('fill', accentColor);
    label.textContent = title;
    frameG.appendChild(label);

    // Subtle reorder hint
    const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hint.setAttribute('x', (x + width - 10).toString());
    hint.setAttribute('y', (y + 17).toString());
    hint.setAttribute('text-anchor', 'end');
    hint.setAttribute('font-size', '9');
    hint.setAttribute('font-weight', '600');
    hint.setAttribute('fill', '#64748b');
    hint.textContent = '⇅ Drag to Sort';
    frameG.appendChild(hint);

    parent.appendChild(frameG);
  }

  // Draw Connecting Wire Edges
  renderEdges() {
    this.edgesGroup.innerHTML = '';
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

  createBlenderNode(parent, { id, columnKey, x, y, width, height, title, theme, headerColor, badge, currentValue, valueLabel, inputs, outputs, selected }) {
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

    // 1. Outer Node Body Container (Blender Dark Slate)
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

    // 2. Node Header (Distinct Colored Title Bar)
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

    // Drag Handle / Grip Lines Icon on Left of Header
    const gripG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gripG.innerHTML = `
      <circle cx="${x + 10}" cy="${y + 11}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 15}" cy="${y + 11}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 10}" cy="${y + 17}" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="${x + 15}" cy="${y + 17}" r="1.5" fill="rgba(255,255,255,0.7)" />
    `;
    group.appendChild(gripG);

    // Header Title (Node Name)
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

    // 3. Content Body - Line Awal: Current Value (Value Sekarang)
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

    // 6. Interactive Drag & Drop Sort Listeners (Pointer Events)
    this.attachDragSortListeners(group, id, columnKey, y);

    parent.appendChild(group);
  }

  attachDragSortListeners(nodeGroup, id, columnKey, initialY) {
    let startY = 0;
    let currentY = initialY;
    let isDragging = false;

    const onPointerDown = (e) => {
      // Allow clicking without dragging
      startY = e.clientY;
      isDragging = false;
      nodeGroup.setPointerCapture(e.pointerId);
      nodeGroup.style.cursor = 'grabbing';

      const onPointerMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        if (Math.abs(deltaY) > 5) {
          isDragging = true;
        }

        if (isDragging) {
          currentY = initialY + deltaY;
          nodeGroup.setAttribute('transform', `translate(0, ${deltaY})`);
          nodeGroup.style.zIndex = '100';

          // Update this node's sockets coordinates in real time for live wire tracking!
          const pos = this.nodePositions[id];
          if (pos) {
            const shiftY = deltaY;
            if (pos.outY !== undefined) pos.outY = (pos.y + 84) + shiftY;
            if (pos.inY !== undefined) pos.inY = (pos.y + 84) + shiftY;
            if (pos.transferOutY !== undefined) pos.transferOutY = (pos.y + 96) + shiftY;
            this.renderEdges();
          }
        }
      };

      const onPointerUp = (upEvent) => {
        nodeGroup.releasePointerCapture(upEvent.pointerId);
        nodeGroup.removeEventListener('pointermove', onPointerMove);
        nodeGroup.removeEventListener('pointerup', onPointerUp);
        nodeGroup.style.cursor = 'grab';

        if (!isDragging) {
          // Normal click -> Select Node
          this.selectNode(id);
          return;
        }

        // Handle Re-ordering / Sorting in Column
        const deltaY = upEvent.clientY - startY;
        const currentOrder = [...(this.sortOrder[columnKey] || [])];
        const currentIndex = currentOrder.indexOf(id);

        if (currentIndex !== -1) {
          // Slot height ~134px (112 height + 22 spacing)
          const slotDiff = Math.round(deltaY / 134);
          let targetIndex = currentIndex + slotDiff;
          targetIndex = Math.max(0, Math.min(currentOrder.length - 1, targetIndex));

          if (targetIndex !== currentIndex) {
            // Reorder array
            currentOrder.splice(currentIndex, 1);
            currentOrder.splice(targetIndex, 0, id);
            this.sortOrder[columnKey] = currentOrder;
            this.saveSortOrder();
          }
        }

        // Re-render canvas with new sorted order
        this.render();
      };

      nodeGroup.addEventListener('pointermove', onPointerMove);
      nodeGroup.addEventListener('pointerup', onPointerUp);
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
