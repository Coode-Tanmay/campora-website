import React from 'react';
import { Sparkles, MessageCircle, ArrowRight, Clock, ShieldCheck, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenOrderModal: (serviceId?: string) => void;
  onOpenAuthModal: () => void;
  activeOrderCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenOrderModal,
  onOpenAuthModal,
  activeOrderCount,
}) => {
  const { user, isAdmin, isCustomer, logout } = useAuth();
  const whatsappNumber = '917559225529';
  const whatsappDefaultMsg = encodeURIComponent('Hi CAMPORA team, I need help with my college assignment/presentation. Can you provide a quote?');

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0B0B]/95 backdrop-blur-md border-b border-[#2A2A2A]">
      {/* Top micro-announcement banner */}
      <div className="bg-[#111111] border-b border-[#2A2A2A] py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[#858585]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#35C759] animate-pulse" />
            <span className="text-[#B8B8B8] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
              Support Active: 6 AM – 12 AM (18 Hours Daily)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[#858585]">
            <span className="flex items-center gap-1 text-[#B8B8B8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" /> 100% Confidential & Plagiarism Free
            </span>
            <span className="text-[#2A2A2A]">•</span>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappDefaultMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A72C] hover:text-[#E5B93F] hover:underline font-medium flex items-center gap-1 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> +91 75592 25529
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="brand-logo"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4A72C] to-[#8C6D18] p-[1px] shadow-sm shadow-[#D4A72C]/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#171717] rounded-[7px] flex items-center justify-center">
              <span className="font-extrabold text-base tracking-wider text-[#D4A72C]">C</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-white flex items-center gap-1">
              CAMPORA
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4A72C]" />
            </span>
            <span className="text-[10px] text-[#858585] tracking-wider font-semibold uppercase -mt-1">
              Turning Deadlines Into Done
            </span>
          </div>
        </div>

        {/* Public Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { id: 'home', label: 'Home' },
            { id: 'services', label: 'Services' },
            { id: 'build-website', label: 'Build Website' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'how-it-works', label: 'How It Works' },
            { id: 'portfolio', label: 'Portfolio' },
            { id: 'faq', label: 'FAQ' },
            { id: 'contact', label: 'Contact' },
          ].map((nav) => (
            <button
              key={nav.id}
              id={`nav-link-${nav.id}`}
              onClick={() => onSelectTab(nav.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentTab === nav.id
                  ? 'text-white bg-[#1D1D1D] border border-[#2A2A2A] shadow-inner'
                  : 'text-[#B8B8B8] hover:text-white hover:bg-[#171717]'
              }`}
            >
              {nav.label}
            </button>
          ))}

          {/* If Logged in as Customer */}
          {isCustomer && (
            <button
              id="nav-link-customer-portal"
              onClick={() => onSelectTab('customer-portal')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'customer-portal'
                  ? 'text-[#F0D27A] bg-[#D4A72C]/15 border border-[#D4A72C]/40'
                  : 'text-[#D4A72C] hover:bg-[#D4A72C]/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Account</span>
              {activeOrderCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#D4A72C] text-black">
                  {activeOrderCount}
                </span>
              )}
            </button>
          )}

          {/* If Logged in as Admin */}
          {isAdmin && (
            <button
              id="nav-link-admin-panel"
              onClick={() => onSelectTab('admin')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'text-[#F0D27A] bg-[#D4A72C]/20 border border-[#D4A72C]/50'
                  : 'text-[#D4A72C] hover:bg-[#D4A72C]/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}

          {/* Login Button (when not logged in) */}
          {!user && (
            <button
              id="nav-link-login"
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#D4A72C] hover:text-[#F0D27A] hover:bg-[#D4A72C]/10 border border-[#D4A72C]/30 transition-all flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WhatsApp Direct */}
          <a
            id="header-whatsapp-btn"
            href={`https://wa.me/${whatsappNumber}?text=${whatsappDefaultMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C] hover:text-[#F0D27A] transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#35C759]" />
            <span>WhatsApp</span>
          </a>

          {/* User Status / Mobile Login */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                id="btn-header-profile"
                onClick={() => onSelectTab(isAdmin ? 'admin' : 'customer-portal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171717] border border-[#2A2A2A] text-xs font-medium text-white hover:border-[#D4A72C]"
              >
                <div className="w-5 h-5 rounded-full bg-[#D4A72C]/20 text-[#D4A72C] flex items-center justify-center font-bold text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              </button>
              <button
                id="btn-header-logout"
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-full bg-[#171717] border border-[#2A2A2A] text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn-mobile"
              onClick={onOpenAuthModal}
              className="lg:hidden flex items-center gap-1 text-xs px-3 py-1.5 rounded-full text-[#D4A72C] bg-[#171717] border border-[#D4A72C]/30 font-semibold"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Order Now Gold Pill Button */}
          <button
            id="header-order-now-btn"
            onClick={() => onOpenOrderModal()}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] shadow-lg shadow-[#D4A72C]/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Order Now</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
};
