// Helper function to get current user email from localStorage
export const getCurrentUserEmail = (): string | null => {
  try {
    const currentUser = localStorage.getItem('zahran_current_user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      return user.email; // Use email as user ID for project documents
    }
    return null;
  } catch (error) {
    console.error('Error getting current user email:', error);
    return null;
  }
};