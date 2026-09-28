// Flow Canvas Engine
// Renders Simple Mode (3-column pipeline) and IRL Mode (network graph with transfers)

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
    const height = Math.max(540, this.container.clientHeight || 540);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('flow-svg');

    // Defs for marker arrows & gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
      </marker>
      <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" />
      </marker>
      <linearGradient id="grad-income" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ecfdf5" />
        <stop offset="100%" stop-color="#d1fae5" />
      </linearGradient>
      <linearGradient id="grad-pocket" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#eff6ff" />
        <stop offset="100%" stop-color="#dbeafe" />
      </linearGradient>
      <linearGradient id="grad-expense" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff1f2" />
        <stop offset="100%" stop-color="#ffe4e6" />
      </linearGradient>
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

    const col1X = Math.max(20, width * 0.05);
    const col2X = width * 0.42;
    const col3X = Math.min(width - 230, width * 0.76);

    const nodeWidth = Math.min(210, width * 0.28);
    const nodeHeight = 65;

    // Calculate node Y positions
    const calcY = (items, totalHeight) => {
      const spacing = 18;
      const count = items.length;
      const totalBlock = count * nodeHeight + (count - 1) * spacing;
      const startY = Math.max(30, (totalHeight - totalBlock) / 2);
      return items.map((_, i) => startY + i * (nodeHeight + spacing));
    };

    const incY = calcY(incomes, height);
    const pktY = calcY(pockets, height);
    const expY = calcY(expenses, height);

    const nodePositions = {};

    // 1. Render Incomes
    incomes.forEach((inc, i) => {
      const x = col1X;
      const y = incY[i];
      nodePositions[inc.id] = { x, y, width: nodeWidth, height: nodeHeight, type: 'income', outX: x + nodeWidth, outY: y + nodeHeight / 2 };
      this.createNodeElement(nodesGroup, {
        id: inc.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: inc.label,
        sublabel: i18n.formatCurrency(inc.total),
        badge: 'INCOME',
        theme: 'income',
        selected: this.selectedNodeId === inc.id
      });
    });

    // 2. Render Pockets
    pockets.forEach((pkt, i) => {
      const x = col2X;
      const y = pktY[i];
      nodePositions[pkt.id] = {
        x, y, width: nodeWidth, height: nodeHeight, type: 'account',
        inX: x, inY: y + nodeHeight / 2,
        outX: x + nodeWidth, outY: y + nodeHeight / 2
      };
      this.createNodeElement(nodesGroup, {
        id: pkt.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: pkt.label,
        sublabel: i18n.formatCurrency(pkt.balance),
        badge: pkt.category.toUpperCase(),
        theme: 'pocket',
        selected: this.selectedNodeId === pkt.id
      });
    });

    // 3. Render Expenses
    expenses.forEach((exp, i) => {
      const x = col3X;
      const y = expY[i];
      nodePositions[exp.id] = { x, y, width: nodeWidth, height: nodeHeight, type: 'expense', inX: x, inY: y + nodeHeight / 2 };
      this.createNodeElement(nodesGroup, {
        id: exp.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: exp.label,
        sublabel: i18n.formatCurrency(exp.total),
        badge: 'EXPENSE',
        theme: 'expense',
        selected: this.selectedNodeId === exp.id
      });
    });

    // Render connecting edges based on store.transactions
    const edgeDrawn = new Set();
    store.state.transactions.forEach(tx => {
      const edgeKey = `${tx.fromId}->${tx.toId}`;
      if (edgeDrawn.has(edgeKey)) return;
      edgeDrawn.add(edgeKey);

      const fromPos = nodePositions[tx.fromId];
      const toPos = nodePositions[tx.toId];

      if (fromPos && toPos) {
        let startX = fromPos.outX;
        let startY = fromPos.outY;
        let endX = toPos.inX || toPos.x;
        let endY = toPos.inY || (toPos.y + toPos.height / 2);

        const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;
        const color = tx.type === 'income' ? '#10b981' : (tx.type === 'expense' ? '#ef4444' : '#8b5cf6');
        const marker = tx.type === 'income' ? 'url(#arrow-green)' : (tx.type === 'expense' ? 'url(#arrow-red)' : 'url(#arrow-purple)');

        this.drawBezierEdge(edgesGroup, startX, startY, endX, endY, color, marker, isHighlighted);
      }
    });
  }

  renderIRLMode(width, height, nodesGroup, edgesGroup) {
    // IRL Mode lays out distinct accounts in a central cluster showing internal transfers,
    // with incomes on the left and expenses on the right or surrounding
    const incomes = store.state.incomeSources;
    const pockets = store.state.pockets;
    const expenses = store.state.expenseCategories;

    const nodeWidth = Math.min(200, width * 0.26);
    const nodeHeight = 65;
    const nodePositions = {};

    // Left column: Incomes
    const incSpacing = 20;
    const incStartY = Math.max(40, (height - (incomes.length * (nodeHeight + incSpacing))) / 2);
    incomes.forEach((inc, i) => {
      const x = width * 0.05;
      const y = incStartY + i * (nodeHeight + incSpacing);
      nodePositions[inc.id] = { x, y, width: nodeWidth, height: nodeHeight, outX: x + nodeWidth, outY: y + nodeHeight / 2 };
      this.createNodeElement(nodesGroup, {
        id: inc.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: inc.label,
        sublabel: i18n.formatCurrency(inc.total),
        badge: 'SOURCE',
        theme: 'income',
        selected: this.selectedNodeId === inc.id
      });
    });

    // Center column: Pockets (stacked with slightly offset visual hierarchy)
    const pktSpacing = 24;
    const pktStartY = Math.max(40, (height - (pockets.length * (nodeHeight + pktSpacing))) / 2);
    pockets.forEach((pkt, i) => {
      const x = width * 0.40;
      const y = pktStartY + i * (nodeHeight + pktSpacing);
      nodePositions[pkt.id] = {
        x, y, width: nodeWidth, height: nodeHeight,
        inX: x, inY: y + nodeHeight / 2,
        outX: x + nodeWidth, outY: y + nodeHeight / 2,
        topX: x + nodeWidth / 2, topY: y,
        botX: x + nodeWidth / 2, botY: y + nodeHeight
      };
      this.createNodeElement(nodesGroup, {
        id: pkt.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: pkt.label,
        sublabel: i18n.formatCurrency(pkt.balance),
        badge: pkt.category.toUpperCase(),
        theme: 'pocket',
        selected: this.selectedNodeId === pkt.id
      });
    });

    // Right column: Expenses
    const expSpacing = 16;
    const expStartY = Math.max(30, (height - (expenses.length * (nodeHeight + expSpacing))) / 2);
    expenses.forEach((exp, i) => {
      const x = width * 0.74;
      const y = expStartY + i * (nodeHeight + expSpacing);
      nodePositions[exp.id] = { x, y, width: nodeWidth, height: nodeHeight, inX: x, inY: y + nodeHeight / 2 };
      this.createNodeElement(nodesGroup, {
        id: exp.id,
        x, y, width: nodeWidth, height: nodeHeight,
        label: exp.label,
        sublabel: i18n.formatCurrency(exp.total),
        badge: 'EXPENSE',
        theme: 'expense',
        selected: this.selectedNodeId === exp.id
      });
    });

    // Draw all transaction edges (including lateral pocket-to-pocket transfers)
    const edgeDrawn = new Set();
    store.state.transactions.forEach(tx => {
      const edgeKey = `${tx.fromId}->${tx.toId}`;
      if (edgeDrawn.has(edgeKey)) return;
      edgeDrawn.add(edgeKey);

      const fromPos = nodePositions[tx.fromId];
      const toPos = nodePositions[tx.toId];

      if (fromPos && toPos) {
        let startX, startY, endX, endY;

        if (tx.type === 'transfer') {
          // Curved loop or lateral edge between wallets
          startX = fromPos.x + fromPos.width;
          startY = fromPos.outY;
          endX = toPos.x + toPos.width;
          endY = toPos.outY;
          // Loop out slightly
          const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;
          this.drawArcEdge(edgesGroup, startX, startY, endX, endY, '#8b5cf6', 'url(#arrow-purple)', isHighlighted);
        } else {
          startX = fromPos.outX;
          startY = fromPos.outY;
          endX = toPos.inX;
          endY = toPos.inY;
          const isHighlighted = this.selectedNodeId === tx.fromId || this.selectedNodeId === tx.toId;
          const color = tx.type === 'income' ? '#10b981' : '#ef4444';
          const marker = tx.type === 'income' ? 'url(#arrow-green)' : 'url(#arrow-red)';
          this.drawBezierEdge(edgesGroup, startX, startY, endX, endY, color, marker, isHighlighted);
        }
      }
    });
  }

  createNodeElement(parent, { id, x, y, width, height, label, sublabel, badge, theme, selected }) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node-card node-${theme} ${selected ? 'node-selected' : ''}`);
    group.setAttribute('cursor', 'pointer');
    group.style.transition = 'transform 0.2s, filter 0.2s';

    // Click handler
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(id);
    });

    // Shadow & Background Rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toString());
    rect.setAttribute('y', y.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');

    let strokeColor = '#cbd5e1';
    let fillColor = '#ffffff';

    if (theme === 'income') {
      strokeColor = selected ? '#059669' : '#10b981';
      fillColor = selected ? '#d1fae5' : '#f0fdf4';
    } else if (theme === 'pocket') {
      strokeColor = selected ? '#2563eb' : '#3b82f6';
      fillColor = selected ? '#dbeafe' : '#eff6ff';
    } else if (theme === 'expense') {
      strokeColor = selected ? '#dc2626' : '#ef4444';
      fillColor = selected ? '#ffe4e6' : '#fff1f2';
    }

    rect.setAttribute('fill', fillColor);
    rect.setAttribute('stroke', strokeColor);
    rect.setAttribute('stroke-width', selected ? '2.5' : '1.5');
    rect.classList.add('node-rect');
    group.appendChild(rect);

    // Badge Pill
    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', (x + width - 10).toString());
    badgeText.setAttribute('y', (y + 16).toString());
    badgeText.setAttribute('text-anchor', 'end');
    badgeText.setAttribute('font-size', '9');
    badgeText.setAttribute('font-weight', '700');
    badgeText.setAttribute('letter-spacing', '0.5');
    badgeText.setAttribute('fill', strokeColor);
    badgeText.textContent = badge;
    group.appendChild(badgeText);

    // Label Text (Title)
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', (x + 12).toString());
    title.setAttribute('y', (y + 26).toString());
    title.setAttribute('font-size', '12');
    title.setAttribute('font-weight', '600');
    title.setAttribute('fill', '#1e293b');
    // Truncate long title
    const maxChars = Math.floor(width / 11);
    title.textContent = label.length > maxChars ? label.slice(0, maxChars) + '...' : label;
    group.appendChild(title);

    // Sublabel (Balance or Inflow/Outflow)
    const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sub.setAttribute('x', (x + 12).toString());
    sub.setAttribute('y', (y + 48).toString());
    sub.setAttribute('font-size', '13');
    sub.setAttribute('font-weight', '700');
    sub.setAttribute('fill', strokeColor);
    sub.textContent = sublabel;
    group.appendChild(sub);

    parent.appendChild(group);
  }

  drawBezierEdge(parent, x1, y1, x2, y2, color, marker, isHighlighted) {
    const dx = Math.abs(x2 - x1) * 0.5;
    const cp1x = x1 + dx;
    const cp1y = y1;
    const cp2x = x2 - dx;
    const cp2y = y2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', isHighlighted ? '3' : '1.8');
    path.setAttribute('stroke-opacity', isHighlighted ? '1' : '0.45');
    if (isHighlighted) {
      path.setAttribute('stroke-dasharray', '6,3');
      path.classList.add('edge-animated');
    }
    path.setAttribute('marker-end', marker);
    parent.appendChild(path);
  }

  drawArcEdge(parent, x1, y1, x2, y2, color, marker, isHighlighted) {
    const offset = 45;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = Math.max(x1, x2) + offset;
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} Q ${midX} ${midY}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', isHighlighted ? '2.8' : '1.6');
    path.setAttribute('stroke-opacity', isHighlighted ? '1' : '0.5');
    path.setAttribute('stroke-dasharray', '4,3');
    path.setAttribute('marker-end', marker);
    parent.appendChild(path);
  }
}
