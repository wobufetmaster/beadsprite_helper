import { useRef, useEffect } from 'react';
import { PERLER_COLORS } from '../data/perlerColors';
import { getContrastTextColor } from '../utils/labelGenerator';

/**
 * LabeledPatternRenderer - Offscreen canvas for labeled PDF exports
 * Renders bead pattern with color code labels on each pixel
 */
export default function LabeledPatternRenderer({
  beadGrid,
  colorLabels,
  backgroundMask,
  removeBackground,
  beadShape = 'square',
  showPegboardGrid = false,
  onCanvasReady,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!beadGrid || !colorLabels || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gridWidth = beadGrid[0]?.length || 0;
    const gridHeight = beadGrid.length;

    if (gridWidth === 0 || gridHeight === 0) return;

    // Minimum pixel size to ensure labels are readable
    const MIN_PIXEL_SIZE = 20;
    const pixelSize = MIN_PIXEL_SIZE;

    // Find bounding box of actual beads
    let minX = gridWidth, maxX = -1, minY = gridHeight, maxY = -1;

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

      // If no non-background pixels found, use full grid
      if (maxX === -1) {
        minX = 0;
        maxX = gridWidth - 1;
        minY = 0;
        maxY = gridHeight - 1;
      }
    } else {
      // Use full grid
      minX = 0;
      maxX = gridWidth - 1;
      minY = 0;
      maxY = gridHeight - 1;
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Set canvas size based on content
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Build bead color lookup
    const beadColorMap = {};
    PERLER_COLORS.forEach(color => {
      beadColorMap[color.id] = color.hex;
    });

    // Draw each pixel
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Skip background pixels
        if (backgroundMask && removeBackground && backgroundMask[y]?.[x]) {
          continue;
        }

        const beadId = beadGrid[y]?.[x];
        if (!beadId) continue;

        const beadHex = beadColorMap[beadId] || '#CCCCCC';
        const label = colorLabels[beadId] || '??';

        const px = (x - minX) * pixelSize;
        const py = (y - minY) * pixelSize;

        // Draw bead
        if (beadShape === 'circle') {
          // Draw circle
          ctx.fillStyle = beadHex;
          ctx.beginPath();
          ctx.arc(
            px + pixelSize / 2,
            py + pixelSize / 2,
            pixelSize / 2 - 1,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Draw circle border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          // Draw square
          ctx.fillStyle = beadHex;
          ctx.fillRect(px, py, pixelSize, pixelSize);

          // Draw square border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, pixelSize, pixelSize);
        }

        // Draw label
        const textColor = getContrastTextColor(beadHex);
        ctx.fillStyle = textColor;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + pixelSize / 2, py + pixelSize / 2);
      }
    }

    // Draw pegboard grid if enabled (29x29 bead sections)
    if (showPegboardGrid) {
      const pegboardSize = 29;

      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3;

      // Draw vertical lines
      for (let x = pegboardSize; x < width; x += pegboardSize) {
        const px = x * pixelSize;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = pegboardSize; y < height; y += pegboardSize) {
        const py = y * pixelSize;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
      }
    }

    // Notify parent component
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [beadGrid, colorLabels, backgroundMask, removeBackground, beadShape, showPegboardGrid, onCanvasReady]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
    />
  );
}
