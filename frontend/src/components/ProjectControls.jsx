import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';

export default function ProjectControls() {
  const { exportProject, importProject, parsedPixels } = useProjectStore();
  const { isLoading } = useUIStore();

  const handleExport = async () => {
    if (!parsedPixels) {
      alert('No project to export. Please upload an image first.');
      return;
    }

    try {
      const result = await exportProject();
      console.log('Project exported:', result.filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export project. Please try again.');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Confirm before overwriting current project
    if (parsedPixels) {
      const confirmed = window.confirm(
        'This will replace your current project. Are you sure you want to continue?'
      );
      if (!confirmed) {
        event.target.value = ''; // Reset file input
        return;
      }
    }

    try {
      await importProject(file);
      console.log('Project imported successfully');
      event.target.value = ''; // Reset file input for next time
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Failed to import project: ${error.message}`);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 sm:p-4">
      <h2 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">Project Management</h2>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Save Project Button */}
        <button
          onClick={handleExport}
          disabled={!parsedPixels || isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors
                     font-medium text-sm"
          title={!parsedPixels ? 'Load an image first' : 'Export project as JSON'}
        >
          Save Project
        </button>

        {/* Load Project Button */}
        <label className="flex-1">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isLoading}
            className="hidden"
          />
          <div
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                       disabled:bg-gray-600 cursor-pointer transition-colors
                       font-medium text-sm text-center"
          >
            Load Project
          </div>
        </label>
      </div>

      {!parsedPixels && (
        <p className="text-xs text-gray-400 mt-2">
          Upload an image to enable project save
        </p>
      )}
    </div>
  );
}
