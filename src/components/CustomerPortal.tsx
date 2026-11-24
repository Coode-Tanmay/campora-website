import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  User,
  Package,
  FileText,
  CreditCard,
  Gift,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  QrCode,
  ShieldCheck,
  Send,
  Eye,
  X,
  Copy,
  Check,
  FileCheck,
  Upload,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CamporaOrder, TimelineStep } from '../types';
import { api } from '../services/api';
import { ManualPaymentSection } from './ManualPaymentSection';
import { CustomerNotificationCenter } from './CustomerNotificationCenter';
import { UPI_ID } from './UpiPaymentCard';

const loadRazorpayCheckout = (): Promise<boolean> => new Promise((resolve) => {
  if ((window as any).Razorpay) { resolve(true); return; }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(Boolean((window as any).Razorpay));
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

interface CustomerPortalProps {
  onBackToHome: () => void;
  onNewOrder: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onBackToHome, onNewOrder }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'cart' | 'files' | 'payments' | 'profile' | 'referrals'>('orders');
  const [orders, setOrders] = useState<CamporaOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CamporaOrder | null>(null);
  const [showPaymentModalFor, setShowPaymentModalFor] = useState<CamporaOrder | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [startingPaymentFor, setStartingPaymentFor] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CamporaOrder[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; referralCode: string; referralUsage: number; referralLimit: number; successfulReferrals: number; ledger: any[] } | null>(null);
  const [cashToRedeem, setCashToRedeem] = useState('0');
  const [combinedCheckout, setCombinedCheckout] = useState<{ id: string; orderIds: string[]; subtotal: number; cashRedeemed: number; amountDue: number; paymentStatus: string } | null>(null);
  const [combinedUtr, setCombinedUtr] = useState('');
  const [combinedScreenshot, setCombinedScreenshot] = useState<File | null>(null);
  const [combinedSubmitting, setCombinedSubmitting] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [combinedQr, setCombinedQr] = useState('');


  useEffect(() => {
    if (!combinedCheckout || combinedCheckout.paymentStatus !== 'pending') { setCombinedQr(''); return; }
    const uri = `upi://pay?pa=${UPI_ID}&pn=CAMPORA&am=${combinedCheckout.amountDue}&cu=INR&tn=${encodeURIComponent(`CAMPORA Checkout ${combinedCheckout.id}`)}`;
    QRCode.toDataURL(uri, { width: 320, margin: 2, color: { dark: '#0B0B0B', light: '#FFFFFF' }, errorCorrectionLevel: 'H' })
      .then(setCombinedQr).catch(() => setCombinedQr(''));
  }, [combinedCheckout?.id, combinedCheckout?.amountDue, combinedCheckout?.paymentStatus]);

  const fetchCartAndWallet = async () => {
    try {
      const [cart, walletData] = await Promise.all([api.getCustomerCart(), api.getWallet()]);
      setCartItems(cart.items || []);
      setWallet(walletData);
    } catch (err) {
      console.error('Unable to refresh CAMPORA cart or wallet:', err);
    }
  };

  const handleRemoveCartItem = async (orderId: string) => {
    try {
      await api.removeCartItem(orderId);
      await fetchCartAndWallet();
    } catch (err: any) { window.alert(err.message || 'Could not remove this order from your cart.'); }
  };

  const handleStartCombinedCheckout = async () => {
    if (cartBusy) return;
    setCartBusy(true);
    try {
      const result = await api.createCombinedCheckout(Number(cashToRedeem || 0));
      setCombinedCheckout({ ...result.checkout, paymentStatus: 'pending' });
      setCartItems([]);
      await fetchCartAndWallet();
    } catch (err: any) { window.alert(err.message || 'Could not start combined checkout.'); }
    finally { setCartBusy(false); }
  };

  const handleSubmitCombinedProof = async () => {
    if (!combinedCheckout || !combinedScreenshot || combinedSubmitting) return;
    if (combinedScreenshot.size > 500 * 1024 || !['image/png','image/jpeg'].includes(combinedScreenshot.type)) {
      window.alert('Please select a PNG or JPG screenshot under 500 KB.');
      return;
    }
    setCombinedSubmitting(true);
    try {
      const screenshotUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the screenshot.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the screenshot.'));
        reader.readAsDataURL(combinedScreenshot);
      });
      const result = await api.submitCombinedPayment(combinedCheckout.id, { utrNumber: combinedUtr, screenshotUrl, screenshotName: combinedScreenshot.name });
      setCombinedCheckout({ ...combinedCheckout, paymentStatus: 'verification_pending' });
      window.alert(result.message);
      await fetchOrders(false);
    } catch (err: any) { window.alert(err.message || 'Could not submit combined payment proof.'); }
    finally { setCombinedSubmitting(false); }
  };

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const res = await api.getCustomerOrders();
      setOrders(res.orders || []);
    } catch (err: any) {
      if (showLoading) setError(err.message || 'Failed to load your orders.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCartAndWallet();
    setRazorpayEnabled(false); // CAMPORA uses direct UPI only to avoid gateway fees.
    // Keep customer order cards and deliverables in sync with admin verification
    // and upload actions without requiring a manual browser refresh.
    const refreshCustomerOrders = () => {
      if (document.visibilityState === 'visible') { void fetchOrders(false); void fetchCartAndWallet(); }
    };
    const interval = window.setInterval(refreshCustomerOrders, 10000);
    const handleFocus = () => { void fetchOrders(false); void fetchCartAndWallet(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCancelUnpaidOrder = async (order: CamporaOrder) => {
    if (['cancelled', 'completed', 'rejected'].includes(order.status)) return;
    const paymentMadeOrSubmitted = order.paymentStatus === 'paid'
      || order.paymentStatus === 'verification_pending'
      || Boolean(order.paymentDetails?.utrNumber || order.paymentDetails?.screenshotName);
    const message = paymentMadeOrSubmitted
      ? `Cancel order ${order.id}? If you have already paid, CAMPORA will verify the payment and arrange a refund to the original payment source (the same UPI/bank source used). Refunds are not instant and require manual verification and processing by CAMPORA. Your order will be cancelled and a refund request will be created.`
      : `Cancel order ${order.id}? This will cancel the entire order. No refund is due because no payment has been submitted.`;
    if (!window.confirm(message)) return;
    try {
      await api.cancelCustomerOrder(order.id);
      await fetchOrders();
      window.alert(paymentMadeOrSubmitted
        ? `Order ${order.id} has been cancelled. Your refund request is pending CAMPORA verification and processing to the original payment source.`
        : `Order ${order.id} has been cancelled.`);
    } catch (error: any) {
      window.alert(error.message || 'Could not cancel this order. Please contact CAMPORA support.');
    }
  };

  const handleStartRazorpayCheckout = async (order: CamporaOrder) => {
    if (startingPaymentFor) return;
    setStartingPaymentFor(order.id);
    try {
      const checkoutOrder = await api.createRazorpayOrder(order.id);
      const scriptReady = await loadRazorpayCheckout();
      if (!scriptReady || !(window as any).Razorpay) throw new Error('Secure checkout could not be loaded. Please try again.');
      const RazorpayCheckout = (window as any).Razorpay;
      const checkout = new RazorpayCheckout({
        key: checkoutOrder.keyId,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        name: 'CAMPORA',
        description: order.serviceName,
        order_id: checkoutOrder.orderId,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.whatsapp || '' },
        notes: { campora_order_id: order.id },
        theme: { color: '#F59E0B' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const result = await api.verifyRazorpayPayment(order.id, response);
            window.alert(result.message);
            await fetchOrders();
          } catch (error: any) {
            window.alert(error.message || 'We could not verify the payment yet. Your payment status will refresh when the gateway confirms it.');
            await fetchOrders();
          } finally {
            setStartingPaymentFor(null);
          }
        },
        modal: { ondismiss: () => { setStartingPaymentFor(null); fetchOrders(); } },
      });
      checkout.on('payment.failed', (response: any) => {
        setStartingPaymentFor(null);
        window.alert(response?.error?.description || 'Payment was not completed. You can retry from your order dashboard.');
        fetchOrders();
      });
      checkout.open();
    } catch (error: any) {
      setStartingPaymentFor(null);
      window.alert(error.message || 'Unable to start secure payment. Please try again.');
    }
  };

  const handleCopyReferral = (code: string) => {
    navigator.clipboard.writeText(`Use my CAMPORA referral code: ${code}`);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'verification_pending') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20"><CheckCircle2 className="w-3 h-3" /> Order Confirmed</span>;
    }
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3 animate-pulse" /> In Progress</span>;
      case 'verification_pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3" /> Verification Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Check className="w-3 h-3" /> Approved • Pay Now</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-700/50 text-zinc-400 border border-zinc-700"><X className="w-3 h-3" /> Cancelled</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="w-3 h-3" /> Needs Revision</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Clock className="w-3 h-3" /> Under Review</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid & Verified</span>;
      case 'verification_pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Payment proof under review</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Payment Issue</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Payment Pending</span>;
    }
  };

  // Extract all deliverables across customer's orders
  const allDeliverables = orders.filter((ord) => ord.paymentStatus === 'paid' && ord.status === 'completed').flatMap((ord) => (ord.deliverables || []).map((d) => ({ ...d, orderId: ord.id, serviceName: ord.serviceName })));

  return (
    <div id="customer-portal-container" className="min-h-screen bg-[#0A0A0C] text-zinc-100 pt-20 pb-16">
      
      {/* Top Breadcrumb & User Welcome Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121215] border border-amber-500/20 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl shadow-lg shadow-amber-500/10">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{user?.name || 'Student'}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Verified Student
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{user?.email}</span>
                {user?.college && <span>• {user.college}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CustomerNotificationCenter onOpenOrder={(orderId) => {
              setActiveTab('orders');
              const match = orders.find(order => order.id === orderId);
              if (match) setSelectedOrder(match);
            }} />
            <button
              id="btn-portal-new-order"
              onClick={onNewOrder}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold text-xs tracking-wide shadow-md shadow-amber-500/15 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> Place New Order
            </button>
            <button
              id="btn-portal-logout"
              onClick={logout}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 border-b border-zinc-800 scrollbar-none">
          <button
            id="tab-my-orders"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Package className="w-4 h-4" /> My Orders ({orders.length})
          </button>

          <button
            id="tab-my-cart"
            onClick={() => setActiveTab('cart')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'cart' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Cart ({cartItems.length})
          </button>

          <button
            id="tab-my-files"
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'files'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" /> My Deliverables & Files ({allDeliverables.length})
          </button>

          <button
            id="tab-payment-status"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Payment Status
          </button>

          <button
            id="tab-referrals"
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Gift className="w-4 h-4" /> Referrals & Credits
          </button>

          <button
            id="tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <User className="w-4 h-4" /> Profile Details
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= TABS: ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-zinc-400 text-sm">
                <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Loading your orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#121215] border border-zinc-800">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Orders Found</h3>
                <p className="text-xs text-zinc-400 mb-4 max-w-sm mx-auto">
                  You have not submitted any assignments or project orders yet. Place your first order with high-speed turnaround!
                </p>
                <button
                  onClick={onNewOrder}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs inline-flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Start Order Now
                </button>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  id={`order-card-${ord.id}`}
                  className="p-5 sm:p-6 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-amber-500/30 transition-all shadow-lg"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {ord.id}
                        </span>
                        <h2 className="text-base font-bold text-white">{ord.serviceName}</h2>
                        {ord.isPackage && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Internship Package
                          </span>
                        )}
                        {getStatusBadge(ord.status, ord.paymentStatus)}
                      </div>
                      <p className="text-xs text-zinc-400">
                        <span className="font-medium text-zinc-300">Topic:</span> {ord.topic}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Total Payable</div>
                        <div className="text-base font-bold text-amber-400">₹{ord.finalPrice || ord.total}</div>
                      </div>
                      {getPaymentBadge(ord.paymentStatus)}
                    </div>
                  </div>

                  {/* Progress is hidden until payment is verified. */}
                  {ord.paymentStatus === 'paid' ? <div className="my-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 font-medium">Order Progress</span>
                      <span className="text-amber-400 font-semibold">{ord.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                        style={{ width: `${ord.progressPercent}%` }}
                      />
                    </div>
                  </div> : <div className="my-4 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">Order tracking becomes available after payment verification.</div>}

                  {/* Order Specs & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>Pages/Slides: <strong className="text-zinc-200">{ord.pagesOrSlides}</strong></span>
                      <span>Delivery: <strong className="text-zinc-200">{ord.deadline}</strong></span>
                      {ord.hasCollegeTemplate && (
                        <span className="text-amber-400/90 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Official College Template
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {['pending', 'rejected'].includes(ord.paymentStatus) && (
                        <>
                          {razorpayEnabled && ord.paymentStatus !== 'verification_pending' && (ord.status === 'approved' || ord.status === 'payment_pending' || ord.quoteStatus === 'accepted') ? (
                            <button
                              id={`btn-razorpay-${ord.id}`}
                              disabled={startingPaymentFor === ord.id}
                              onClick={() => handleStartRazorpayCheckout(ord)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {startingPaymentFor === ord.id ? 'Opening checkout…' : ord.paymentGateway?.status === 'created' ? 'Resume Secure Checkout' : 'Pay Securely'}
                            </button>
                          ) : (
                            <button
                              id={`btn-pay-now-${ord.id}`}
                              onClick={() => setShowPaymentModalFor(ord)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-xs transition-colors flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              {ord.paymentStatus === 'verification_pending' ? 'Proof Submitted' : 'Pay by UPI'}
                            </button>
                          )}
                        </>
                      )}

                      {ord.paymentStatus === 'paid' && ord.status === 'completed' && (ord.deliverables || []).map((file) => file.downloadUrl && <a key={file.id} href={file.downloadUrl} download className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</a>)}
                      {!['cancelled', 'completed', 'rejected'].includes(ord.status) && (
                        <button onClick={() => handleCancelUnpaidOrder(ord)} className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10 text-xs font-medium">Cancel Order</button>
                      )}
                      {ord.refundStatus === 'requested' && (
                        <span className="px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-medium">Refund Requested</span>
                      )}
                      {ord.refundStatus === 'processing' && (
                        <span className="px-2 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 text-[11px] font-medium">Refund Processing</span>
                      )}
                      {ord.refundStatus === 'refunded' && (
                        <span className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-medium">Refunded</span>
                      )}
                      <button
                        id={`btn-view-order-${ord.id}`}
                        onClick={() => setSelectedOrder(ord)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details & Timeline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= TABS: CART & COMBINED CHECKOUT ================= */}
        {activeTab === 'cart' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#121215] border border-amber-500/20 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Your CAMPORA Cart</h2>
                  <p className="text-xs text-zinc-400 mt-1">Add multiple orders and pay once. Custom quote orders become payable when CAMPORA sets their final price.</p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">CAMPORA Cash</div>
                  <div className="text-xl font-bold text-amber-400">₹{(wallet?.balance || 0).toFixed(2)}</div>
                </div>
              </div>
              {combinedCheckout ? (
                <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white">Combined Checkout · {combinedCheckout.id}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${combinedCheckout.paymentStatus === 'verification_pending' ? 'bg-blue-500/10 text-blue-300' : 'bg-amber-500/10 text-amber-300'}`}>{combinedCheckout.paymentStatus.replace(/_/g,' ')}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Orders included: {combinedCheckout.orderIds.join(', ')}</p>
                  <div className="text-xs space-y-1 border-t border-zinc-800 pt-3">
                    <div className="flex justify-between"><span className="text-zinc-400">Order total</span><span>₹{combinedCheckout.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">CAMPORA Cash</span><span className="text-amber-300">−₹{combinedCheckout.cashRedeemed.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-white text-sm"><span>Pay by UPI</span><span>₹{combinedCheckout.amountDue.toFixed(2)}</span></div>
                  </div>
                  {combinedCheckout.paymentStatus === 'pending' ? (
                    <div className="space-y-3 border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-300">Scan this QR and pay ₹{combinedCheckout.amountDue.toFixed(2)} once for all orders in this checkout.</p>
                      <div className="flex flex-col items-center rounded-xl bg-white p-4 w-fit mx-auto">{combinedQr ? <img src={combinedQr} alt="Combined CAMPORA UPI payment QR" className="w-52 h-52" /> : <div className="w-52 h-52 bg-zinc-100" />}</div>
                      <div className="text-center text-[11px] text-zinc-400">UPI ID: <span className="font-mono text-white">{UPI_ID}</span></div>
                      <div><label className="block text-[11px] text-zinc-400 mb-1">UTR / Transaction ID (optional)</label><input value={combinedUtr} onChange={(e) => setCombinedUtr(e.target.value)} className="w-full rounded-lg bg-black border border-zinc-700 px-3 py-2 text-xs text-white" placeholder="Enter UTR number" /></div>
                      <div><label className="block text-[11px] text-zinc-400 mb-1">Payment screenshot (required, PNG/JPG, max 500 KB)</label><input type="file" accept="image/png,image/jpeg" onChange={(e) => setCombinedScreenshot(e.target.files?.[0] || null)} className="block w-full text-xs text-zinc-300" /></div>
                      <button onClick={handleSubmitCombinedProof} disabled={!combinedScreenshot || combinedSubmitting} className="px-4 py-2.5 rounded-lg bg-amber-500 disabled:opacity-50 text-black text-xs font-bold">{combinedSubmitting ? 'Submitting…' : 'Submit Combined Payment Proof'}</button>
                    </div>
                  ) : <p className="text-xs text-blue-300">Payment proof submitted. Admin will verify the full combined payment manually. Your orders remain individually trackable.</p>}
                </div>
              ) : cartItems.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-zinc-800 rounded-xl">
                  <ShoppingBag className="w-9 h-9 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">Your cart is empty</p>
                  <p className="text-xs text-zinc-500 mt-1">Place a new order to add it here. You can add multiple orders before checkout.</p>
                  <button onClick={onNewOrder} className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold">Add an Order</button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cartItems.map((item) => {
                      const quoteWaiting = item.paymentStatus === 'awaiting_quote' || item.quoteStatus === 'pending' || item.status === 'requirements_review';
                      return <div key={item.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-[10px] text-amber-400">{item.id}</span><span className="text-xs font-bold text-white">{item.serviceName}</span></div>
                          <p className="text-[11px] text-zinc-400 mt-1">{item.topic} · {item.pagesOrSlides} pages/slides</p>
                          <p className="text-[11px] mt-1">{quoteWaiting ? <span className="text-amber-300">Waiting for admin quote — not payable yet</span> : <span className="text-emerald-300">Ready for checkout</span>}</p>
                        </div>
                        <div className="flex items-center gap-3"><span className="text-sm font-bold text-white">{quoteWaiting ? 'Quote pending' : `₹${Number(item.finalPrice ?? item.total).toFixed(2)}`}</span><button onClick={() => handleRemoveCartItem(item.id)} className="text-xs text-red-300 hover:text-red-200">Remove</button></div>
                      </div>;
                    })}
                  </div>
                  {(() => {
                    const ready = cartItems.filter((item) => item.paymentStatus !== 'awaiting_quote' && item.quoteStatus !== 'pending' && item.status !== 'requirements_review');
                    const total = ready.reduce((sum, item) => sum + Number(item.finalPrice ?? item.total), 0);
                    const hasCoupon = ready.some((item) => Boolean(item.couponCode || item.discount > 0));
                    const maxCash = Math.floor(Math.min(wallet?.balance || 0, total * 0.5) * 100) / 100;
                    return <div className="mt-5 p-4 rounded-xl bg-black/40 border border-zinc-800 space-y-3">
                      <div className="flex justify-between text-xs"><span className="text-zinc-400">Eligible orders total</span><span className="font-bold text-white">₹{total.toFixed(2)}</span></div>
                      {hasCoupon && <p className="text-[11px] text-amber-300">A coupon discount is already applied to one or more orders. CAMPORA Cash cannot be combined with coupon discounts.</p>}
                      <div className="border-t border-zinc-800 pt-3">
                        <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-white">Discount code</div><div className="text-[10px] text-zinc-500">Existing order discounts are included above</div></div><span className="text-xs text-zinc-400">{hasCoupon ? 'Applied' : 'None'}</span></div>
                        <div className="flex items-center justify-between gap-3 mt-3">
                          <div><div className="text-xs font-bold text-white flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-amber-400" /> Use CAMPORA Cash</div><div className="text-[10px] text-zinc-500">Balance ₹{(wallet?.balance || 0).toFixed(2)} · Max 50% (up to ₹{maxCash.toFixed(2)})</div></div>
                          <input aria-label="CAMPORA Cash to redeem" type="number" min="0" max={maxCash} step="0.01" disabled={hasCoupon || maxCash <= 0} value={hasCoupon ? '0' : cashToRedeem} onChange={(e) => setCashToRedeem(e.target.value)} className="w-28 rounded-lg bg-zinc-900 border border-zinc-700 px-2.5 py-2 text-xs text-white disabled:opacity-40" />
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-zinc-800 pt-3 text-sm font-bold"><span>Payable by UPI</span><span className="text-amber-300">₹{Math.max(0,total-(hasCoupon?0:Number(cashToRedeem||0))).toFixed(2)}</span></div>
                      <button onClick={handleStartCombinedCheckout} disabled={cartBusy || ready.length !== cartItems.length || ready.length === 0 || Number(cashToRedeem || 0) > maxCash || Number(cashToRedeem || 0) < 0} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold">{cartBusy ? 'Preparing checkout…' : ready.length !== cartItems.length ? 'Waiting for all custom quotes' : 'Proceed to Combined Checkout'}</button>
                      <p className="text-[10px] text-zinc-500">CAMPORA Cash is reserved only when the admin verifies the combined payment. It is never withdrawn at checkout creation.</p>
                    </div>;
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= TABS: FILES & DELIVERABLES ================= */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
              <h2 className="text-base font-bold text-white mb-2">Completed Academic Deliverables</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Download final presentations, formatted reports, and Turnitin similarity certificates uploaded by CAMPORA designers.
              </p>

              {allDeliverables.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500">
                  No deliverables uploaded yet. As soon as designers finalize your work, download links will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allDeliverables.map((del) => (
                    <div key={del.id} className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-xs">{del.title}</div>
                          <div className="text-[11px] text-zinc-400">
                            {del.orderId} • {del.fileType} • {del.fileSize}
                          </div>
                        </div>
                      </div>

                      <a
                        href={del.downloadUrl || '#'}
                        download
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TABS: PAYMENT STATUS ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Total Orders Paid</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {orders.filter((o) => o.paymentStatus === 'paid').length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Confirmed in SBI Records</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Awaiting Verification</div>
                <div className="text-2xl font-bold text-blue-400">
                  {orders.filter((o) => o.paymentStatus === 'verification_pending').length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Admin checking screenshot and optional UTR</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Pending Payment</div>
                <div className="text-2xl font-bold text-amber-400">
                  {orders.filter((o) => o.paymentStatus === 'pending').length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">UPI scan required</div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto">
              <h2 className="text-sm font-bold text-white mb-3">Order Payment Records</h2>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Service</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">UTR / Ref</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-zinc-900/50">
                      <td className="py-3 font-mono text-amber-400 font-bold">{ord.id}</td>
                      <td className="py-3 font-medium text-white">{ord.serviceName}</td>
                      <td className="py-3 font-bold text-zinc-100">₹{ord.finalPrice || ord.total}</td>
                      <td className="py-3 font-mono text-zinc-400">
                        {ord.paymentDetails?.utrNumber || '—'}
                      </td>
                      <td className="py-3">{getPaymentBadge(ord.paymentStatus)}</td>
                      <td className="py-3 text-right">
                        {['pending', 'rejected'].includes(ord.paymentStatus) && (
                          <div className="inline-flex gap-2">
                            {razorpayEnabled && ord.paymentStatus !== 'verification_pending' && (ord.status === 'approved' || ord.status === 'payment_pending' || ord.quoteStatus === 'accepted') ? (
                              <button onClick={() => handleStartRazorpayCheckout(ord)} disabled={startingPaymentFor === ord.id} className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/20">{ord.paymentGateway?.status === 'created' ? 'Resume Checkout' : 'Pay Securely'}</button>
                            ) : (
                              <button onClick={() => setShowPaymentModalFor(ord)} className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700">Manual UPI</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TABS: REFERRALS & CAMPORA CASH ================= */}
        {activeTab === 'referrals' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-amber-500/20 shadow-xl">
              <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center"><Gift className="w-6 h-6" /></div><div><h2 className="text-xl font-bold text-white">CAMPORA Cash & Referrals</h2><p className="text-xs text-zinc-400">Earn ₹100 when a referred new customer completes a paid order.</p></div></div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Your personal referral code</div><div className="text-lg font-mono font-bold text-amber-400">{wallet?.referralCode || 'Loading…'}</div><div className="text-[10px] text-zinc-500 mt-1">Uses: {wallet?.referralUsage || 0}/3</div></div><button onClick={() => handleCopyReferral(wallet?.referralCode || '')} disabled={!wallet?.referralCode} className="px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold">{copiedReferral ? 'Copied!' : 'Copy Code'}</button></div>
              <div className="grid grid-cols-2 gap-3 mt-4"><div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"><div className="text-xs text-zinc-400">CAMPORA Cash Balance</div><div className="text-2xl font-bold text-amber-400 mt-1">₹{(wallet?.balance || 0).toFixed(2)}</div></div><div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"><div className="text-xs text-zinc-400">Successful Referrals</div><div className="text-2xl font-bold text-white mt-1">{wallet?.successfulReferrals || 0}</div></div></div>
              <p className="text-[11px] text-zinc-500 mt-4">Each code can be used by up to 3 newly registered customers. Your ₹100 reward is credited only after their payment is verified and their order is completed. CAMPORA Cash does not expire, cannot be transferred or withdrawn, and can cover up to 50% of a future order. It cannot be combined with coupon discounts.</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800"><h3 className="text-sm font-bold text-white mb-3">Wallet History</h3>{!wallet?.ledger?.length ? <p className="text-xs text-zinc-500">No wallet transactions yet.</p> : <div className="space-y-2">{wallet.ledger.map((entry:any) => <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-zinc-800/70 pb-2 text-xs"><div><div className="text-zinc-200">{entry.description}</div><div className="text-[10px] text-zinc-500">{new Date(entry.created_at).toLocaleString()}</div></div><span className={`font-bold ${Number(entry.amount) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{Number(entry.amount) >= 0 ? '+' : ''}₹{Number(entry.amount).toFixed(2)}</span></div>)}</div>}</div>
          </div>
        )}

        {/* ================= TABS: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" /> Student Profile Details
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Full Name</label>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium">
                  {user?.name}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Registered Student Email</label>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium">
                  {user?.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">WhatsApp Number</label>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium">
                    {user?.whatsapp || '+91 75592 25529'}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">College / University</label>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium">
                    {user?.college || 'Vellore Institute of Technology'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Account Role</label>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Verified Customer Account
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121215] border border-amber-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {selectedOrder.id}
              </span>
              {getStatusBadge(selectedOrder.status, selectedOrder.paymentStatus)}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{selectedOrder.serviceName}</h2>
            <p className="text-xs text-zinc-400 mb-4">{selectedOrder.topic}</p>

            {/* Timeline is unlocked only after admin verifies payment. */}
            {selectedOrder.paymentStatus === 'paid' ? (
            <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Live Progress Timeline</h3>
              <div className="space-y-3">
                {selectedOrder.timeline?.map((step, idx) => (
                  <div key={step.id || idx} className="flex items-start gap-3 text-xs">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : step.status === 'current'
                        ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                        : 'bg-zinc-800 text-zinc-600'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span>{step.title}</span>
                        {step.timestamp && <span className="text-[10px] text-zinc-500 font-normal">{step.timestamp}</span>}
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">Live order tracking unlocks after CAMPORA manually verifies your payment. Your order has been safely received.</div>
            )}

            {/* Template & Specs */}
            {selectedOrder.hasCollegeTemplate && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300 flex items-center justify-between gap-2">
                <span><span className="font-bold text-amber-400">Official College Template:</span> {selectedOrder.collegeTemplateFile?.name || 'Attached Template'}</span>
                {selectedOrder.paymentStatus === 'paid' && selectedOrder.collegeTemplateFile?.downloadUrl && <a href={selectedOrder.collegeTemplateFile.downloadUrl} download className="underline">Download</a>}
              </div>
            )}

            {/* Rejection / Cancellation notices */}
            {selectedOrder.rejectionReason && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <span className="font-bold text-red-400">Admin Rejection Notice:</span> {selectedOrder.rejectionReason}
              </div>
            )}

            {selectedOrder.cancellationReason && (
              <div className="mb-4 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                <span className="font-bold text-zinc-200">Cancellation Reason:</span> {selectedOrder.cancellationReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual UPI Payment Modal */}
      {showPaymentModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#121215] border border-amber-500/30 rounded-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowPaymentModalFor(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <ManualPaymentSection
              order={showPaymentModalFor}
              onPaymentSubmitted={async (utr, screenshot, screenshotName) => {
                await api.submitPaymentProof(showPaymentModalFor.id, {
                  utrNumber: utr,
                  screenshotUrl: screenshot,
                  screenshotName,
                });
                setShowPaymentModalFor(null);
                fetchOrders();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
