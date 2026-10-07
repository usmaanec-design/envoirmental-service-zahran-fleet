import React, { useState, useEffect } from 'react';
import type { Language, User } from '../types';

interface DeleteProjectModalProps {
  project: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (project: User) => Promise<boolean>;
  lang: Language;
}

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onConfirmDelete,
  lang,
}) => {
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset state when project changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setIsDeleting(false);
      setErrorMessage('');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const isAr = lang === 'ar';
  const targetProjectName = project.projectName || '';
  const isMatch = typedName.trim() === targetProjectName.trim();

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage('');

    try {
      const success = await onConfirmDelete(project);
      if (success) {
        onClose();
      } else {
        setErrorMessage(
          isAr
            ? 'فشل حذف المشروع. يرجى المحاولة مرة أخرى.'
            : 'Failed to delete project. Please try again.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isAr ? 'حدث خطأ أثناء الحذف' : 'An error occurred during deletion'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isAr ? 'rtl' : 'ltr'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/50 max-w-lg w-full overflow-hidden transform transition-all duration-200 scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-950/40 p-5 border-b border-red-100 dark:border-red-900/40 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center flex-shrink-0 text-xl shadow-inner">
            <i className="fas fa-trash-alt"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 leading-tight">
              {isAr ? 'حذف المشروع نهائياً من النظام' : 'Delete Project Permanently'}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {isAr
                ? 'سيتم مسح هذا المشروع وكافة بياناته بالكامل من Firebase'
                : 'This project and all its data will be completely deleted from Firebase'}
            </p>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <i className="fas fa-times text-base"></i>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Warning banner */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-sm mt-0.5"></i>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {isAr
                ? 'تحذير شديد: هذا الإجراء لا يمكن الرجوع عنه! سيتم حذف المركبات، السائقين، القوى العاملة، البلاغات وحساب الدخول نهائياً.'
                : 'Strict Warning: This action cannot be undone! All vehicles, drivers, manpower, incidents, and credentials will be permanently erased.'}
            </p>
          </div>

          {/* Project Details Card */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3.5 border border-gray-200 dark:border-gray-600 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">{isAr ? 'اسم المشروع:' : 'Project Name:'}</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono">{project.projectName}</span>
            </div>
            {project.projectManagerName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">{isAr ? 'المدير:' : 'Manager:'}</span>
                <span className="text-gray-800 dark:text-gray-200">{project.projectManagerName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">{isAr ? 'البريد الإلكتروني:' : 'Email:'}</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">{project.email}</span>
            </div>
            {project.projectId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">{isAr ? 'معرف المشروع:' : 'Project ID:'}</span>
                <span className="text-gray-700 dark:text-gray-300 font-mono">{project.projectId}</span>
              </div>
            )}
          </div>

          {/* Typing confirmation instruction */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? (
                <>
                  لتأكيد الحذف، اكتب اسم المشروع أدناه بنفس التهجئة:
                </>
              ) : (
                <>
                  To confirm deletion, type the exact project name below:
                </>
              )}
            </label>

            {/* Target name reference pill */}
            <div className="flex items-center justify-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2 text-xs">
              <span className="font-mono font-bold text-red-700 dark:text-red-300">
                {targetProjectName}
              </span>
            </div>

            {/* Input field */}
            <div className="relative">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={isAr ? 'اكتب اسم المشروع هنا بالضبط...' : 'Type exact project name here...'}
                disabled={isDeleting}
                autoFocus
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none transition-all ${
                  typedName.length === 0
                    ? 'border-gray-300 dark:border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                    : isMatch
                    ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30'
                    : 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                }`}
              />

              {/* Status indicator badge */}
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                {typedName.length === 0 ? (
                  <span className="text-gray-400">
                    {isAr ? 'الحقل مطلوب للتأكيد' : 'Required for confirmation'}
                  </span>
                ) : isMatch ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                    <i className="fas fa-check-circle"></i>
                    {isAr ? 'الاسم مطابق تماماً. جاهز للحذف.' : 'Name matches. Ready to delete.'}
                  </span>
                ) : (
                  <span className="text-red-500 font-medium flex items-center gap-1">
                    <i className="fas fa-times-circle"></i>
                    {isAr ? 'الاسم غير متطابق بعد' : 'Name does not match yet'}
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm ${
              !isMatch || isDeleting
                ? 'bg-red-300 dark:bg-red-950 text-white cursor-not-allowed opacity-60'
                : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white hover:shadow-md cursor-pointer'
            }`}
          >
            {isDeleting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>{isAr ? 'جاري الحذف من Firebase...' : 'Deleting from Firebase...'}</span>
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i>
                <span>{isAr ? 'حذف المشروع نهائياً' : 'Delete Project Permanently'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectModal;
