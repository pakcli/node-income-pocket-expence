// Flow Canvas Engine - Blender Node Style (Brief v04)
// Renders Blender-inspired shader/geometry nodes with custom headers, current values, and labeled input/output sockets

import { store } from './store.js';
import { i18n } from './i18n.js';

export class FlowCanvas {
  constructor(containerId, onSelectNode) {
    this.container = document.getElementById(containerId);
    this.onSelectNode = onSelectNode;
    this.mode = 'simple'; // 'simple' | 'irl'
    this.selectedNodeId = null;

    window.addEventListener('resize', () => this.render());
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

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const width = this.container.clientWidth || 800;
    const height = Math.max(560, this.container.clientHeight || 560);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('flow-svg');

    // Defs for Blender-style filters, markers & gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <!-- Drop Shadow for Blender Nodes -->
      <filter id="blender-shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.55" />
      </filter>

      <!-- Selection Glow for Active Blender Node -->
      <filter id="blender-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#f97316" flood-opacity="0.85" />
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

    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.classList.add('edges-group');
    svg.appendChild(edgesGroup);

    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.classList.add('nodes-group');
    svg.appendChild(nodesGroup);

    if (this.mode === 'simple') {
      this.renderSimpleMode(width, height, nodesGroup, edgesGroup);
    } else {
      this.renderIRLMode(width, height, nodesGroup, edgesGroup);
    }

    this.container.appendChild(svg);
  }

