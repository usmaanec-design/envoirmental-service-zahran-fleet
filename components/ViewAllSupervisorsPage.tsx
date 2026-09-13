import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadProjectData } from '../firebase/service';
import { Supervisor } from '../types';
import { TRANSLATIONS } from '../constants';
import type { Language } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Input from './ui/Input';
import FormStatus from './ui/FormStatus';
import ConfirmationModal from './ui/ConfirmationModal';
import { readExcelFile } from '../utils/export';

interface SupervisorRecord {
  id: string;
  name: string;
  iqama: string;
  area: string;
  totalLabour: string;
  totalForemen: string;
  idNumber: string;
  mobile: string;
}

interface ViewAllSupervisorsPageProps {
  supervisors: Supervisor[];
  language: Language;
  onBack: () => void;
  onImport?: (file: File, type: 'supervisor', onProgress?: (progress: number) => void) => void;
  onDeleteMultiple?: (ids: string[]) => Promise<void>;
  isUploading?: boolean;
}

const ViewAllSupervisorsPage: React.FC<ViewAllSupervisorsPageProps> = ({
  supervisors = [],
  language,
  onBack,
  onImport,
  onDeleteMultiple,
  isUploading = false
}) => {
  const t = TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formStatus, setFormStatus] = useState<{
    type: 'success' | 'error' | 'info' | '';
    message: string;
  }>({ type: '', message: '' });

  const supervisorRecords: SupervisorRecord[] = useMemo(() => {
    return supervisors.map(supervisor => ({
      id: supervisor.id || '',
      name: supervisor.name || '',
      iqama: supervisor.iqama || '',
      area: supervisor.area || '',
      totalLabour: supervisor.totalLabour?.toString() || '0',
      totalForemen: supervisor.totalForemen?.toString() || '0',
      idNumber: supervisor.idNumber || '',
      mobile: supervisor.mobile || ''
    }));
  }, [supervisors]);

  // Filter supervisors based on search term
  const filteredSupervisors = useMemo(() => {
    if (!searchTerm) return supervisorRecords;
    
    const term = searchTerm.toLowerCase();
    return supervisorRecords.filter(supervisor => 
      supervisor.name.toLowerCase().includes(term) ||
      supervisor.iqama.toLowerCase().includes(term) ||
      supervisor.area.toLowerCase().includes(term) ||
      supervisor.idNumber.toLowerCase().includes(term)
    );
  }, [supervisorRecords, searchTerm]);

  const columns: Column<SupervisorRecord>[] = useMemo(() => {
    const baseColumns: Column<SupervisorRecord>[] = [
      { key: 'name', header: t.supervisorName || 'Supervisor Name', sortable: true },
      { key: 'iqama', header: t.iqamaNumber || 'Iqama Number', sortable: true },
      { key: 'area', header: t.areaLocation || 'Area/Location', sortable: true },
      { 
        key: 'totalLabour', 
        header: t.totalLabourUnderSupervision || 'Total Labour', 
        sortable: true,
        render: (supervisor) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {supervisor.totalLabour} labour
          </span>
        )
      },
      { 
        key: 'totalForemen', 
        header: t.totalForemenUnderSupervision || 'Total Foremen', 
        sortable: true,
        render: (supervisor) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {supervisor.totalForemen} foremen
          </span>
        )
      },
      { key: 'idNumber', header: t.idNumber || 'ID Number', sortable: true },
      { key: 'mobile', header: t.mobileNumber || 'Mobile Number', sortable: true }
    ];

    return baseColumns;
  }, [t]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImport) return;

    try {
      setFormStatus({ type: 'info', message: t.uploadingData || 'Uploading data...' });
      await onImport(file, 'supervisor', setUploadProgress);
      setFormStatus({ type: 'success', message: t.uploadSuccessful || 'Upload successful!' });
      
      setTimeout(() => {
        setFormStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setFormStatus({ type: 'error', message: t.uploadFailed || 'Upload failed. Please try again.' });
      
      setTimeout(() => {
        setFormStatus({ type: '', message: '' });
      }, 5000);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteMultiple || selectedSupervisors.length === 0) return;
    
    setIsDeleting(true);
    try {
      await onDeleteMultiple(selectedSupervisors);
      setSelectedSupervisors([]);
      setShowDeleteModal(false);
      setFormStatus({ type: 'success', message: `${selectedSupervisors.length} ${t.supervisorsDeletedSuccessfully || 'supervisors deleted successfully'}` });
      
      setTimeout(() => {
        setFormStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error deleting supervisors:', error);
      setFormStatus({ type: 'error', message: t.deleteError || 'Error deleting supervisors' });
      
      setTimeout(() => {
        setFormStatus({ type: '', message: '' });
      }, 5000);
    }
    setIsDeleting(false);
  };

  const exportData = () => {
    const headers = [
      'Supervisor Name',
      'Iqama Number', 
      'Area/Location',
      'Total Labour Under Supervision',
      'Total Foremen Under Supervision',
      'ID Number',
      'Mobile Number'
    ];
    
    return filteredSupervisors.map(supervisor => [
      supervisor.name,
      supervisor.iqama,
      supervisor.area,
      supervisor.totalLabour,
      supervisor.totalForemen,
      supervisor.idNumber,
      supervisor.mobile
    ]);
  };

  const generateTemplate = () => {
    return [
      'Supervisor Name',
      'Iqama Number',
      'Area/Location', 
      'Total Labour Under Supervision',
      'Total Foremen Under Supervision',
      'ID Number',
      'Mobile Number'
    ];
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              ←
              {t.back || 'Back'}
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {t.allSupervisors || 'All Supervisors'} ({filteredSupervisors.length})
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ExportButtons
              data={exportData()}
              headers={generateTemplate()}
              filename="supervisors"
              onImport={handleFileUpload}
              onGenerateTemplate={generateTemplate}
              selectedCount={selectedSupervisors.length}
              onDeleteSelected={() => setShowDeleteModal(true)}
              isDeleting={isDeleting}
              isUploading={isUploading}
              language={language}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            label={t.searchSupervisors || 'Search supervisors...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchByNameIqamaArea || 'Search by name, iqama, or area...'}
          />
        </div>

        {/* Status Messages */}
        {formStatus.message && (
          <div className="mb-6">
            <FormStatus
              status={formStatus.type === 'info' ? 'uploading' : formStatus.type}
              message={formStatus.message}
              progress={formStatus.type === 'info' ? uploadProgress : undefined}
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <Table
            data={filteredSupervisors}
            columns={columns}
            language={language}
            selectable
            selectedRows={selectedSupervisors}
            onRowSelectionChange={setSelectedSupervisors}
          />
        </div>

        {filteredSupervisors.length === 0 && !isUploading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchTerm 
                ? (t.noSupervisorsMatchSearch || 'No supervisors match your search')
                : (t.noSupervisorsFound || 'No supervisors found')
              }
            </p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteModal(false)}
          title={t.deleteSupervisors || 'Delete Supervisors'}
          message={`${t.confirmDeleteSupervisors || 'Are you sure you want to delete'} ${selectedSupervisors.length} ${t.selectedSupervisors || 'selected supervisors'}?`}
          confirmText={t.delete || 'Delete'}
          cancelText={t.cancel || 'Cancel'}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default ViewAllSupervisorsPage;

export default ViewAllSupervisorsPage;