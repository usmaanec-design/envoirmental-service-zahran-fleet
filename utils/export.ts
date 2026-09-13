import * as XLSX from 'xlsx';
import { TRANSLATIONS, ARABIC_SERVICE_TYPES_FOR_EXPORT } from '../constants';

export const exportToExcel = (data: any[], fileName: string) => {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  const isVehicleExport = 
    headers.includes(TRANSLATIONS.en.thServiceType) ||
    headers.includes(TRANSLATIONS.ar.thServiceType);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Append the main data sheet FIRST.
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  // Special handling for vehicle exports to add the dropdown list.
  if (isVehicleExport) {
    // 1. Create a dedicated sheet for the service type options.
    const listSheetName = 'ServiceTypesList';
    // Format for aoa_to_sheet: array of arrays.
    const serviceTypesForSheet = ARABIC_SERVICE_TYPES_FOR_EXPORT.map(item => [item]); 
    const listSheet = XLSX.utils.aoa_to_sheet(serviceTypesForSheet);
    
    // Append the list sheet to the workbook. It will appear as the second tab.
    XLSX.utils.book_append_sheet(workbook, listSheet, listSheetName);

    // 2. Find the column index for 'Service Type'.
    const serviceTypeHeaderEN = TRANSLATIONS.en.thServiceType;
    const serviceTypeHeaderAR = TRANSLATIONS.ar.thServiceType;
    const serviceTypeColIndex = headers.findIndex(h => h === serviceTypeHeaderEN || h === serviceTypeHeaderAR);

    if (serviceTypeColIndex !== -1) {
      // 3. Define the data validation rule.
      const serviceTypeColLetter = XLSX.utils.encode_col(serviceTypeColIndex);
      // The formula refers to the range in our dedicated list sheet.
      const formula = `='${listSheetName}'!$A$1:$A$${ARABIC_SERVICE_TYPES_FOR_EXPORT.length}`;
      
      // Initialize the validations array if it doesn't exist.
      if (!worksheet['!validations']) {
        worksheet['!validations'] = [];
      }
      
      // Apply validation to a large number of rows (from row 2 down to 10001).
      // This covers the header in row 1 and allows users to add many new entries.
      const validationRange = `${serviceTypeColLetter}2:${serviceTypeColLetter}10001`; 

      worksheet['!validations'].push({
         sqref: validationRange,
         type: 'list',
         formula1: formula,
         showDropDown: true,
         allowBlank: true, // Allow empty cells
         errorStyle: 'stop', // CRITICAL: This prevents users from entering invalid data.
         errorTitle: 'Invalid Entry', // User-friendly title for the error message
         error: 'Please select a service type from the list.', // The error message
      });
    }
  }

  XLSX.writeFile(workbook, fileName);
};

/**
 * Reads an Excel file and converts the first sheet to an array of JSON objects.
 * @param file The Excel file to read.
 * @returns A promise that resolves with an array of objects.
 */
export const readExcelFile = <T extends {}>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error("File could not be read.");
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(json);
      } catch (e) {
        console.error("Error parsing Excel file:", e);
        reject(e);
      }
    };

    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error)
    };

    reader.readAsBinaryString(file);
  });
};