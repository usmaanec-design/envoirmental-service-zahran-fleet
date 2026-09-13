// Foremen Excel Import Template and Debugging Guide
// 
// Expected Excel Column Headers (must match exactly):
// 
// English Headers:
// - "Foreman Name" (required)
// - "Foreman's Iqama" (optional)
// - "Foreman's Employee ID" (optional)
// - "Supervisor" or "Assigned Supervisor" (optional, defaults to "Default Supervisor")
//
// Arabic Headers:
// - "اسم المراقب" (required)
// - "إقامة المراقب" (optional)
// - "معرف الموظف للمراقب" (optional)
// - Supervisor name column in Arabic
//
// Sample Excel Content:
// Row 1 (Headers): Foreman Name | Foreman's Iqama | Foreman's Employee ID | Supervisor
// Row 2 (Data):    Ahmed Ali    | 1234567890      | EMP001               | John Smith
// Row 3 (Data):    Mohammed     | 9876543210      | EMP002               | John Smith
//
// Debugging Steps:
// 1. Check browser console for debug messages starting with "🔍 FOREMEN DEBUG"
// 2. Ensure Excel file has proper headers
// 3. Ensure at least "Foreman Name" column has valid data
// 4. Check if validation is passing (name must not be empty)
// 5. Check Firebase logs for any errors

export const FOREMEN_IMPORT_TEMPLATE = {
  englishHeaders: [
    "Foreman Name",
    "Foreman's Iqama", 
    "Foreman's Employee ID",
    "Supervisor"
  ],
  arabicHeaders: [
    "اسم المراقب",
    "إقامة المراقب",
    "معرف الموظف للمراقب",
    "المشرف"
  ],
  sampleData: [
    {
      "Foreman Name": "Ahmed Ali",
      "Foreman's Iqama": "1234567890",
      "Foreman's Employee ID": "EMP001",
      "Supervisor": "John Smith"
    },
    {
      "Foreman Name": "Mohammed Hassan",
      "Foreman's Iqama": "9876543210", 
      "Foreman's Employee ID": "EMP002",
      "Supervisor": "John Smith"
    },
    {
      "Foreman Name": "Ali Ahmad",
      "Foreman's Iqama": "5555666777",
      "Foreman's Employee ID": "EMP003", 
      "Supervisor": "David Wilson"
    }
  ]
};