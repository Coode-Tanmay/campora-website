import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatsBar } from './components/StatsBar';
import { WhyUs } from './components/WhyUs';
import { CollegeTemplateFeature } from './components/CollegeTemplateFeature';
import { HowItWorks } from './components/HowItWorks';
import { ServicesSection } from './components/ServicesSection';
import { ReferralBanner } from './components/ReferralBanner';
import { PortfolioSection } from './components/PortfolioSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { OrderFormModal } from './components/OrderFormModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerPortal } from './components/CustomerPortal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CamporaOrder } from './types';
import { INITIAL_ORDERS } from './data/mockData';
import { api } from './services/api';
import { CheckCircle2, MessageCircle, Mail, Phone, Clock, MapPin } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, isCustomer } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [selectedServiceForOrder, setSelectedServiceForOrder] = useState<string | undefined>(undefined);
  const [orders, setOrders] = useState<CamporaOrder[]>(INITIAL_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(INITIAL_ORDERS[0]?.id || 'CMP-1024');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Handle URL path routing and protect customer/admin pages
  useEffect(() => {
    const handleLocationRoute = () => {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      const combined = `${path} ${hash}`;

      // Admin route handling
      if (combined.includes('/admin') || combined.includes('admin-panel')) {
        setCurrentTab('admin');
        return;
      }

      // Protected customer pages
      const isProtectedCustomerRoute = 
        combined.includes('/dashboard') ||
        combined.includes('/my-orders') ||
        combined.includes('/orders') ||
        combined.includes('/my-files') ||
        combined.includes('/files') ||
        combined.includes('/profile') ||
        combined.includes('/account') ||
        combined.includes('/customer-portal');

      if (isProtectedCustomerRoute) {
        if (isCustomer || isAdmin) {
          setCurrentTab('customer-portal');
        } else {
          // Unauthenticated visitor trying to access customer dashboard
          setCurrentTab('home');
          setIsAuthModalOpen(true);
        }
        return;
      }

      if (combined.includes('/services') || combined.includes('services')) {
        setCurrentTab('services');
      } else if (combined.includes('/pricing') || combined.includes('pricing')) {
        setCurrentTab('pricing');
      } else if (combined.includes('/how-it-works')) {
        setCurrentTab('how-it-works');
      } else if (combined.includes('/portfolio')) {
        setCurrentTab('portfolio');
      } else if (combined.includes('/faq')) {
        setCurrentTab('faq');
      } else if (combined.includes('/contact')) {
        setCurrentTab('contact');
      } else if (combined.includes('/tracking')) {
        setCurrentTab('tracking');
      }
    };

    handleLocationRoute();
    window.addEventListener('popstate', handleLocationRoute);
    window.addEventListener('hashchange', handleLocationRoute);
    return () => {
      window.removeEventListener('popstate', handleLocationRoute);
      window.removeEventListener('hashchange', handleLocationRoute);
    };
  }, [isCustomer, isAdmin]);

  // Sync orders from API when user logs in or on load
  const loadOrders = async () => {
    try {
      if (isAdmin) {
        const res = await api.getAdminOrders();
        if (res.orders) setOrders(res.orders);
      } else if (isCustomer) {
        const res = await api.getCustomerOrders();
        if (res.orders) setOrders(res.orders);
      }
    } catch {
      // Keep existing memory orders as fallback
    }
  };

  useEffect(() => {
    loadOrders();
  }, [isAdmin, isCustomer]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenOrderModal = (serviceId?: string) => {
    setSelectedServiceForOrder(serviceId);
    setIsOrderModalOpen(true);
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'login') {
      setIsAuthModalOpen(true);
      return;
    }

    if (tab === 'customer-portal' && !isCustomer && !isAdmin) {
      // Prompt customer authentication modal immediately
      setIsAuthModalOpen(true);
      return;
    }

    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCreated = async (newOrder: CamporaOrder) => {
    try {
      const res = await api.createOrder({
        ...newOrder,
        customerId: user?.id,
        customerEmail: user?.email || `${newOrder.customerName.toLowerCase().replace(/\s+/g, '')}@campora.in`,
      });
      setOrders([res.order || newOrder, ...orders]);
      setSelectedOrderId(newOrder.id);
    } catch {
      setOrders([newOrder, ...orders]);
      setSelectedOrderId(newOrder.id);
    }
    
    if (isCustomer) {
      setCurrentTab('customer-portal');
    } else {
      setCurrentTab('tracking');
    }
    showToast(`Order #${newOrder.id} logged successfully! Live tracking active.`);
  };

  const handleUpdateOrderStatus = (orderId: string, updates: Partial<CamporaOrder>) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, ...updates } : ord))
    );
    showToast(`Order #${orderId} updated!`);
  };

  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#171717] border border-[#D4A72C] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-[#35C759]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleNavigateTab}
        onOpenOrderModal={() => handleOpenOrderModal()}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeOrderCount={activeOrdersCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <>
            <Hero
              onExploreServices={() => setCurrentTab('services')}
              onOrderNow={() => handleOpenOrderModal()}
            />
            <StatsBar />
            <CollegeTemplateFeature onOrderWithTemplate={() => handleOpenOrderModal()} />
            <WhyUs />
            <ServicesSection
              onSelectService={(serviceId) => handleOpenOrderModal(serviceId)}
              onOpenCustomQuote={() => handleOpenOrderModal()}
            />
            <HowItWorks onStartOrder={() => handleOpenOrderModal()} />
            <ReferralBanner
              onApplyCode={(code) => {
                showToast(`Referral code ${code} copied!`);
              }}
            />
            <PortfolioSection
              onOrderSimilar={() => {
                setCurrentTab('services');
              }}
            />
            <FAQSection />
          </>
        )}

        {(currentTab === 'services' || currentTab === 'pricing') && (
          <div className="pt-4">
            <ServicesSection
              onSelectService={(serviceId) => handleOpenOrderModal(serviceId)}
              onOpenCustomQuote={() => handleOpenOrderModal()}
            />
            <CollegeTemplateFeature onOrderWithTemplate={() => handleOpenOrderModal()} />
            <ReferralBanner
              onApplyCode={(code) => {
                showToast(`Referral code ${code} copied!`);
              }}
            />
          </div>
        )}

        {currentTab === 'how-it-works' && (
          <div className="pt-4">
            <HowItWorks onStartOrder={() => handleOpenOrderModal()} />
            <CollegeTemplateFeature onOrderWithTemplate={() => handleOpenOrderModal()} />
            <WhyUs />
          </div>
        )}

        {currentTab === 'portfolio' && (
          <div className="pt-4">
            <PortfolioSection
              onOrderSimilar={() => handleOpenOrderModal()}
            />
          </div>
        )}

        {currentTab === 'faq' && (
          <div className="pt-4">
            <FAQSection />
          </div>
        )}

        {currentTab === 'contact' && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-[#D4A72C]/10 text-[#D4A72C] text-xs font-bold uppercase tracking-wider border border-[#D4A72C]/20">
                Direct Contact Desk
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Get in Touch with CAMPORA</h1>
              <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                Have a rush assignment, presentation emergency, or custom college project requirement? Reach our 6 AM – 12 AM support team immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <a
                href="https://wa.me/917559225529?text=Hi%20CAMPORA%20Team%2C%20I%20need%20help%20with%20my%20college%20project"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-2xl bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base">WhatsApp Support Desk</h3>
                <p className="text-xs text-zinc-400 mt-1">+91 75592 25529 (18 hrs daily: 6 AM – 12 AM)</p>
                <span className="inline-block mt-3 text-xs font-semibold text-[#D4A72C]">Chat with Us &rarr;</span>
              </a>

              <div className="p-6 rounded-2xl bg-[#171717] border border-[#2A2A2A]">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base">Official Email</h3>
                <p className="text-xs text-zinc-400 mt-1">support@campora.in / orders@campora.in</p>
                <span className="inline-block mt-3 text-xs text-zinc-500">Response within 30 minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer Portal (Protected Route) */}
        {currentTab === 'customer-portal' && (
          isCustomer ? (
            <CustomerPortal
              onBackToHome={() => setCurrentTab('home')}
              onNewOrder={() => handleOpenOrderModal()}
            />
          ) : (
            <div className="py-20 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Student Account Login Required</h2>
              <p className="text-xs text-zinc-400">Please sign in to view your orders, deliverables, and payment receipts.</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-[#D4A72C] hover:bg-[#E5B93F] text-black font-bold text-xs shadow-lg"
              >
                Sign In / Register
              </button>
            </div>
          )
        )}

        {/* Admin Desk (Protected Route) */}
        {currentTab === 'admin' && (
          isAdmin ? (
            <AdminDashboard
              onCloseAdmin={() => setCurrentTab('home')}
            />
          ) : (
            <AdminLogin
              onSuccess={() => {
                setCurrentTab('admin');
                loadOrders();
              }}
              onBackToHome={() => setCurrentTab('home')}
            />
          )
        )}

        {/* Public Tracker */}
        {currentTab === 'tracking' && (
          <OrderTrackingView
            orders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={(id) => setSelectedOrderId(id)}
            onOpenNewOrderModal={() => handleOpenOrderModal()}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onSelectTab={handleNavigateTab}
        onOpenOrderModal={() => handleOpenOrderModal()}
        onOpenAdmin={() => {
          setCurrentTab('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Floating WhatsApp Quick Action Button */}
      <WhatsAppFloatingButton />

      {/* Multi-Step Order Form Modal */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        initialServiceId={selectedServiceForOrder}
        onOrderCreated={handleOrderCreated}
      />

      {/* Customer Authentication Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onNavigateToAdmin={() => {
          setIsAuthModalOpen(false);
          setCurrentTab('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSuccess={() => {
          setCurrentTab('customer-portal');
          loadOrders();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
