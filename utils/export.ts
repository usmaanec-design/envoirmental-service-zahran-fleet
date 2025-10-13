import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
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
    
    // Header mapping for Arabic to English with normalized keys
    const headerMapping: { [key: string]: string } = {
      // Vehicle headers
      'رقم الباب': 'Door Number',
      'رقم اللوحة': 'Plate Number',
      'رقم الهيكل': 'Chassis Number',
      'الماركة': 'Make / Model',
      'المصنع': 'Manufacturer',
      'الموديل': 'Model',
      'سنة الصنع': 'Year',
      'تاريخ الشراء': 'Purchase Date',
      'الوزن الفارغ': 'Tare Weight',
      'نوع الخدمة': 'Service Type',
      'موقع المشروع': 'Project Site',
      'الحالة': 'Status',
      
      // Driver headers - Arabic
      'اسم السائق': "Driver Name",
      'الجنسية': 'Nationality',
      'رقم الإقامة': "Driver's Iqama Number",
      'الإقامة': "Driver's Iqama Number",
      'رقم الجوال': "Driver's Mobile Number",
      'الجوال': "Driver's Mobile Number",
      'اسم': "Driver Name",
      'رقم الاقامة': "Driver's Iqama Number",
      'رقم الهوية': "Driver's Iqama Number",
      'رقم جوال': "Driver's Mobile Number",
      'الجنسيه': 'Nationality',
      'رقم باب السيارة المعينة': 'Assigned Vehicle Door Number',
      
      // Common variations - English
      'Driver Name': 'Driver Name',
      'Driver\'s Name': 'Driver Name',
      'Name': 'Driver Name',
      'Nationality': 'Nationality',
      'Iqama Number': "Driver's Iqama Number",
      'Iqama': "Driver's Iqama Number",
      'Driver\'s Iqama': "Driver's Iqama Number",
      'Mobile Number': "Driver's Mobile Number",
      'Mobile': "Driver's Mobile Number",
      'Phone': "Driver's Mobile Number",
      'Contact': "Driver's Mobile Number",
      'Assigned Vehicle': 'Assigned Vehicle Door Number',
      
      // Vehicle variations
      'Door #': 'Door Number',
      'Plate #': 'Plate Number',
      'Chassis #': 'Chassis Number',
      'Project Site / Area': 'Project Site',
      'Tare Weight (KG)': 'Tare Weight'
    };
    
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error("File could not be read.");
        }
        
        // Read with proper options for encoding
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get the raw JSON data with header row
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          dateNF: 'yyyy-mm-dd',
          defval: '' // Default value for empty cells
        });
        
        console.log('Raw data from Excel:', rawJson);
        
        // Map headers (both Arabic and English variations) to standard English
        const processedJson = rawJson.map(row => {
          const newRow: any = {};
          Object.entries(row).forEach(([key, value]) => {
            // Normalize the key by trimming and converting to string
            const normalizedKey = String(key).trim();
            // Convert the header to standard English format
            const standardKey = headerMapping[normalizedKey] || normalizedKey;
            // Clean and normalize the value
            const cleanedValue = value !== null && value !== undefined ? String(value).trim() : '';
            
            // Map Arabic fields to their corresponding English fields
            if (normalizedKey === 'الإقامة') {
              newRow["Driver's Iqama Number"] = cleanedValue;
            } else if (normalizedKey === 'الجوال') {
              newRow["Driver's Mobile Number"] = cleanedValue;
            } else {
              newRow[standardKey] = cleanedValue;
            }
          });
          
          // Additional processing for phone numbers
          if (newRow["Driver's Mobile Number"]) {
            newRow["Driver's Mobile Number"] = newRow["Driver's Mobile Number"]
              .replace(/\D/g, '') // Remove non-digits
              .slice(-9); // Take last 9 digits
          }
          
          console.log('Processed row:', newRow);
          return newRow;
        });
        
        // Process the data one more time to ensure proper field mapping
        const finalProcessedJson = processedJson
          // Filter out empty rows first
          .filter(row => {
            const hasContent = Object.values(row).some(value => 
              value !== undefined && value !== null && String(value).trim() !== ''
            );
            if (!hasContent) {
              console.log('Filtering out empty row:', row);
            }
            return hasContent;
          })
          .map(row => {
            // Create a new object with the correct field names
            const processedRow = {
              "Driver Name": row["Driver Name"] || '',
              "Nationality": row["Nationality"] || '',
              "Driver's Iqama Number": row["Driver's Iqama Number"] || row["Iqama"] || '',
              "Driver's Mobile Number": row["Driver's Mobile Number"] || row["Mobile"] || '',
            };
            
            // Log each row for debugging
            console.log('Processing row:', row);
            console.log('Processed into:', processedRow);
            
            return processedRow;
          });

        // Final validation to ensure we have data
        if (finalProcessedJson.length === 0) {
          throw new Error("No data found in the Excel file.");
        }
        
        // Log the final processed data
        console.log('Final processed data:', finalProcessedJson);
        
        resolve(processedJson as T[]);
      } catch (e) {
        console.error("Error parsing Excel file:", e);
        reject(e);
      }
    };

    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error);
    };

    // Read as array buffer for better encoding support
    reader.readAsArrayBuffer(file);
  });
};