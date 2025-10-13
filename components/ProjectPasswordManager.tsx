import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';
import FormStatus from './ui/FormStatus';

interface ProjectPasswordManagerProps {
    lang: Language;
    allUsers: User[];
    onUpdateUserPassword: (email: string, newPassword: string) => Promise<void>;
    onUpdateAllPasswords: (newPassword: string) => Promise<void>;
}

const ProjectPasswordManager: React.FC<ProjectPasswordManagerProps> = ({
    lang,
    allUsers,
    onUpdateUserPassword,
    onUpdateAllPasswords
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [globalPassword, setGlobalPassword] = useState('');
    const [status, setStatus] = useState<{type: 'success' | 'error' | null, message: string}>({type: null, message: ''});
    const [isLoading, setIsLoading] = useState(false);

    const regularUsers = allUsers.filter(user => !user.isAdmin);

    const handleUpdateSinglePassword = async () => {
        if (!selectedUser || !newPassword.trim()) return;
        
        setIsLoading(true);
        try {
            await onUpdateUserPassword(selectedUser.email, newPassword);
            setStatus({type: 'success', message: t.passwordUpdatedSuccess});
            setNewPassword('');
            setIsModalOpen(false);
            setSelectedUser(null);
        } catch (error) {
            setStatus({type: 'error', message: t.passwordUpdateError});
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateAllPasswords = async () => {
        if (!globalPassword.trim()) return;
        
        setIsLoading(true);
        try {
            await onUpdateAllPasswords(globalPassword);
            setStatus({type: 'success', message: t.allPasswordsUpdatedSuccess});
            setGlobalPassword('');
        } catch (error) {
            setStatus({type: 'error', message: t.passwordUpdateError});
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewPassword('');
        setIsModalOpen(true);
        setStatus({type: null, message: ''});
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setNewPassword('');
        setStatus({type: null, message: ''});
    };

    return (
        <div className="space-y-6">
            {status.type && (
                <FormStatus 
                    type={status.type} 
                    message={status.message} 
                    onDismiss={() => setStatus({type: null, message: ''})}
                />
            )}

            {/* Global Password Section */}
            <FormSection title={t.setGlobalPassword}>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t.setGlobalPasswordDescription}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="password"
                            value={globalPassword}
                            onChange={(e) => setGlobalPassword(e.target.value)}
                            placeholder={t.globalPasswordPlaceholder}
                            className="w-full"
                        />
                    </div>
                    <Button
                        onClick={handleUpdateAllPasswords}
                        disabled={!globalPassword.trim() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                    >
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                        ) : (
                            <i className="fas fa-key mr-2"></i>
                        )}
                        {t.updateAllPasswords}
                    </Button>
                </div>
            </FormSection>

            {/* Individual Project Passwords */}
            <FormSection title={t.manageProjectPasswords}>
                <div className="space-y-4">
                    {regularUsers.map((user, index) => (
                        <div 
                            key={user.email} 
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {user.projectName}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {user.email}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500">
                                    {t.currentPassword}: {user.password || '***'}
                                </p>
                            </div>
                            <Button
                                onClick={() => openEditModal(user)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                            >
                                <i className="fas fa-edit mr-2"></i>
                                {t.updatePassword}
                            </Button>
                        </div>
                    ))}
                    
                    {regularUsers.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <i className="fas fa-users text-4xl mb-4"></i>
                            <p>No project users found.</p>
                        </div>
                    )}
                </div>
            </FormSection>

            {/* Edit Password Modal */}
            {isModalOpen && selectedUser && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={closeModal}
                    title={`${t.updatePassword} - ${selectedUser.projectName}`}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.currentPassword}
                            </label>
                            <Input
                                type="text"
                                value={selectedUser.password}
                                disabled
                                className="w-full bg-gray-100 dark:bg-gray-600"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.newPassword}
                            </label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full"
                            />
                        </div>

                        {status.type && (
                            <FormStatus 
                                type={status.type} 
                                message={status.message} 
                                onDismiss={() => setStatus({type: null, message: ''})}
                            />
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                onClick={closeModal}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                            >
                                {t.cancel}
                            </Button>
                            <Button
                                onClick={handleUpdateSinglePassword}
                                disabled={!newPassword.trim() || isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                            >
                                {isLoading ? (
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                ) : (
                                    <i className="fas fa-save mr-2"></i>
                                )}
                                {t.updatePassword}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProjectPasswordManager;