import React, { useState, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Select from './ui/Select';
import Table, { type Column } from './ui/Table';
import type { Supervisor, Foreman, Labour, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ManpowerSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisors: Supervisor[];
  lang: Language;
}

const ManpowerSummaryModal: React.FC<ManpowerSummaryModalProps> = ({ 
  isOpen, 
  onClose, 
  supervisors, 
  lang 
}) => {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [selectedForemanId, setSelectedForemanId] = useState<string>('');
  
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  // Get selected supervisor
  const selectedSupervisor = useMemo(() => {
    return supervisors.find(s => s.id === selectedSupervisorId) || null;
  }, [supervisors, selectedSupervisorId]);

  // Get selected foreman
  const selectedForeman = useMemo(() => {
    if (!selectedSupervisor) return null;
    return selectedSupervisor.foremen?.find(f => f.id === selectedForemanId) || null;
  }, [selectedSupervisor, selectedForemanId]);

  // Reset selections when closing
  const handleClose = () => {
    setSelectedSupervisorId('');
    setSelectedForemanId('');
    onClose();
  };

  // Reset foreman selection when supervisor changes
  const handleSupervisorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSupervisorId(e.target.value);
    setSelectedForemanId(''); // Reset foreman selection
  };

  // Supervisor options for dropdown
  const supervisorOptions = useMemo(() => {
    return supervisors.map(supervisor => ({
      value: supervisor.id,
      label: `${supervisor.name} - ${supervisor.area || 'N/A'} (${supervisor.foremen?.length || 0} ${t.foremen})`
    }));
  }, [supervisors, t]);

  // Foreman options for dropdown
  const foremanOptions = useMemo(() => {
    if (!selectedSupervisor) return [];
    return (selectedSupervisor.foremen || []).map(foreman => ({
      value: foreman.id,
      label: `${foreman.name} - ${foreman.empId || foreman.iqama} (${foreman.labours?.length || 0} ${t.labour})`
    }));
  }, [selectedSupervisor, t]);

  // Labour columns for table
  const labourColumns: Column<Labour>[] = useMemo(() => [
    { key: 'name', header: t.labourName, sortable: true },
    { key: 'iqama', header: t.labourIqama, sortable: true },
    { key: 'empId', header: t.labourEmpId, sortable: true, render: (labour) => labour.empId || 'N/A' },
  ], [t]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.manpowerSummaryTitle} size="large">
      <div className="p-6 space-y-6">
        
        {/* Step 1: Select Supervisor */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
            <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">1</span>
            {t.selectSupervisor}
          </h3>
          <Select
            name="supervisor"
            value={selectedSupervisorId}
            onChange={handleSupervisorChange}
            options={supervisorOptions}
            placeholder={t.selectSupervisor + '...'}
          />
        </div>

        {/* Step 2: Select Foreman (shown only when supervisor is selected) */}
        {selectedSupervisorId && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">2</span>
              {t.selectForeman}
            </h3>
            
            {foremanOptions.length > 0 ? (
              <Select
                name="foreman"
                value={selectedForemanId}
                onChange={(e) => setSelectedForemanId(e.target.value)}
                options={foremanOptions}
                placeholder={t.selectForeman + '...'}
              />
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {t.noForemenUnderSupervisor}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Show Labour List (shown only when foreman is selected) */}
        {selectedForemanId && selectedForeman && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
              {t.labourDetails} - {selectedForeman.name}
            </h3>
            
            {selectedForeman.labours && selectedForeman.labours.length > 0 ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <Table
                  columns={labourColumns}
                  data={selectedForeman.labours}
                  initialSortKey="name"
                />
              </div>
            ) : (
              <div className="p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                <i className="fas fa-users text-gray-400 text-3xl mb-3"></i>
                <p className="text-gray-500 dark:text-gray-400">{t.noLabourUnderForeman}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions when nothing is selected */}
        {!selectedSupervisorId && (
          <div className="text-center py-12">
            <div className="mb-6">
              <i className="fas fa-sitemap text-gray-300 text-6xl mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t.manpowerSummaryTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t.selectSupervisorFirst}
              </p>
            </div>
            
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {supervisors.length}
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-300">{t.totalSupervisors}</div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {supervisors.reduce((total, supervisor) => total + (supervisor.foremen?.length || 0), 0)}
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">{t.totalForemen}</div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {supervisors.reduce((total, supervisor) => 
                    total + (supervisor.foremen?.reduce((foremanTotal, foreman) => 
                      foremanTotal + (foreman.labours?.length || 0), 0) || 0), 0
                  )}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-300">{t.totalLabour}</div>
              </div>
            </div>
          </div>
        )}

        {/* Show instruction to select foreman when supervisor is selected but no foreman */}
        {selectedSupervisorId && !selectedForemanId && foremanOptions.length > 0 && (
          <div className="text-center py-8">
            <i className="fas fa-arrow-down text-orange-400 text-2xl mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">{t.selectForemanToViewLabour}</p>
          </div>
        )}
      </div>

      <footer className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
        <Button variant="secondary" onClick={handleClose}>
          {t.close || 'Close'}
        </Button>
      </footer>
    </Modal>
  );
};

export default ManpowerSummaryModal;