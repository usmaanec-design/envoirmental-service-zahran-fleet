import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadProjectData } from '../firebase/service';
import { Supervisor, Foreman, Labour } from '../types';
import { TRANSLATIONS } from '../constants';
import type { Language } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Input from './ui/Input';
import FormStatus from './ui/FormStatus';
import ConfirmationModal from './ui/ConfirmationModal';
import { readExcelFile } from '../utils/export';

interface ViewAllLabourPageProps {
  onBack: () => void;
  lang: Language;
  onImportLabour?: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
  onDeleteSelectedLabour?: (labourIds: string[]) => Promise<void>;
}

interface LabourRecord extends Labour {
  assignedForeman: string;
  assignedSupervisor: string;
}

export const ViewAllLabourPage: React.FC<ViewAllLabourPageProps> = ({ 
  onBack, 
  lang, 
  onImportLabour, 
  onDeleteSelectedLabour 
}) => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = localStorage.getItem('zahran_current_user');
      if (!currentUser) return;
      
      const user = JSON.parse(currentUser);
      const email = user.email;
      if (!email) return;

      const projectData = await loadProjectData(email);
      setSupervisors(projectData.supervisors || []);
    } catch (error) {
      console.error('Error loading labour data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmBulkDelete = async () => {
    try {
      if (selectedIds.length > 0 && onDeleteSelectedLabour) {
        await onDeleteSelectedLabour(selectedIds);
        setSelectedIds([]);
        setIsBulkDeleteModalOpen(false);
        loadData(); // Reload data
      }
    } catch (error) {
      console.error('Error deleting selected labour:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportLabour) {
      try {
        setImportProgress(0);
        const data = await readExcelFile(file);
        const result = await onImportLabour(data, setImportProgress);
        if (result.success) {
          setImportStatus({ type: 'success', message: t.importSuccess });
          loadData(); // Reload data
        } else {
          setImportStatus({ type: 'error', message: result.error || t.importError });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t.importError;
        setImportStatus({ type: 'error', message });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImportProgress(null);
        setTimeout(() => setImportStatus(null), 5000);
      }
    }
  };

  // Create consolidated labour records
  const labourRecords: LabourRecord[] = useMemo(() => {
    const records: LabourRecord[] = [];
    
    supervisors.forEach(supervisor => {
      (supervisor.foremen || []).forEach(foreman => {
        (foreman.labours || []).forEach(labour => {
          records.push({
            ...labour,
            assignedForeman: foreman.name || 'N/A',
            assignedSupervisor: supervisor.name || 'N/A'
          });
        });
      });
    });

    return records;
  }, [supervisors]);

  // Filter labour based on search
  const filteredLabour = useMemo(() => {
    if (!searchTerm) return labourRecords;
    
    const term = searchTerm.toLowerCase();
    return labourRecords.filter(labour =>
      labour.name.toLowerCase().includes(term) ||
      (labour.iqama || '').toLowerCase().includes(term) ||
      labour.empId.toLowerCase().includes(term) ||
      labour.assignedForeman.toLowerCase().includes(term) ||
      labour.assignedSupervisor.toLowerCase().includes(term)
    );
  }, [labourRecords, searchTerm]);

  const columns: Column<LabourRecord>[] = useMemo(() => {
    const baseColumns: Column<LabourRecord>[] = [
      { key: 'name', header: t.labourName || 'Labour Name', sortable: true },
      { 
        key: 'iqama', 
        header: t.labourIqama || 'Labour Iqama', 
        sortable: true, 
        render: (l) => l.iqama && l.iqama.trim() && l.iqama !== '' ? l.iqama : 'Not Provided'
      },
      { 
        key: 'empId', 
        header: (t as any).labourId || (t as any).labourEmpId || 'Labour ID', 
        sortable: true,
        render: (l) => l.empId && l.empId.trim() && l.empId !== '' ? l.empId : 'Not Provided'
      },
      { key: 'assignedForeman', header: (t as any).assignedForeman || 'Assigned Foreman', sortable: true },
      { key: 'assignedSupervisor', header: (t as any).assignedSupervisor || 'Assigned Supervisor', sortable: true }
    ];

    return baseColumns;
  }, [t]);

  // Create export data with template headers
  const exportData = useMemo(() => {
    const headers = {
      'Labour Name': "",
      'Labour Iqama': "",
      'empid': "",
      'Assigned Foreman': "",
      'Assigned Supervisor': ""
    };

    if (filteredLabour.length === 0) {
      return [headers]; // Return template with headers when no data
    }

    return filteredLabour.map(labour => ({
      'Labour Name': labour.name,
      'Labour Iqama': labour.iqama && labour.iqama.trim() ? labour.iqama : 'Not Provided',
      'empid': labour.empId && labour.empId.trim() ? labour.empId : 'Not Provided',
      'Assigned Foreman': labour.assignedForeman,
      'Assigned Supervisor': labour.assignedSupervisor
    }));
  }, [filteredLabour]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
            {(t as any).back || 'Back'}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <i className="fas fa-hard-hat text-yellow-600 dark:text-yellow-400 text-sm"></i>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{(t as any).allLabourDetails || 'All Labour Details'}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{(t as any).completeLabourInfo || 'Complete labour information across all foremen and supervisors'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && onDeleteSelectedLabour && (
            <button onClick={() => setIsBulkDeleteModalOpen(true)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm">
              <i className="fas fa-trash-alt me-1.5"></i>
              <span>{t.deleteSelected?.replace('{count}', String(selectedIds.length)) || `Delete Selected (${selectedIds.length})`}</span>
            </button>
          )}
          {onImportLabour && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
              <button onClick={handleImportClick} className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer" title={(t as any).importLabour || 'Import Labour'}>
                <i className="fas fa-file-import text-xs sm:text-sm"></i>
                <span>{t.import || 'Import'}</span>
              </button>
            </>
          )}
          <ExportButtons data={exportData} title={(t as any).exportLabour || 'all-labour-details'} />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          name="search"
          placeholder={(t as any).searchLabour || 'Search labour by name, iqama, ID, foreman, or supervisor...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Import Status */}
      {importStatus && <FormStatus type={importStatus.type} message={importStatus.message} />}
      
      {/* Import Progress Bar */}
      {importProgress !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>{t.importing || 'Importing labour...'}</span>
            <span>{importProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {filteredLabour.length > 0 ? (
        <Table<LabourRecord>
          columns={columns}
          data={filteredLabour}
          initialSortKey="name"
          selectable={!!onDeleteSelectedLabour}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <i className="fas fa-hard-hat text-4xl mb-4"></i>
            <p>{searchTerm ? ((t as any).noLabourFound || 'No labour found matching your search') : ((t as any).noLabourAvailable || 'No labour data available')}</p>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {labourRecords.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="text-yellow-700 dark:text-yellow-300">
              {t.totalLabour || 'Total Labour'}: <span className="font-semibold">{labourRecords.length}</span>
            </div>
            <div className="text-yellow-700 dark:text-yellow-300">
              {(t as any).acrossForemenAndSupervisors || 'Across'} <span className="font-semibold">
                {new Set(labourRecords.map(l => l.assignedForeman)).size}
              </span> {t.foremen || 'Foremen'} {(t as any).and || 'and'} <span className="font-semibold">
                {new Set(labourRecords.map(l => l.assignedSupervisor)).size}
              </span> {t.supervisors || 'Supervisors'}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {onDeleteSelectedLabour && (
        <ConfirmationModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleConfirmBulkDelete}
          title={(t as any).deleteSelectedTitle || 'Delete Selected Labour'}
          message={t.deleteSelectedItemsMessage?.replace('{count}', String(selectedIds.length)) || `Are you sure you want to delete ${selectedIds.length} selected labour?`}
          confirmButtonText={t.delete || 'Delete'}
          cancelButtonText={t.cancel || 'Cancel'}
        />
      )}
    </div>
  );
};