class CET6Drag {
  static makeDraggable(element, handleSelector) {
    const handle = typeof handleSelector === 'string'
      ? element.querySelector(handleSelector)
      : handleSelector;
    if (!handle) return;

    let startX, startY, startLeft, startTop;
    let dragging = false;

    handle.style.cursor = 'move';
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';

    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || e.target.closest('[data-no-drag]')) return;
      dragging = true;
      const rect = element.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.left = startLeft + 'px';
      element.style.top = startTop + 'px';
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = (startLeft + dx) + 'px';
      element.style.top = (startTop + dy) + 'px';
    });

    handle.addEventListener('pointerup', function () {
      dragging = false;
    });
  }

  static makeResizable(element, handleSelector) {
    const handle = typeof handleSelector === 'string'
      ? element.querySelector(handleSelector)
      : handleSelector;
    if (!handle) return;

    let startX, startY, startW, startH;
    let resizing = false;

    handle.style.cursor = 'nwse-resize';
    handle.style.position = 'absolute';
    handle.style.bottom = '0';
    handle.style.right = '0';
    handle.style.width = '20px';
    handle.style.height = '20px';
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';

    handle.addEventListener('pointerdown', function (e) {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = element.offsetWidth;
      startH = element.offsetHeight;
      handle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    document.addEventListener('pointermove', function (e) {
      if (!resizing) return;
      element.style.width = Math.max(220, startW + (e.clientX - startX)) + 'px';
      element.style.height = Math.max(200, startH + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('pointerup', function () {
      resizing = false;
    });
  }
}