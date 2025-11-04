import { useRef, useEffect } from 'react';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * PatternRenderer - Hidden canvas component for high-quality pattern export
 * Renders bead pattern to canvas for PNG/PDF export
 */
export default function PatternRenderer({
  beadGrid,
  backgroundMask,
  removeBackground,
  beadShape = 'square',
  showPegboardGrid = false,
  onCanvasReady,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!beadGrid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gridWidth = beadGrid[0]?.length || 0;
    const gridHeight = beadGrid.length;

    if (gridWidth === 0 || gridHeight === 0) return;

    console.log('PatternRenderer rendering with showPegboardGrid:', showPegboardGrid);
    console.log('Original grid dimensions:', gridWidth, 'x', gridHeight);

    // Find bounding box of actual beads FIRST (before sizing canvas)
    let minX = gridWidth, maxX = -1, minY = gridHeight, maxY = -1;
    let width, height, offsetX, offsetY;
    const pegboardSize = 29;
    const padding = 5; // pixels of gray padding around pegboard sections

    if (backgroundMask && removeBackground) {
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (!backgroundMask[y]?.[x]) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Calculate content dimensions (bounding box size)
      const contentWidth = maxX - minX + 1;
      const contentHeight = maxY - minY + 1;

      // Calculate number of pegboards needed based on content size (like UI does)
      const numBoardsX = Math.ceil(contentWidth / pegboardSize);
      const numBoardsY = Math.ceil(contentHeight / pegboardSize);

      // Total pegboard area dimensions
      const pegboardWidth = numBoardsX * pegboardSize;
      const pegboardHeight = numBoardsY * pegboardSize;

      // Center horizontally and align to bottom vertically
      const contentOffsetX = Math.floor((pegboardWidth - contentWidth) / 2);
      const contentOffsetY = pegboardHeight - contentHeight;

      // Canvas offset accounts for centering/alignment
      offsetX = minX - padding - contentOffsetX;
      offsetY = minY - padding - contentOffsetY;
      width = pegboardWidth + (padding * 2);
      height = pegboardHeight + (padding * 2);

      console.log('Sprite bounds:', minX, minY, 'to', maxX, maxY);
      console.log('Content dimensions:', contentWidth, 'x', contentHeight);
      console.log('Pegboards needed:', numBoardsX, 'x', numBoardsY, '=', numBoardsX * numBoardsY);
      console.log('Content offset (center/bottom):', contentOffsetX, contentOffsetY);
      console.log('Canvas size with padding:', width, 'x', height, 'offset:', offsetX, offsetY);
    } else {
      minX = 0;
      maxX = gridWidth - 1;
      minY = 0;
      maxY = gridHeight - 1;
      offsetX = 0;
      offsetY = 0;
      width = gridWidth;
      height = gridHeight;
    }

    // Calculate pixel size for ~3000px max dimension at 300 DPI
    const maxDimension = Math.max(width, height);
    const pixelSize = Math.floor(3000 / maxDimension);

    // Set canvas dimensions to cropped size
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Fill gray background (for padding area)
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Optional: Draw pegboard BEFORE beads (so it appears behind)
    if (showPegboardGrid) {
      console.log('Drawing pegboard. Canvas size:', width, 'x', height, 'pixelSize:', pixelSize);
      console.log('Drawing with offset:', offsetX, offsetY);

      // Draw pegboard holes for entire pegboard area (excluding padding)
      for (let y = padding; y < height - padding; y++) {
        for (let x = padding; x < width - padding; x++) {
          const centerX = x * pixelSize + pixelSize / 2;
          const centerY = y * pixelSize + pixelSize / 2;
          const holeRadius = Math.max(2, pixelSize / 8);

          // Draw pegboard hole (light gray circle)
          ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
          ctx.beginPath();
          ctx.arc(centerX, centerY, holeRadius, 0, Math.PI * 2);
          ctx.fill();

          // Draw darker outline for the hole
          ctx.strokeStyle = 'rgba(140, 140, 140, 0.5)';
          ctx.lineWidth = Math.max(1, pixelSize / 30);
          ctx.stroke();
        }
      }

      // Draw darker lines at 29x29 pegboard boundaries
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = Math.max(3, pixelSize / 6);

      // Pegboard area extends from the content origin
      // Draw vertical lines - every 29 pixels within pegboard area
      for (let boardX = 0; boardX <= Math.ceil((width - padding * 2) / pegboardSize); boardX++) {
        const canvasX = padding + (boardX * pegboardSize);
        if (canvasX <= width - padding) {
          ctx.beginPath();
          ctx.moveTo(canvasX * pixelSize, padding * pixelSize);
          ctx.lineTo(canvasX * pixelSize, (height - padding) * pixelSize);
          ctx.stroke();
        }
      }

      // Draw horizontal lines - every 29 pixels within pegboard area
      for (let boardY = 0; boardY <= Math.ceil((height - padding * 2) / pegboardSize); boardY++) {
        const canvasY = padding + (boardY * pegboardSize);
        if (canvasY <= height - padding) {
          ctx.beginPath();
          ctx.moveTo(padding * pixelSize, canvasY * pixelSize);
          ctx.lineTo((width - padding) * pixelSize, canvasY * pixelSize);
          ctx.stroke();
        }
      }
    }

    // Create bead color lookup map
    const beadColorMap = {};
    PERLER_COLORS.forEach(color => {
      beadColorMap[color.id] = color.hex;
    });

    // Render each bead
    for (let gridY = offsetY + padding; gridY < offsetY + height - padding; gridY++) {
      for (let gridX = offsetX + padding; gridX < offsetX + width - padding; gridX++) {
        // Skip if outside grid bounds
        if (gridY < 0 || gridY >= gridHeight || gridX < 0 || gridX >= gridWidth) continue;

        // Skip background pixels if removeBackground is true
        if (backgroundMask && removeBackground && backgroundMask[gridY]?.[gridX]) {
          continue;
        }

        const beadId = beadGrid[gridY][gridX];
        const beadHex = beadColorMap[beadId];

        if (!beadHex) continue;

        // Calculate position on the canvas (including padding)
        const canvasX = gridX - offsetX;
        const canvasY = gridY - offsetY;
        const posX = canvasX * pixelSize;
        const posY = canvasY * pixelSize;

        if (beadShape === 'circle') {
          // Draw circular bead with radial gradient for depth
          const centerX = posX + pixelSize / 2;
          const centerY = posY + pixelSize / 2;
          const radius = pixelSize * 0.4; // 80% of cell (40% radius)

          // Create radial gradient
          const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3,
            centerY - radius * 0.3,
            radius * 0.1,
            centerX,
            centerY,
            radius
          );

          // Lighter center for 3D effect
          const lightColor = lightenColor(beadHex, 30);
          gradient.addColorStop(0, lightColor);
          gradient.addColorStop(0.7, beadHex);
          gradient.addColorStop(1, darkenColor(beadHex, 20));

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Add subtle stroke
          ctx.strokeStyle = darkenColor(beadHex, 30);
          ctx.lineWidth = Math.max(1, pixelSize / 20);
          ctx.stroke();
        } else {
          // Draw square bead
          ctx.fillStyle = beadHex;
          ctx.fillRect(posX, posY, pixelSize, pixelSize);

          // Add subtle border
          ctx.strokeStyle = darkenColor(beadHex, 20);
          ctx.lineWidth = Math.max(1, pixelSize / 20);
          ctx.strokeRect(posX, posY, pixelSize, pixelSize);
        }
      }
    }


    // Notify parent that canvas is ready
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [beadGrid, backgroundMask, removeBackground, beadShape, showPegboardGrid, onCanvasReady]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}

// Helper function to lighten a hex color
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Helper function to darken a hex color
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0xFF) - Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
