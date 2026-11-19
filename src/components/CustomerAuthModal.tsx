import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, School, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Copy, Check, ExternalLink, HelpCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshSession } = useAuth();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Unconfigured OAuth helper modal state
  const [oauthSetupGuide, setOauthSetupGuide] = useState<{
    provider: 'google' | 'microsoft';
    title: string;
    redirectUri: string;
    consoleUrl: string;
    error: string;
  } | null>(null);

  // Listen for OAuth popup completion postMessage
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Only accept messages from this exact site origin. The session itself is an HttpOnly cookie.
      if (event.origin === window.location.origin && event.data && typeof event.data === 'object') {
        if (event.data.type === 'OAUTH_AUTH_SUCCESS') {
          const { user } = event.data;
          setOauthLoading(null);
          if (user) {
            void refreshSession();
            if (onSuccess) onSuccess();
            onClose();
          }
        } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
          setOauthLoading(null);
          setError(event.data.error || 'Authentication was cancelled or failed.');
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [onSuccess, onClose, refreshSession]);

  if (!isOpen) return null;

  const handleOfficialOAuth = async (provider: 'google' | 'microsoft') => {
    setError(null);
    setOauthLoading(provider);

    try {
      if (provider === 'google') {
        const res = await api.getGoogleAuthUrl();
        if (res.configured && res.url) {
          // Open official Google OAuth 2.0 popup
          const width = 520;
          const height = 650;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(
            res.url,
            'CAMPORA_Google_OAuth',
            `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,scrollbars=yes`
          );

          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            throw new Error('OAuth popup was blocked by browser. Please allow popups for this site.');
          }
        } else {
          // Not yet configured with GOOGLE_CLIENT_ID
          setOauthLoading(null);
          setOauthSetupGuide({
            provider: 'google',
            title: 'Google OAuth 2.0 Official Setup',
            redirectUri: res.redirectUri || `${window.location.origin}/auth/callback/google`,
            consoleUrl: 'https://console.cloud.google.com/apis/credentials',
            error: res.error || 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in server environment to initiate Google account chooser.',
          });
        }
      } else {
        const res = await api.getMicrosoftAuthUrl();
        if (res.configured && res.url) {
          const width = 520;
          const height = 650;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(
            res.url,
            'CAMPORA_Microsoft_OAuth',
            `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes`
          );

          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            throw new Error('OAuth popup was blocked by browser. Please allow popups for this site.');
          }
        } else {
          setOauthLoading(null);
          setOauthSetupGuide({
            provider: 'microsoft',
            title: 'Microsoft OAuth 2.0 Official Setup',
            redirectUri: res.redirectUri || `${window.location.origin}/auth/callback/microsoft`,
            consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
            error: res.error || 'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are required in server environment.',
          });
        }
      }
    } catch (err: any) {
      setOauthLoading(null);
      setError(err.message || 'Failed to initiate OAuth flow.');
    }
  };

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  return (
    <div id="customer-auth-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div id="customer-auth-card" className="bg-[#121214] border border-[#D4A72C]/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Top gold accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4A72C] via-[#F3CE5E] to-[#B8871B]" />
        
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A72C]/10 border border-[#D4A72C]/25 text-[#D4A72C] text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> CAMPORA
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome to CAMPORA
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Sign in to manage your orders, payments and completed work.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="space-y-2.5 mb-5">
            <button
              id="btn-oauth-google"
              type="button"
              disabled={oauthLoading !== null}
              onClick={() => handleOfficialOAuth('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#242429] border border-zinc-700/70 hover:border-[#D4A72C]/60 text-zinc-100 font-medium text-xs sm:text-sm transition-all shadow-md group disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z"/>
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              id="btn-oauth-microsoft"
              type="button"
              disabled={oauthLoading !== null}
              onClick={() => handleOfficialOAuth('microsoft')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#1A1A1D] hover:bg-[#242429] border border-zinc-700/70 hover:border-zinc-500 text-zinc-100 font-medium text-xs sm:text-sm transition-all shadow-md group disabled:opacity-50"
            >
              {oauthLoading === 'microsoft' ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                  <path fill="#7fba00" d="M13 1h10v10H13z"/>
                  <path fill="#ffb900" d="M13 13h10v10H13z"/>
                </svg>
              )}
              <span>Continue with Microsoft</span>
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-[#1A1A1D] p-3.5 text-xs text-zinc-400 leading-relaxed">
            Sign in with your Google or Microsoft account. CAMPORA uses the email returned by the identity provider to create your customer account. Email/password registration is not enabled until email verification and account recovery are configured.
          </div>

        </div>
      </div>

      {/* OAuth Setup Guide Modal (Displays when Client ID is missing) */}
      {oauthSetupGuide && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141417] border border-[#D4A72C]/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-7 relative">
            <button
              onClick={() => setOauthSetupGuide(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{oauthSetupGuide.title}</h3>
                <p className="text-xs text-zinc-400">Production OAuth 2.0 Credentials Guide</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              CAMPORA is configured to route authentications through Google's official hosted account chooser. To connect your Google Cloud Project, add the credentials below to your server environment:
            </p>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold mb-1 flex items-center justify-between">
                  <span>Authorized Redirect URI</span>
                  <button
                    onClick={() => handleCopyUri(oauthSetupGuide.redirectUri)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                  >
                    {copiedUri ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUri ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-xs text-amber-300 break-all select-all bg-black/40 p-2 rounded-lg">
                  {oauthSetupGuide.redirectUri}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div className="font-semibold text-zinc-200">Required Environment Keys:</div>
                <div className="font-mono text-[11px] text-zinc-400">
                  • <span className="text-amber-400">{oauthSetupGuide.provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'MICROSOFT_CLIENT_ID'}</span><br />
                  • <span className="text-amber-400">{oauthSetupGuide.provider === 'google' ? 'GOOGLE_CLIENT_SECRET' : 'MICROSOFT_CLIENT_SECRET'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={oauthSetupGuide.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>Open {oauthSetupGuide.provider === 'google' ? 'Google Cloud Console' : 'Azure Portal'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
