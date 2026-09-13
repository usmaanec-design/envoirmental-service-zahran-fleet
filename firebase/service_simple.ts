// Simple working version without problematic clear function
console.log('Service file loaded successfully');
export const clearAllDatabaseData = async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  return { 
    success: false, 
    message: "Please clear data manually via Firebase Console: https://console.firebase.google.com/project/envormental-service-zahran/firestore/data", 
    deletedCount: 0 
  };
};