  renderSimpleMode(width, height, nodesGroup, edgesGroup) {
    const incomes = store.state.incomeSources;
    const pockets = store.state.pockets;
    const expenses = store.state.expenseCategories;

    const nodeWidth = Math.min(240, Math.max(190, width * 0.28));
    const nodeHeight = 112;

    const col1X = Math.max(20, width * 0.04);
    const col2X = width * 0.40;
    const col3X = Math.min(width - nodeWidth - 20, width * 0.74);

    // Calculate node Y positions
    const calcY = (items, totalHeight) => {
      const spacing = 22;
      const count = items.length;
      const totalBlock = count * nodeHeight + (count - 1) * spacing;
      const startY = Math.max(30, (totalHeight - totalBlock) / 2);
      return items.map((_, i) => startY + i * (nodeHeight + spacing));
    };

    const incY = calcY(incomes, height);
    const pktY = calcY(pockets, height);
    const expY = calcY(expenses, height);

    const nodeSockets = {};

    // 1. Render Incomes (Only Output Socket)
    incomes.forEach((inc, i) => {
      const x = col1X;
      const y = incY[i];
      const outputSocketY = y + 84;
      nodeSockets[inc.id] = {
        outX: x + nodeWidth,
        outY: outputSocketY
      };

      this.createBlenderNode(nodesGroup, {
        id: inc.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: inc.label,
        theme: 'income',
        headerColor: '#065f46',
        badge: 'INCOME NODE',
        currentValue: i18n.formatCurrency(inc.total),
        valueLabel: 'Total Dana Masuk',
        inputs: [],
        outputs: [
          { label: 'Outflow (Alirkan)', yOffset: 84, color: '#10b981' }
        ],
        selected: this.selectedNodeId === inc.id
      });
    });

    // 2. Render Pockets (Input Sockets on Left + Output Sockets on Right)
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      const inputSocketY = y + 84;
      const outputSocketY = y + 84;

      nodeSockets[pkt.id] = {
        inX: x,
        inY: inputSocketY,
        outX: x + nodeWidth,
        outY: outputSocketY
      };

      this.createBlenderNode(nodesGroup, {
        id: pkt.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: pkt.label,
        theme: 'pocket',
        headerColor: '#1e40af',
        badge: pkt.category.toUpperCase(),
        currentValue: i18n.formatCurrency(pkt.balance),
        valueLabel: 'Saldo Sekarang',
        inputs: [
          { label: 'Inflow (Masuk)', yOffset: 84, color: '#38bdf8' }
        ],
        outputs: [
          { label: 'Outflow (Belanja)', yOffset: 84, color: '#f87171' }
        ],
        selected: this.selectedNodeId === pkt.id
      });
    });

    // 3. Render Expenses (Input Sockets on Left)
    expenses.forEach((exp, i) => {
      const x = col3X;
      const y = expY[i];
      const inputSocketY = y + 84;

      nodeSockets[exp.id] = {
        inX: x,
        inY: inputSocketY
      };

      this.createBlenderNode(nodesGroup, {
        id: exp.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: exp.label,
        theme: 'expense',
        headerColor: '#991b1b',
        badge: 'EXPENSE NODE',
        currentValue: i18n.formatCurrency(exp.total),
        valueLabel: 'Total Terpakai',
        inputs: [
          { label: 'Dana Masuk (In)', yOffset: 84, color: '#f87171' }
        ],
        outputs: [],
        selected: this.selectedNodeId === exp.id
      });
    });

    // 4. Draw Connecting Edges between Blender Sockets
    const edgeDrawn = new Set();
    store.state.transactions.forEach(tx => {
      const edgeKey = `${tx.fromId}->${tx.toId}`;
      if (edgeDrawn.has(edgeKey)) return;
      edgeDrawn.add(edgeKey);

      const fromSocket = nodeSockets[tx.fromId];
      const toSocket = nodeSockets[tx.toId];

      if (fromSocket && toSocket) {
        const startX = fromSocket.outX;
        const startY = fromSocket.outY;
        const endX = toSocket.inX;
        const endY = toSocket.inY;

        const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;
        const color = tx.type === 'income' ? '#10b981' : (tx.type === 'expense' ? '#f87171' : '#c084fc');
        const marker = tx.type === 'income' ? 'url(#socket-arrow-green)' : (tx.type === 'expense' ? 'url(#socket-arrow-red)' : 'url(#socket-arrow-purple)');

        this.drawBlenderBezierEdge(edgesGroup, startX, startY, endX, endY, color, marker, isHighlighted);
      }
    });
  }

  renderIRLMode(width, height, nodesGroup, edgesGroup) {
    const incomes = store.state.incomeSources;
    const pockets = store.state.pockets;
    const expenses = store.state.expenseCategories;

    const nodeWidth = Math.min(235, Math.max(185, width * 0.27));
    const nodeHeight = 114;

    const col1X = width * 0.04;
    const col2X = width * 0.38;
    const col3X = width * 0.72;

    const calcY = (items, totalHeight, spacing = 24) => {
      const count = items.length;
      const totalBlock = count * nodeHeight + (count - 1) * spacing;
      const startY = Math.max(30, (totalHeight - totalBlock) / 2);
      return items.map((_, i) => startY + i * (nodeHeight + spacing));
    };

    const incY = calcY(incomes, height);
    const pktY = calcY(pockets, height, 32);
    const expY = calcY(expenses, height);

    const nodeSockets = {};

    // 1. Incomes
    incomes.forEach((inc, i) => {
      const x = col1X;
      const y = incY[i];
      const outputSocketY = y + 84;
      nodeSockets[inc.id] = { outX: x + nodeWidth, outY: outputSocketY };

      this.createBlenderNode(nodesGroup, {
        id: inc.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: inc.label,
        theme: 'income',
        headerColor: '#065f46',
        badge: 'SOURCE',
        currentValue: i18n.formatCurrency(inc.total),
        valueLabel: 'Total Dana Masuk',
        inputs: [],
        outputs: [
          { label: 'Transfer Out ▶', yOffset: 84, color: '#10b981' }
        ],
        selected: this.selectedNodeId === inc.id
      });
    });

    // 2. Pockets with Dual Output (Spending Out + Transfer Out)
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      const inSocketY = y + 74;
      const outSpendSocketY = y + 74;
      const outTransferSocketY = y + 96;

      nodeSockets[pkt.id] = {
        inX: x,
        inY: inSocketY,
        outX: x + nodeWidth,
        outY: outSpendSocketY,
        transferOutX: x + nodeWidth,
        transferOutY: outTransferSocketY
      };

      this.createBlenderNode(nodesGroup, {
        id: pkt.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: pkt.label,
        theme: 'pocket',
        headerColor: '#1e40af',
        badge: pkt.category.toUpperCase(),
        currentValue: i18n.formatCurrency(pkt.balance),
        valueLabel: 'Saldo Sekarang',
        inputs: [
          { label: 'Inflow (Masuk)', yOffset: 74, color: '#38bdf8' }
        ],
        outputs: [
          { label: 'Belanja Out ▶', yOffset: 74, color: '#f87171' },
          { label: 'Transfer ⇄', yOffset: 96, color: '#c084fc' }
        ],
        selected: this.selectedNodeId === pkt.id
      });
    });

    // 3. Expenses
    expenses.forEach((exp, i) => {
      const x = col3X;
      const y = expY[i];
      const inSocketY = y + 84;
      nodeSockets[exp.id] = { inX: x, inY: inSocketY };

      this.createBlenderNode(nodesGroup, {
        id: exp.id,
        x, y, width: nodeWidth, height: nodeHeight,
        title: exp.label,
        theme: 'expense',
        headerColor: '#991b1b',
        badge: 'EXPENSE',
        currentValue: i18n.formatCurrency(exp.total),
        valueLabel: 'Total Pengeluaran',
        inputs: [
          { label: 'Bayar In', yOffset: 84, color: '#f87171' }
        ],
        outputs: [],
        selected: this.selectedNodeId === exp.id
      });
    });

    // 4. Edges (Handling normal flow + inter-pocket transfers)
    const edgeDrawn = new Set();
    store.state.transactions.forEach(tx => {
      const edgeKey = `${tx.fromId}->${tx.toId}`;
      if (edgeDrawn.has(edgeKey)) return;
      edgeDrawn.add(edgeKey);

      const fromSocket = nodeSockets[tx.fromId];
      const toSocket = nodeSockets[tx.toId];

      if (fromSocket && toSocket) {
        let startX, startY, endX, endY;
        const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;

        if (tx.type === 'transfer') {
          startX = fromSocket.transferOutX || fromSocket.outX;
          startY = fromSocket.transferOutY || fromSocket.outY;
          endX = toSocket.inX;
          endY = toSocket.inY;
          this.drawBlenderArcEdge(edgesGroup, startX, startY, endX, endY, '#c084fc', 'url(#socket-arrow-purple)', isHighlighted);
        } else {
          startX = fromSocket.outX;
          startY = fromSocket.outY;
          endX = toSocket.inX;
          endY = toSocket.inY;
          const color = tx.type === 'income' ? '#10b981' : '#f87171';
          const marker = tx.type === 'income' ? 'url(#socket-arrow-green)' : 'url(#socket-arrow-red)';
          this.drawBlenderBezierEdge(edgesGroup, startX, startY, endX, endY, color, marker, isHighlighted);
        }
      }
    });
  }

  createBlenderNode(parent, { id, x, y, width, height, title, theme, headerColor, badge, currentValue, valueLabel, inputs, outputs, selected }) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node-blender node-${theme} ${selected ? 'node-selected' : ''}`);
    group.setAttribute('cursor', 'pointer');
    if (selected) {
      group.setAttribute('filter', 'url(#blender-glow)');
    } else {
      group.setAttribute('filter', 'url(#blender-shadow)');
    }

    // Click handler for Node Inspector
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(id);
    });

    // 1. Outer Node Body Container (Blender Dark Slate)
    const bodyRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bodyRect.setAttribute('x', x.toString());
    bodyRect.setAttribute('y', y.toString());
    bodyRect.setAttribute('width', width.toString());
    bodyRect.setAttribute('height', height.toString());
    bodyRect.setAttribute('rx', '8');
    bodyRect.setAttribute('ry', '8');
    bodyRect.setAttribute('fill', '#20242d'); // Blender node dark charcoal background
    bodyRect.setAttribute('stroke', selected ? '#f97316' : '#374151'); // Orange active border like Blender
    bodyRect.setAttribute('stroke-width', selected ? '2.5' : '1.2');
    group.appendChild(bodyRect);

    // 2. Node Header (Distinct Colored Title Bar)
    const headerHeight = 28;
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Rounded top corners (radius 8), flat bottom
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

    // Header Title (Node Name)
    const headerTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    headerTitle.setAttribute('x', (x + 10).toString());
    headerTitle.setAttribute('y', (y + 18).toString());
    headerTitle.setAttribute('font-size', '12');
    headerTitle.setAttribute('font-weight', '700');
    headerTitle.setAttribute('fill', '#ffffff');
    headerTitle.setAttribute('letter-spacing', '0.2');
    const maxChars = Math.floor(width / 13);
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
    // Label
    const valLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valLabel.setAttribute('x', (x + 12).toString());
    valLabel.setAttribute('y', (y + 44).toString());
    valLabel.setAttribute('font-size', '10');
    valLabel.setAttribute('font-weight', '600');
    valLabel.setAttribute('fill', '#94a3b8');
    valLabel.textContent = `${valueLabel}:`;
    group.appendChild(valLabel);

    // Large Glowing Value Text
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

    // Divider Line between Value and Sockets
    const divLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    divLine.setAttribute('x1', (x + 8).toString());
    divLine.setAttribute('y1', (y + 68).toString());
    divLine.setAttribute('x2', (x + width - 8).toString());
    divLine.setAttribute('y2', (y + 68).toString());
    divLine.setAttribute('stroke', '#2d3340');
    divLine.setAttribute('stroke-width', '1');
    group.appendChild(divLine);

    // 4. Render Input Sockets & Labels (Left side)
    inputs.forEach(inp => {
      const socketY = y + inp.yOffset;

      // Socket Pin Circle (Blender style)
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', x.toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', inp.color || '#38bdf8');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      // Input Socket Text Label
      const socketLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      socketLabel.setAttribute('x', (x + 10).toString());
      socketLabel.setAttribute('y', (socketY + 4).toString());
      socketLabel.setAttribute('font-size', '10');
      socketLabel.setAttribute('font-weight', '600');
      socketLabel.setAttribute('fill', '#cbd5e1');
      socketLabel.textContent = `● ${inp.label}`;
      group.appendChild(socketLabel);
    });

    // 5. Render Output Sockets & Labels (Right side)
    outputs.forEach(out => {
      const socketY = y + out.yOffset;

      // Socket Pin Circle (Blender style)
      const socketPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socketPin.setAttribute('cx', (x + width).toString());
      socketPin.setAttribute('cy', socketY.toString());
      socketPin.setAttribute('r', '5');
      socketPin.setAttribute('fill', out.color || '#f87171');
      socketPin.setAttribute('stroke', '#111827');
      socketPin.setAttribute('stroke-width', '2');
      socketPin.classList.add('blender-socket');
      group.appendChild(socketPin);

      // Output Socket Text Label
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

    parent.appendChild(group);
  }

  drawBlenderBezierEdge(parent, x1, y1, x2, y2, color, marker, isHighlighted) {
    // Blender-style horizontal S-curve bezier
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
