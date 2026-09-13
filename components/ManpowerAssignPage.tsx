import React, { useEffect, useMemo, useState } from 'react';
import type { Foreman, Labour, Language, ProjectData, Supervisor } from '../types';

interface ManpowerAssignPageProps {
  lang: Language;
  projectData: ProjectData;
  isReadOnly?: boolean;
  onSaveAssignments: (updatedSupervisors: Supervisor[]) => Promise<void>;
}

type ForemanRef = {
  foreman: Foreman;
  supervisorId: string;
  supervisorName: string;
};

type LabourRef = {
  labour: Labour;
  supervisorId: string;
  foremanId: string;
  foremanName: string;
};

const cloneSupervisors = (supervisors: Supervisor[]): Supervisor[] =>
  supervisors.map((s) => ({
    ...s,
    foremen: (s.foremen || []).map((f) => ({
      ...f,
      labours: [...(f.labours || [])],
    })),
  }));

const normalize = (v: string) => v.toLowerCase().trim();

const ManpowerAssignPage: React.FC<ManpowerAssignPageProps> = ({
  lang,
  projectData,
  isReadOnly = false,
  onSaveAssignments,
}) => {
  const [draftSupervisors, setDraftSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [selectedForemanId, setSelectedForemanId] = useState<string>('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [foremanSearch, setForemanSearch] = useState('');
  const [labourSearch, setLabourSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const cloned = cloneSupervisors(projectData.supervisors || []);
    setDraftSupervisors(cloned);
    setSelectedSupervisorId((prev) => prev || cloned[0]?.id || '');
    setSelectedForemanId('');
  }, [projectData.supervisors]);

  const allForemen = useMemo<ForemanRef[]>(() => {
    return draftSupervisors.flatMap((s) =>
      (s.foremen || []).map((f) => ({
        foreman: f,
        supervisorId: s.id,
        supervisorName: s.name,
      }))
    );
  }, [draftSupervisors]);

  const allLabours = useMemo<LabourRef[]>(() => {
    return draftSupervisors.flatMap((s) =>
      (s.foremen || []).flatMap((f) =>
        (f.labours || []).map((l) => ({
          labour: l,
          supervisorId: s.id,
          foremanId: f.id,
          foremanName: f.name,
        }))
      )
    );
  }, [draftSupervisors]);

  const selectedSupervisor = useMemo(() => {
    return draftSupervisors.find((s) => s.id === selectedSupervisorId) || null;
  }, [draftSupervisors, selectedSupervisorId]);

  const selectedForemanRef = useMemo(() => {
    return allForemen.find((f) => f.foreman.id === selectedForemanId) || null;
  }, [allForemen, selectedForemanId]);

  useEffect(() => {
    if (!selectedSupervisor && draftSupervisors.length > 0) {
      setSelectedSupervisorId(draftSupervisors[0].id);
      return;
    }

    if (selectedSupervisor) {
      const hasSelectedForeman = (selectedSupervisor.foremen || []).some((f) => f.id === selectedForemanId);
      if (!hasSelectedForeman) {
        setSelectedForemanId('');
      }
    }
  }, [draftSupervisors, selectedSupervisor, selectedForemanId]);

  const filteredSupervisors = useMemo(() => {
    const q = normalize(supervisorSearch);
    if (!q) return draftSupervisors;

    return draftSupervisors.filter((s) => {
      return normalize(s.name).includes(q) || normalize(s.iqama || '').includes(q);
    });
  }, [draftSupervisors, supervisorSearch]);

  const selectedSupervisorForemen = useMemo(() => {
    const q = normalize(foremanSearch);
    const list = selectedSupervisor?.foremen || [];
    if (!q) return list;

    return list.filter((f) => normalize(f.name).includes(q) || normalize(f.iqama || '').includes(q));
  }, [selectedSupervisor, foremanSearch]);

  const unassignedForemenForSelectedSupervisor = useMemo(() => {
    const q = normalize(foremanSearch);
    return allForemen.filter((ref) => {
      if (ref.supervisorId === selectedSupervisorId) return false;
      if (!q) return true;
      return normalize(ref.foreman.name).includes(q) || normalize(ref.foreman.iqama || '').includes(q);
    });
  }, [allForemen, selectedSupervisorId, foremanSearch]);

  const selectedForemanLabours = useMemo(() => {
    const q = normalize(labourSearch);
    const list = selectedForemanRef?.foreman.labours || [];
    if (!q) return list;

    return list.filter((l) => normalize(l.name).includes(q) || normalize(l.iqama || '').includes(q));
  }, [selectedForemanRef, labourSearch]);

  const availableLaboursForSelectedForeman = useMemo(() => {
    const q = normalize(labourSearch);
    return allLabours.filter((ref) => {
      if (ref.foremanId === selectedForemanId) return false;
      if (!q) return true;
      return normalize(ref.labour.name).includes(q) || normalize(ref.labour.iqama || '').includes(q);
    });
  }, [allLabours, selectedForemanId, labourSearch]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(projectData.supervisors || []) !== JSON.stringify(draftSupervisors);
  }, [projectData.supervisors, draftSupervisors]);

  const moveForemanToSelectedSupervisor = (foremanId: string, fromSupervisorId: string) => {
    if (!selectedSupervisorId || fromSupervisorId === selectedSupervisorId) return;

    setDraftSupervisors((prev) => {
      let movedForeman: Foreman | null = null;

      const removed = prev.map((s) => {
        if (s.id !== fromSupervisorId) return s;

        const nextForemen = (s.foremen || []).filter((f) => {
          if (f.id === foremanId) {
            movedForeman = f;
            return false;
          }
          return true;
        });

        return { ...s, foremen: nextForemen };
      });

      if (!movedForeman) return prev;

      return removed.map((s) => {
        if (s.id !== selectedSupervisorId) return s;
        return { ...s, foremen: [...(s.foremen || []), movedForeman as Foreman] };
      });
    });
  };

  const moveLabourToSelectedForeman = (labourId: string, fromForemanId: string) => {
    if (!selectedForemanId || fromForemanId === selectedForemanId) return;

    setDraftSupervisors((prev) => {
      let movedLabour: Labour | null = null;

      const removed = prev.map((s) => ({
        ...s,
        foremen: (s.foremen || []).map((f) => {
          if (f.id !== fromForemanId) return f;

          const nextLabours = (f.labours || []).filter((l) => {
            if (l.id === labourId) {
              movedLabour = l;
              return false;
            }
            return true;
          });

          return { ...f, labours: nextLabours };
        }),
      }));

      if (!movedLabour) return prev;

      return removed.map((s) => ({
        ...s,
        foremen: (s.foremen || []).map((f) => {
          if (f.id !== selectedForemanId) return f;
          return { ...f, labours: [...(f.labours || []), movedLabour as Labour] };
        }),
      }));
    });
  };

  const saveAssignments = async () => {
    if (!hasChanges || isReadOnly) return;

    setIsSaving(true);
    setStatus(null);

    try {
      await onSaveAssignments(draftSupervisors);
      setStatus({
        type: 'success',
        message: lang === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully',
      });
    } catch (error) {
      console.error('Failed to save manpower assignments:', error);
      setStatus({
        type: 'error',
        message: lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full flex-grow flex flex-col min-h-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col max-w-[96rem] mx-auto w-full flex-grow min-h-0">
        <header className="flex-shrink-0 p-4 sm:p-5 flex flex-wrap justify-between items-center border-b-2 border-orange-500 pb-4 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {lang === 'ar' ? 'تعيين القوى العاملة' : 'Assign Manpower'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {lang === 'ar' ? 'إدارة ارتباط المشرفين ورؤساء العمال والعمال' : 'Manage Supervisor Foreman Labour assignments'}
            </p>
          </div>

          <button
            onClick={saveAssignments}
            disabled={isReadOnly || !hasChanges || isSaving}
            className="bg-green-500 text-white px-5 py-2.5 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isSaving
              ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
        </header>

        {status && (
          <div className="px-4 sm:px-5 pt-3">
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                status.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : status.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {status.message}
            </div>
          </div>
        )}

        <div className="flex-grow min-h-0 p-3 sm:p-4 pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[62vh]">
            <section className="rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 font-bold text-center">
                {lang === 'ar' ? 'المشرفون' : 'Supervisors'}
              </div>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن مشرف...' : 'Search Supervisors...'}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-2">
                {filteredSupervisors.map((supervisor) => {
                  const isSelected = supervisor.id === selectedSupervisorId;
                  return (
                    <button
                      key={supervisor.id}
                      onClick={() => {
                        setSelectedSupervisorId(supervisor.id);
                        setSelectedForemanId('');
                      }}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 dark:text-gray-100">{supervisor.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {supervisor.foremen?.length || 0} {lang === 'ar' ? 'رئيس عمال' : 'Foremen'}
                      </div>
                    </button>
                  );
                })}
                {filteredSupervisors.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                    {lang === 'ar' ? 'لا يوجد مشرفون' : 'No supervisors found'}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 font-bold text-center">
                {lang === 'ar' ? 'رؤساء العمال' : 'Foremen'}
              </div>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  value={foremanSearch}
                  onChange={(e) => setForemanSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن رئيس عمال...' : 'Search Foremen...'}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-3">
                {selectedSupervisor ? (
                  <>
                    <div className="text-xs font-bold text-green-600 uppercase tracking-wide">
                      {lang === 'ar' ? `مرتبط بـ ${selectedSupervisor.name}` : `Assigned to ${selectedSupervisor.name}`}
                    </div>
                    {selectedSupervisorForemen.map((refForeman) => {
                      const isSelected = selectedForemanId === refForeman.id;
                      return (
                        <button
                          key={refForeman.id}
                          onClick={() => setSelectedForemanId(refForeman.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                            isSelected
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          <div className="font-semibold text-gray-800 dark:text-gray-100">{refForeman.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {refForeman.labours?.length || 0} {lang === 'ar' ? 'عامل' : 'Labour'}
                          </div>
                        </button>
                      );
                    })}

                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wide pt-2">
                      {lang === 'ar' ? 'غير معين / في مجموعات أخرى' : 'Pending / Unassigned'}
                    </div>
                    {unassignedForemenForSelectedSupervisor.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                        {lang === 'ar' ? 'لا يوجد رؤساء عمال إضافيون' : 'No pending foremen'}
                      </div>
                    ) : (
                      unassignedForemenForSelectedSupervisor.map((ref) => (
                        <div key={ref.foreman.id} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5">
                          <div className="font-semibold text-gray-800 dark:text-gray-100">{ref.foreman.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {lang === 'ar' ? 'الحالي:' : 'Current:'} {ref.supervisorName}
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => moveForemanToSelectedSupervisor(ref.foreman.id, ref.supervisorId)}
                              className="mt-2 text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded"
                            >
                              {lang === 'ar' ? 'تعيين لهذا المشرف' : 'Assign Here'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                    {lang === 'ar' ? 'اختر مشرفا أولا' : 'Select a supervisor first'}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 font-bold text-center">
                {lang === 'ar' ? 'العمال' : 'Labour'}
              </div>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  value={labourSearch}
                  onChange={(e) => setLabourSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن عامل...' : 'Search Labour...'}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-3">
                {selectedForemanRef ? (
                  <>
                    <div className="text-xs font-bold text-green-600 uppercase tracking-wide">
                      {lang === 'ar' ? `مرتبط بـ ${selectedForemanRef.foreman.name}` : `Assigned to ${selectedForemanRef.foreman.name}`}
                    </div>

                    {selectedForemanLabours.map((l) => (
                      <div key={l.id} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5">
                        <div className="font-semibold text-gray-800 dark:text-gray-100">{l.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{l.iqama}</div>
                      </div>
                    ))}

                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wide pt-2">
                      {lang === 'ar' ? 'غير معين / في مجموعات أخرى' : 'Pending / Unassigned'}
                    </div>
                    {availableLaboursForSelectedForeman.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                        {lang === 'ar' ? 'لا يوجد عمال إضافيون' : 'No pending labour'}
                      </div>
                    ) : (
                      availableLaboursForSelectedForeman.map((ref) => (
                        <div key={ref.labour.id} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5">
                          <div className="font-semibold text-gray-800 dark:text-gray-100">{ref.labour.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {lang === 'ar' ? 'الحالي:' : 'Current:'} {ref.foremanName}
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => moveLabourToSelectedForeman(ref.labour.id, ref.foremanId)}
                              className="mt-2 text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded"
                            >
                              {lang === 'ar' ? 'تعيين لهذا الرئيس' : 'Assign Here'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                    {lang === 'ar' ? 'اختر رئيس عمال أولا' : 'Select a Foreman first'}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManpowerAssignPage;
