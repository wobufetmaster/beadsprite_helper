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
    const width = beadGrid[0]?.length || 0;
    const height = beadGrid.length;

    if (width === 0 || height === 0) return;

    // Calculate pixel size for ~3000px max dimension at 300 DPI
    const maxDimension = Math.max(width, height);
    const pixelSize = Math.floor(3000 / maxDimension);

    // Set canvas dimensions
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create bead color lookup map
    const beadColorMap = {};
    PERLER_COLORS.forEach(color => {
      beadColorMap[color.id] = color.hex;
    });

    // Render each bead
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip background pixels if removeBackground is true
        if (backgroundMask && removeBackground && backgroundMask[y]?.[x]) {
          continue;
        }

        const beadId = beadGrid[y][x];
        const beadHex = beadColorMap[beadId];

        if (!beadHex) continue;

        const posX = x * pixelSize;
        const posY = y * pixelSize;

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

    // Optional: Draw pegboard grid overlay
    if (showPegboardGrid) {
      ctx.strokeStyle = '#0066CC';
      ctx.lineWidth = Math.max(2, pixelSize / 10);
      ctx.globalAlpha = 0.3;

      // Pegboard squares are typically 29x29 beads
      const pegboardSize = 29;

      // Draw vertical lines
      for (let x = pegboardSize; x < width; x += pegboardSize) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = pegboardSize; y < height; y += pegboardSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(canvas.width, y * pixelSize);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
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
