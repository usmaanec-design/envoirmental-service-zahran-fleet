import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import * as fb from '../firebase/service';

interface DynamicJsonLoaderProps {
    lang: 'en' | 'ar';
    currentUser: any;
    onStructureUpdate: (newStructure: any) => void;
}

interface DynamicField {
    key: string;
    label: string;
    type: 'string' | 'number' | 'array' | 'object';
    value?: any;
    children?: DynamicField[];
}

const DynamicJsonLoader: React.FC<DynamicJsonLoaderProps> = ({ 
    lang, 
    currentUser, 
    onStructureUpdate 
}) => {
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [jsonData, setJsonData] = useState<any>(null);
    const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parse JSON structure to create dynamic fields
    const parseJsonStructure = useCallback((data: any, parentKey = ''): DynamicField[] => {
        const fields: DynamicField[] = [];
        
        for (const [key, value] of Object.entries(data)) {
            const fieldKey = parentKey ? `${parentKey}.${key}` : key;
            
            if (Array.isArray(value) && value.length > 0) {
                // Handle arrays
                const field: DynamicField = {
                    key: fieldKey,
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    type: 'array',
                    value: value,
                    children: typeof value[0] === 'object' ? parseJsonStructure(value[0], fieldKey) : []
                };
                fields.push(field);
            } else if (typeof value === 'object' && value !== null) {
                // Handle objects
                const field: DynamicField = {
                    key: fieldKey,
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    type: 'object',
                    value: value,
                    children: parseJsonStructure(value, fieldKey)
                };
                fields.push(field);
            } else {
                // Handle primitive types
                const field: DynamicField = {
                    key: fieldKey,
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    type: typeof value === 'number' ? 'number' : 'string',
                    value: value
                };
                fields.push(field);
            }
        }
        
        return fields;
    }, []);

    // Handle file upload
    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setJsonFile(file);
        setError(null);
        setIsLoading(true);

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            
            setJsonData(parsed);
            const fields = parseJsonStructure(parsed);
            setDynamicFields(fields);
            
            // Initialize form data with parsed structure
            setFormData(parsed);
            
            // Notify parent component about structure update
            onStructureUpdate(parsed);
            
        } catch (err) {
            setError('Invalid JSON file. Please check the format.');
            console.error('JSON parsing error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [parseJsonStructure, onStructureUpdate]);

    // Save new data based on current structure
    const handleSaveData = useCallback(async () => {
        if (!formData || !currentUser) return;

        setIsLoading(true);
        setError(null);

        try {
            const userEmail = currentUser.email;
            
            // Save the new structure to Firebase
            await fb.updateProjectStructure(userEmail, formData);
            
            alert('✅ Data saved successfully with new structure!');
            setIsModalOpen(false);
            
        } catch (err) {
            setError('Failed to save data. Please try again.');
            console.error('Save error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [formData, currentUser]);

    // Render dynamic form fields
    const renderDynamicField = useCallback((field: DynamicField, depth = 0): React.JSX.Element => {
        const indentClass = `ml-${depth * 4}`;
        
        switch (field.type) {
            case 'string':
                return (
                    <div key={field.key} className={`mb-3 ${indentClass}`}>
                        <Input
                            label={field.label}
                            name={field.key}
                            value={getNestedValue(formData, field.key) || ''}
                            onChange={(e) => updateNestedValue(field.key, e.target.value)}
                        />
                    </div>
                );
            
            case 'number':
                return (
                    <div key={field.key} className={`mb-3 ${indentClass}`}>
                        <Input
                            label={field.label}
                            name={field.key}
                            type="number"
                            value={getNestedValue(formData, field.key) || 0}
                            onChange={(e) => updateNestedValue(field.key, Number(e.target.value))}
                        />
                    </div>
                );
            
            case 'array':
                return (
                    <div key={field.key} className={`mb-4 ${indentClass}`}>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {field.label} ({getNestedValue(formData, field.key)?.length || 0} items)
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                            {field.children && field.children.map(child => 
                                renderDynamicField(child, depth + 1)
                            )}
                        </div>
                    </div>
                );
            
            case 'object':
                return (
                    <div key={field.key} className={`mb-4 ${indentClass}`}>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {field.label}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                            {field.children && field.children.map(child => 
                                renderDynamicField(child, depth + 1)
                            )}
                        </div>
                    </div>
                );
            
            default:
                return <div key={field.key}></div>;
        }
    }, [formData]);

    // Helper functions for nested object manipulation
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const updateNestedValue = (path: string, value: any) => {
        const newData = { ...formData };
        const keys = path.split('.');
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        setFormData(newData);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                🔧 Dynamic JSON Structure Loader
            </h2>

            {error && (
                <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload New JSON Structure
                </label>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
            </div>

            {isLoading && (
                <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Processing JSON structure...</p>
                </div>
            )}

            {jsonData && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            Current Structure Preview
                        </h3>
                        <Button 
                            variant="primary" 
                            onClick={() => setIsModalOpen(true)}
                            className="!px-4 !py-2"
                        >
                            📝 Edit Data
                        </Button>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                        <pre className="text-sm overflow-x-auto">
                            {JSON.stringify(jsonData, null, 2)}
                        </pre>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>📊 Structure Analysis:</strong></p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            {dynamicFields.map(field => (
                                <li key={field.key}>
                                    <span className="font-medium">{field.label}</span> 
                                    <span className="text-gray-500"> ({field.type})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Dynamic Form Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title="🔧 Edit Dynamic Data Structure"
            >
                <div className="max-h-96 overflow-y-auto p-4">
                    {dynamicFields.map(field => renderDynamicField(field))}
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleSaveData}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : '💾 Save New Structure'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DynamicJsonLoader;