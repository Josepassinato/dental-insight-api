/**
 * Utility to clean up authentication state and prevent limbo states
 */

export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth state cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up auth state:', error);
  }
};

export const forceAuthRefresh = async (supabase: any) => {
  try {
    // First clean up any existing state
    cleanupAuthState();
    
    // Attempt global sign out (ignore errors)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.log('Global signout failed, continuing...');
    }
    
    // Get fresh session
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error refreshing auth:', error);
    return null;
  }
};