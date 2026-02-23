/**
 * Supabase Services Index
 * Central export point for all Supabase client-side services
 * Reusable across web and mobile applications
 */

// Auth services
export {
  signUp,
  signIn,
  signInWithOAuth,
  signOut,
  getUser,
  getSession,
  resetPassword,
  updatePassword,
  updateEmail,
  updateProfile,
  onAuthStateChange,
  verifyOtp,
  resendOtp,
} from "./auth";

// Storage services
export {
  uploadFile,
  uploadImage,
  getPublicUrl,
  getSignedUrl,
  deleteFile,
  listFiles,
  moveFile,
  copyFile,
  downloadFile,
} from "./storage";
