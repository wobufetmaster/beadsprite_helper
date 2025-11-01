/**
 * Project export/import service
 * Handles saving and loading full project state as JSON
 */

/**
 * Export project state to JSON file
 * @param {object} projectState - Serialized project state from projectStore
 * @param {string} projectName - Project name for filename
 */
export function exportProject(projectState, projectName = 'Untitled Project') {
  try {
    // Create JSON blob
    const json = JSON.stringify(projectState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `beadsprite-project-${date}.json`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Failed to export project:', error);
    throw new Error('Failed to export project');
  }
}

/**
 * Import and validate project JSON file
 * @param {File} file - Uploaded JSON file
 * @returns {Promise<object>} Validated project data
 */
export async function importProject(file) {
  try {
    // Read file as text
    const text = await file.text();

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid project file - not valid JSON');
    }

    // Validate required fields
    if (!data.parsedPixels || !data.colorMapping) {
      throw new Error('Incompatible project format - missing required fields');
    }

    // Validate data structure
    if (!Array.isArray(data.parsedPixels?.grid)) {
      throw new Error('Invalid project data - pixel grid must be an array');
    }

    if (typeof data.colorMapping !== 'object') {
      throw new Error('Invalid project data - color mapping must be an object');
    }

    return data;
  } catch (error) {
    console.error('Failed to import project:', error);
    throw error;
  }
}
