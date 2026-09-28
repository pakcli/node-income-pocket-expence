import React from 'react';

export function PanelSplitter({ id, onDrag, onReset, title = "Geser untuk ubah ukuran panel (Klik ganda untuk reset)" }) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startX;
      onDrag(deltaX);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      id={id}
      className="panel-splitter"
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      title={title}
    />
  );
}
