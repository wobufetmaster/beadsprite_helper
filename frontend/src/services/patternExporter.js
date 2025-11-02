/**
 * Pattern export service
 * Handles exporting bead patterns as PNG and PDF files
 */

import { jsPDF } from 'jspdf';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * Export pattern canvas as PNG file
 * @param {HTMLCanvasElement} canvas - Canvas element with rendered pattern
 * @param {string} filename - Optional custom filename
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export async function exportPNG(canvas, filename) {
  try {
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalFilename = filename || `beadsprite-pattern-${date}.png`;

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }

        // Trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        resolve({ success: true, filename: finalFilename });
      }, 'image/png');
    });
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw new Error('Failed to export PNG');
  }
}

/**
 * Export pattern and legend as PDF file with labeled grid
 * @param {HTMLCanvasElement} canvas - Canvas element with labeled pattern
 * @param {Array} legendData - Array of {beadId, beadName, hex, count} objects
 * @param {Object} colorLabels - Map of beadId to label codes
 * @param {string} filename - Optional custom filename
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export async function exportPDF(canvas, legendData, colorLabels, filename) {
  try {
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalFilename = filename || `beadsprite-pattern-${date}.pdf`;

    // Create PDF document (A4 size: 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page 1: Pattern Image
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // Calculate image dimensions to fit page
    const maxWidth = pageWidth - 2 * margin;
    const maxHeight = pageHeight - 2 * margin;
    const aspectRatio = canvas.width / canvas.height;

    let imgWidth, imgHeight;
    if (aspectRatio > maxWidth / maxHeight) {
      // Width is limiting factor
      imgWidth = maxWidth;
      imgHeight = maxWidth / aspectRatio;
    } else {
      // Height is limiting factor
      imgHeight = maxHeight;
      imgWidth = maxHeight * aspectRatio;
    }

    // Center image on page
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

    // Page 2: Color Legend with codes
    pdf.addPage();

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bead Color Legend', margin, margin + 8);

    // Table header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    let yPos = margin + 18;

    // Column headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Code', margin + 5, yPos);
    pdf.text('Color', margin + 25, yPos);
    pdf.text('Name', margin + 50, yPos);
    pdf.text('Count', pageWidth - margin - 25, yPos);
    yPos += 2;

    // Header underline
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Add labels to legend data and sort by label code
    const labeledLegend = legendData.map(item => ({
      ...item,
      label: colorLabels[item.beadId] || '??'
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Legend rows
    pdf.setFont('helvetica', 'normal');
    const rowHeight = 8;
    const swatchSize = 6;

    for (const item of labeledLegend) {
      // Check if we need a new page
      if (yPos + rowHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin + 10;

        // Repeat header on new page
        pdf.setFont('helvetica', 'bold');
        pdf.text('Code', margin + 5, yPos);
        pdf.text('Color', margin + 25, yPos);
        pdf.text('Name', margin + 50, yPos);
        pdf.text('Count', pageWidth - margin - 25, yPos);
        yPos += 2;
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
      }

      // Draw label code
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.label, margin + 5, yPos);
      pdf.setFont('helvetica', 'normal');

      // Draw color swatch
      pdf.setFillColor(item.hex);
      pdf.rect(margin + 20, yPos - swatchSize + 1, swatchSize, swatchSize, 'F');

      // Draw swatch border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.rect(margin + 20, yPos - swatchSize + 1, swatchSize, swatchSize, 'S');

      // Draw text
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.beadName, margin + 30, yPos);
      pdf.text(item.count.toString(), pageWidth - margin - 25, yPos, { align: 'right' });

      yPos += rowHeight;
    }

    // Add total count at bottom
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    const totalCount = legendData.reduce((sum, item) => sum + item.count, 0);
    pdf.text('Total Beads:', margin + 50, yPos);
    pdf.text(totalCount.toString(), pageWidth - margin - 25, yPos, { align: 'right' });

    // Save PDF
    pdf.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export PDF');
  }
}

/**
 * Generate legend data from bead grid
 * @param {Array} beadGrid - 2D array of bead IDs
 * @param {Array} backgroundMask - 2D array of booleans indicating background pixels
 * @param {boolean} removeBackground - Whether to exclude background from counts
 * @returns {Array} Legend data sorted by count descending
 */
export function generateLegendData(beadGrid, backgroundMask, removeBackground) {
  if (!beadGrid || beadGrid.length === 0) {
    return [];
  }

  const beadCounts = {};

  // Count beads
  for (let y = 0; y < beadGrid.length; y++) {
    for (let x = 0; x < beadGrid[y].length; x++) {
      // Skip background pixels if removeBackground is true
      if (backgroundMask && removeBackground && backgroundMask[y]?.[x]) {
        continue;
      }

      const beadId = beadGrid[y][x];
      if (beadId) {
        beadCounts[beadId] = (beadCounts[beadId] || 0) + 1;
      }
    }
  }

  // Create bead color lookup
  const beadColorMap = {};
  PERLER_COLORS.forEach(color => {
    beadColorMap[color.id] = { name: color.name, hex: color.hex };
  });

  // Convert to array and sort by count
  const legendData = Object.entries(beadCounts)
    .map(([beadId, count]) => {
      const bead = beadColorMap[beadId];
      return {
        beadId,
        beadName: bead?.name || beadId,
        hex: bead?.hex || '#000000',
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return legendData;
}
