import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText: string;
  cancelButtonText: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmButtonText,
  cancelButtonText 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50">
             <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">{message}</p>
        </div>
      </div>
      <footer className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
        <Button variant="secondary" onClick={onClose}>{cancelButtonText}</Button>
        <Button 
            className="bg-red-600 hover:bg-red-700 focus:ring-red-300" 
            onClick={onConfirm}
        >
            {confirmButtonText}
        </Button>
      </footer>
    </Modal>
  );
};

export default ConfirmationModal;