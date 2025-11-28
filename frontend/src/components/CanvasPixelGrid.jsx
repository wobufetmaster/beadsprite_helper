import { useRef, useEffect, useCallback } from 'react';

/**
 * Canvas-based pixel grid renderer for high performance with large grids
 * Replaces DOM-based rendering to handle 100x100+ pixel grids smoothly
 */
export default function CanvasPixelGrid({
  grid,
  width,
  height,
  cellSize,
  colorMapping,
  beadColors,
  showMappedColors,
  beadShape,
  showPegboardGrid,
  pegboardSize,
  contentDimensions,
  backgroundMask,
  removeBackground,
  selectedCell,
  hoveredCell,
  isMirrored,
  onCellClick,
  onCellHover,
  onCellLeave
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Convert RGB to hex
  const rgbToHex = useCallback((r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }, []);

  // Get display color for a pixel (either original or mapped)
  const getDisplayColor = useCallback((pixel) => {
    const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);

    if (!showMappedColors || !colorMapping || Object.keys(colorMapping).length === 0) {
      return pixelHex;
    }

    const beadColorId = colorMapping[pixelHex];
    if (beadColorId && beadColors && beadColors.length > 0) {
      const beadColor = beadColors.find(c => c.id === beadColorId);
      if (beadColor) {
        return beadColor.hex;
      }
    }

    return pixelHex;
  }, [showMappedColors, colorMapping, beadColors, rgbToHex]);

  // Draw the grid on canvas
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;

    const ctx = canvas.getContext('2d');
    const canvasWidth = width * cellSize;
    const canvasHeight = height * cellSize;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate pegboard grid parameters
    const numBoardsX = Math.ceil(contentDimensions.width / pegboardSize);
    const numBoardsY = Math.ceil(contentDimensions.height / pegboardSize);
    const pegboardWidth = numBoardsX * pegboardSize;
    const pegboardHeight = numBoardsY * pegboardSize;
    const contentOffsetX = Math.floor((pegboardWidth - contentDimensions.width) / 2);
    const contentOffsetY = pegboardHeight - contentDimensions.height;
    const pegboardMinX = contentDimensions.offsetX - contentOffsetX;
    const pegboardMinY = contentDimensions.offsetY - contentOffsetY;
    const pegboardMaxX = pegboardMinX + pegboardWidth - 1;
    const pegboardMaxY = pegboardMinY + pegboardHeight - 1;

    // Draw pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // When mirrored, read from the opposite x position
        const sourceX = isMirrored ? (width - 1 - x) : x;
        const pixel = grid[y][sourceX];
        const isBackground = backgroundMask && removeBackground && backgroundMask[y] && backgroundMask[y][sourceX];

        // Skip background pixels if removal is enabled
        if (isBackground) {
          ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
          ctx.globalAlpha = 0.5;
        } else {
          const color = getDisplayColor(pixel);
          ctx.fillStyle = color;
          ctx.globalAlpha = 1.0;
        }

        const px = x * cellSize;
        const py = y * cellSize;

        if (beadShape === 'circle') {
          // Draw circular bead
          ctx.beginPath();
          const centerX = px + cellSize / 2;
          const centerY = py + cellSize / 2;
          const radius = cellSize * 0.4;
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Add bead shadow/depth
          if (!isBackground) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        } else {
          // Draw square pixel
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        // Draw cell borders
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }

    // Draw pegboard grid overlay
    if (showPegboardGrid) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;

      for (let y = 0; y <= height; y++) {
        const isInPegboardArea = y >= pegboardMinY && y <= pegboardMaxY + 1;
        if (!isInPegboardArea) continue;

        const relY = y - pegboardMinY;
        if (relY % pegboardSize === 0) {
          const py = y * cellSize;
          ctx.beginPath();
          ctx.moveTo(pegboardMinX * cellSize, py);
          ctx.lineTo((pegboardMaxX + 1) * cellSize, py);
          ctx.stroke();
        }
      }

      for (let x = 0; x <= width; x++) {
        const isInPegboardArea = x >= pegboardMinX && x <= pegboardMaxX + 1;
        if (!isInPegboardArea) continue;

        const relX = x - pegboardMinX;
        if (relX % pegboardSize === 0) {
          const px = x * cellSize;
          ctx.beginPath();
          ctx.moveTo(px, pegboardMinY * cellSize);
          ctx.lineTo(px, (pegboardMaxY + 1) * cellSize);
          ctx.stroke();
        }
      }
    }

    // Draw selected cell highlight
    if (selectedCell) {
      const px = selectedCell.x * cellSize;
      const py = selectedCell.y * cellSize;
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, cellSize, cellSize);
    }

    // Draw hovered cell highlight
    if (hoveredCell) {
      const px = hoveredCell.x * cellSize;
      const py = hoveredCell.y * cellSize;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, cellSize, cellSize);
    }

    ctx.globalAlpha = 1.0;
  }, [
    grid,
    width,
    height,
    cellSize,
    colorMapping,
    beadColors,
    showMappedColors,
    beadShape,
    showPegboardGrid,
    pegboardSize,
    contentDimensions,
    backgroundMask,
    removeBackground,
    selectedCell,
    hoveredCell,
    isMirrored,
    getDisplayColor
  ]);

  // Redraw when dependencies change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Handle mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = Math.floor(mouseX / cellSize);
    const y = Math.floor(mouseY / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const pixel = grid[y][x];
      onCellHover(x, y, pixel);
    }
  }, [cellSize, width, height, grid, onCellHover]);

  const handleMouseLeave = useCallback(() => {
    onCellLeave();
  }, [onCellLeave]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = Math.floor(mouseX / cellSize);
    const y = Math.floor(mouseY / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const pixel = grid[y][x];
      onCellClick(x, y, pixel);
    }
  }, [cellSize, width, height, grid, onCellClick]);

  return (
    <div ref={containerRef} className="flex justify-center items-center bg-gray-900/50 rounded p-4 overflow-auto">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
