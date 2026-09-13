import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadProjectData } from '../firebase/service';
import { Supervisor, Foreman } from '../types';
import { TRANSLATIONS } from '../constants';
import type { Language } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Input from './ui/Input';
import FormStatus from './ui/FormStatus';
import ConfirmationModal from './ui/ConfirmationModal';
import { readExcelFile } from '../utils/export';

interface ViewAllForemenPageProps {
  onBack: () => void;
  lang: Language;
  onImportForemen?: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
  onDeleteSelectedForemen?: (foremanIds: string[]) => Promise<void>;
}

interface ForemenRecord extends Foreman {
  assignedSupervisor: string;
  totalLabours: number;
}

export const ViewAllForemenPage: React.FC<ViewAllForemenPageProps> = ({ 
  onBack, 
  lang, 
  onImportForemen, 
  onDeleteSelectedForemen 
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
      console.error('Error loading foremen data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmBulkDelete = async () => {
    try {
      if (selectedIds.length > 0 && onDeleteSelectedForemen) {
        await onDeleteSelectedForemen(selectedIds);
        setSelectedIds([]);
        setIsBulkDeleteModalOpen(false);
        loadData(); // Reload data
      }
    } catch (error) {
      console.error('Error deleting selected foremen:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportForemen) {
      try {
        setImportProgress(0);
        const data = await readExcelFile(file);
        const result = await onImportForemen(data, setImportProgress);
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

  const handleBulkDelete = async () => {
    if (onDeleteSelectedForemen && selectedIds.length > 0) {
      await onDeleteSelectedForemen(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    }
  };

  // Create consolidated foremen records
  const foremenRecords: ForemenRecord[] = useMemo(() => {
    const records: ForemenRecord[] = [];
    
    supervisors.forEach(supervisor => {
      (supervisor.foremen || []).forEach(foreman => {
        records.push({
          ...foreman,
          assignedSupervisor: supervisor.name || 'N/A',
          totalLabours: (foreman.labours || []).length
        });
      });
    });

    return records;
  }, [supervisors]);

  // Filter foremen based on search
  const filteredForemen = useMemo(() => {
    if (!searchTerm) return foremenRecords;
    
    const term = searchTerm.toLowerCase();
    return foremenRecords.filter(foreman =>
      foreman.name.toLowerCase().includes(term) ||
      (foreman.iqama || '').toLowerCase().includes(term) ||
      foreman.empId.toLowerCase().includes(term) ||
      foreman.assignedSupervisor.toLowerCase().includes(term)
    );
  }, [foremenRecords, searchTerm]);

  const columns: Column<ForemenRecord>[] = useMemo(() => {
    const baseColumns: Column<ForemenRecord>[] = [
      { key: 'name', header: t.foremanName || 'Foreman Name', sortable: true },
      { key: 'iqama', header: t.foremanIqama || 'Foreman Iqama', sortable: true, render: (f) => f.iqama || 'N/A' },
      { key: 'empId', header: (t as any).foremanId || (t as any).foremanEmpId || 'Foreman ID', sortable: true },
      { key: 'assignedSupervisor', header: (t as any).assignedSupervisor || 'Assigned Supervisor', sortable: true },
      { 
        key: 'totalLabours', 
        header: (t as any).totalAssignedLabours || 'Total Assigned Labours', 
        sortable: true,
        render: (f) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {f.totalLabours} labours
          </span>
        )
      }
    ];

    return baseColumns;
  }, [t, lang]);

  // Create export data with template headers
  const exportData = useMemo(() => {
    const headers = {
      'Foreman Name': "",
      'Foreman Iqama': "",
      'empid': "",
      'Supervisor Name': ""
    };

    if (filteredForemen.length === 0) {
      return [headers]; // Return template with headers when no data
    }

    return filteredForemen.map(foreman => ({
      'Foreman Name': foreman.name,
      'Foreman Iqama': foreman.iqama || '',
      'empid': foreman.empId,
      'Supervisor Name': foreman.assignedSupervisor
    }));
  }, [filteredForemen]);

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
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full">
              <i className="fas fa-users text-green-600 dark:text-green-400 text-sm"></i>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{(t as any).allForemenDetails || 'All Foremen Details'}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{(t as any).completeForemenInfo || 'Complete foremen information across all supervisors'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && onDeleteSelectedForemen && (
            <button onClick={() => setIsBulkDeleteModalOpen(true)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm">
              <i className="fas fa-trash-alt me-1.5"></i>
              <span>{t.deleteSelected?.replace('{count}', String(selectedIds.length)) || `Delete Selected (${selectedIds.length})`}</span>
            </button>
          )}
          {onImportForemen && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
              <button onClick={handleImportClick} className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer" title={(t as any).importForemen || 'Import Foremen'}>
                <i className="fas fa-file-import text-xs sm:text-sm"></i>
                <span>{t.import || 'Import'}</span>
              </button>
            </>
          )}
          <ExportButtons data={exportData} title={(t as any).exportForemen || 'all-foremen-details'} />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          name="search"
          placeholder={(t as any).searchForemen || 'Search foremen by name, iqama, employee ID, or supervisor...'}
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
            <span>{t.importing || 'Importing foremen...'}</span>
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
      {filteredForemen.length > 0 ? (
        <Table<ForemenRecord>
          columns={columns}
          data={filteredForemen}
          initialSortKey="name"
          selectable={!!onDeleteSelectedForemen}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <i className="fas fa-users text-4xl mb-4"></i>
            <p>{searchTerm ? ((t as any).noForemenFound || 'No foremen found matching your search') : ((t as any).noForemenAvailable || 'No foremen data available')}</p>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {foremenRecords.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="text-green-700 dark:text-green-300">
              {t.totalForemen || 'Total Foremen'}: <span className="font-semibold">{foremenRecords.length}</span>
            </div>
            <div className="text-green-700 dark:text-green-300">
              {(t as any).totalAssignedLabours || 'Total Assigned Labours'}: <span className="font-semibold">
                {foremenRecords.reduce((sum, foreman) => sum + foreman.totalLabours, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {onDeleteSelectedForemen && (
        <ConfirmationModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDelete}
          title={(t as any).deleteSelectedTitle || 'Delete Selected Foremen'}
          message={t.deleteSelectedItemsMessage?.replace('{count}', String(selectedIds.length)) || `Are you sure you want to delete ${selectedIds.length} selected foremen?`}
          confirmButtonText={t.delete || 'Delete'}
          cancelButtonText={t.cancel || 'Cancel'}
        />
      )}
    </div>
  );
};