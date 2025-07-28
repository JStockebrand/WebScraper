// Dynamic URL generation for different environments
// Based on Supabase redirect URL documentation

export const getBaseURL = (): string => {
  // In production (Replit deployment)
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_SITE_URL || window.location.origin;
  }
  
  // In development
  return 'http://localhost:5000';
};

export const getAuthRedirectURL = (): string => {
  const baseURL = getBaseURL();
  return `${baseURL}/auth`;
};

export const getPasswordResetURL = (): string => {
  const baseURL = getBaseURL();
  return `${baseURL}/auth?type=recovery`;
};

export const getEmailConfirmURL = (): string => {
  const baseURL = getBaseURL();
  return `${baseURL}/auth?type=signup`;
};

// Parse URL parameters for authentication tokens and errors
export const parseAuthParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  
  // Check both URL params and hash fragments for tokens
  const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
  const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
  const type = urlParams.get('type') || hashParams.get('type');
  
  // Error handling
  const error = urlParams.get('error') || hashParams.get('error');
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
  const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
  
  return {
    accessToken,
    refreshToken,
    tokenHash,
    type,
    error,
    errorCode,
    errorDescription
  };
};

// Clean URL parameters after processing
export const cleanAuthParams = () => {
  // Remove query parameters
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, document.title, url.pathname);
};