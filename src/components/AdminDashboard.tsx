import React, { useState, useEffect } from 'react';
import { CamporaOrder, OrderStatus, PaymentStatus, DeliverableFile, TimelineStep } from '../types';
import {
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageCircle,
  FileText,
  DollarSign,
  Send,
  Upload,
  User,
  Phone,
  Building,
  AlertTriangle,
  FileUp,
  Layers,
  Edit3,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Tag,
  CreditCard,
  FileImage,
  Copy,
  XCircle,
  AlertCircle,
  LogOut,
  Ban,
  RotateCcw,
  Users,
  FolderOpen,
  Eye,
  X,
  FileCheck,
  Download,
  Gift,
} from 'lucide-react';
import { UPI_ID } from './UpiPaymentCard';
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const getDeadlineDurationMs = (deadline: string): number => {
  if (/1\s*[-–]\s*3\s*hours?/i.test(deadline) || /1\s*[-–]\s*3\s*hrs?/i.test(deadline)) return 3 * 60 * 60 * 1000;
  if (/12\s*[-–]\s*24/i.test(deadline)) return 24 * 60 * 60 * 1000;
  if (/24\s*[-–]\s*48/i.test(deadline)) return 48 * 60 * 60 * 1000;
  if (/3\s*\+\s*days?/i.test(deadline)) return 72 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
};

const UrgentDeadlineCountdown: React.FC<{ order: CamporaOrder }> = ({ order }) => {
  const [remainingMs, setRemainingMs] = useState(() => {
    const createdAt = new Date(order.createdAt).getTime();
    return Number.isFinite(createdAt) ? Math.max(0, createdAt + getDeadlineDurationMs(order.deadline) - Date.now()) : 0;
  });

  useEffect(() => {
    const update = () => {
      const createdAt = new Date(order.createdAt).getTime();
      const deadlineAt = createdAt + getDeadlineDurationMs(order.deadline);
      setRemainingMs(Number.isFinite(deadlineAt) ? Math.max(0, deadlineAt - Date.now()) : 0);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [order.createdAt, order.deadline]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const format = (value: number) => String(value).padStart(2, '0');

  return (
    <span className="inline-flex items-center gap-1.5 mt-2 ml-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-bold tabular-nums">
      <Clock className="w-3 h-3" />
      {remainingMs > 0 ? `Time left ${format(hours)}:${format(minutes)}:${format(seconds)}` : 'Deadline reached'}
    </span>
  );
};

const hasSubmittedPaymentScreenshot = (order: CamporaOrder): boolean =>
  Boolean(order.paymentDetails?.screenshotUrl || order.paymentDetails?.screenshotName);

interface AdminDashboardProps {
  onCloseAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onCloseAdmin }) => {
  const { user, logout } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'manage' | 'track' | 'payments' | 'customers' | 'files' | 'referrals'>('overview');
  const [orders, setOrders] = useState<CamporaOrder[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [checkoutBatches, setCheckoutBatches] = useState<any[]>([]);
  const [referralData, setReferralData] = useState<{ codes: any[]; uses: any[]; wallets: any[]; ledger: any[]; audit: any[] }>({ codes: [], uses: [], wallets: [], ledger: [], audit: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [manageOrdersTab, setManageOrdersTab] = useState<'all' | 'live' | 'in_progress' | 'delayed' | 'completed' | 'cancelled' | 'rejected' | 'refund_completed'>('all');
  const [manageOrdersSort, setManageOrdersSort] = useState<'time_left' | 'date_newest' | 'date_oldest'>('time_left');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [paymentDeskFilter, setPaymentDeskFilter] = useState<'all' | 'not_submitted' | 'submitted' | 'paid'>('all');
  
  // Modals / Reason inputs
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Duplicate request / Student cancelled');
  const [customCancellationText, setCustomCancellationText] = useState('');

  // Deliverable upload
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState('PDF');
  const [newDeliverableFile, setNewDeliverableFile] = useState<File | null>(null);

  // Admin notes
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [quoteAmountInput, setQuoteAmountInput] = useState('');
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAdminData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [ordersRes, custRes, filesRes, batchesRes, referralRes] = await Promise.all([
        api.getAdminOrders(),
        api.getAdminCustomers().catch(() => ({ customers: [] })),
        api.getAdminFiles().catch(() => ({ files: [] })),
        api.getAdminCheckoutBatches().catch(() => ({ batches: [] })),
        api.getAdminReferrals().catch(() => ({ codes: [], uses: [], wallets: [], ledger: [], audit: [] })),
      ]);
      setOrders(ordersRes.orders || []);
      setCustomers(custRes.customers || []);
      setFiles(filesRes.files || []);
      setCheckoutBatches(batchesRes.batches || []);
      setReferralData(referralRes);
      if (!selectedOrderId && ordersRes.orders?.length > 0) {
        setSelectedOrderId(ordersRes.orders[0].id);
        setAdminNoteInput(ordersRes.orders[0].adminNotes || '');
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load admin data.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // Poll the protected admin orders endpoint so customer submissions and changes
    // made in other sessions appear without a manual browser refresh.
    const refreshAdminData = () => {
      if (document.visibilityState === 'visible') void fetchAdminData(false);
    };
    const interval = window.setInterval(refreshAdminData, 8000);
    const handleFocus = () => { void fetchAdminData(false); };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  useEffect(() => {
    if (activeOrder) {
      setAdminNoteInput(activeOrder.adminNotes || '');
      setQuoteAmountInput(String(activeOrder.finalPrice || activeOrder.total || ''));
    }
  }, [selectedOrderId, activeOrder?.finalPrice, activeOrder?.total]);

  // Overview metrics
  const totalOrders = orders.length;
  const newOrdersCount = orders.filter((o) => o.status === 'new_order' || o.status === 'under_review').length;
  const pendingApprovalCount = orders.filter((o) => o.status === 'new_order' || o.status === 'requirements_review').length;
  const verificationPendingCount = orders.filter((o) => o.paymentStatus === 'verification_pending').length;
  const paidOrdersCount = orders.filter((o) => o.paymentStatus === 'paid').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const totalRevenue = orders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.finalPrice || o.total), 0);

  // Status Action Handlers
  const handleApproveOrder = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.updateOrderStatus(activeOrder.id, 'approved');
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      triggerToast(`Order ${activeOrder.id} approved. Activated for payment.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to approve order.');
    }
  };

  const handleRejectOrder = async () => {
    if (!activeOrder || !rejectionNote.trim()) {
      triggerToast('Please provide a reason for rejecting.');
      return;
    }
    try {
      const res = await api.updateOrderStatus(activeOrder.id, 'rejected', rejectionNote.trim());
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      setIsRejecting(false);
      setRejectionNote('');
      triggerToast(`Order ${activeOrder.id} rejected.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to reject order.');
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    const finalReason = customCancellationText.trim() || cancellationReason;
    try {
      const res = await api.updateOrderStatus(activeOrder.id, 'cancelled', undefined, finalReason);
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      setIsCancelling(false);
      setCustomCancellationText('');
      triggerToast(`Order ${activeOrder.id} cancelled.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to cancel order.');
    }
  };

  const handleMarkInProgress = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.updateOrderStatus(activeOrder.id, 'in_progress');
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      triggerToast(`Order ${activeOrder.id} is now In Progress.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update status.');
    }
  };

  const handleMarkReview = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.updateOrderStatus(activeOrder.id, 'review');
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      triggerToast(`Order ${activeOrder.id} moved to Quality Review.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update status.');
    }
  };

  const handleSaveQuote = async () => {
    if (!activeOrder) return;
    const amount = Number(quoteAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) { triggerToast('Enter a valid quote amount greater than ₹0.'); return; }
    setIsSavingQuote(true);
    try {
      const result = await api.setOrderQuote(activeOrder.id, amount);
      setOrders((prev) => prev.map((order) => order.id === activeOrder.id ? result.order : order));
      triggerToast(result.message || 'Quote saved. Customer can now pay from My Orders.');
    } catch (error: any) {
      triggerToast(error.message || 'Could not save quote.');
    } finally {
      setIsSavingQuote(false);
    }
  };

  const handleConfirmPayment = async (orderIdToConfirm?: string) => {
    const targetId = orderIdToConfirm || activeOrder?.id;
    if (!targetId) return;
    try {
      const res = await api.verifyPayment(targetId, 'confirm');
      setOrders((prev) => prev.map((o) => (o.id === targetId ? res.order : o)));
      triggerToast(res.message || 'Payment confirmed successfully!');
    } catch (err: any) {
      triggerToast(err.message || 'Payment verification failed.');
    }
  };

  const handleRejectPayment = async (orderIdToReject?: string, reason?: string) => {
    const targetId = orderIdToReject || activeOrder?.id;
    if (!targetId) return;
    const finalReason = reason || 'Payment could not be matched against bank records. Please recheck the screenshot and optional UTR, then resubmit.';
    try {
      const res = await api.verifyPayment(targetId, 'reject', finalReason);
      setOrders((prev) => prev.map((o) => (o.id === targetId ? res.order : o)));
      triggerToast('Payment marked as rejected.');
    } catch (err: any) {
      triggerToast(err.message || 'Payment rejection failed.');
    }
  };

  const handleWalletAdjustment = async (customerId: string) => {
    const rawAmount = window.prompt('Enter positive amount to credit or negative amount to debit (₹):');
    if (rawAmount === null) return;
    const reason = window.prompt('Enter the audit reason for this wallet adjustment:');
    if (!reason?.trim()) return;
    try {
      const result = await api.adjustCustomerWallet(customerId, Number(rawAmount), reason.trim());
      triggerToast(`${result.message} New balance: ₹${result.balance.toFixed(2)}`);
      const refreshed = await api.getAdminReferrals();
      setReferralData(refreshed);
      await fetchAdminData(false);
    } catch (error: any) { triggerToast(error.message || 'Wallet adjustment failed.'); }
  };

  const handleReferralUsageAdjustment = async (code: string, currentCount: number) => {
    const rawCount = window.prompt(`Set the corrected referral usage count for ${code} (0–3):`, String(currentCount));
    if (rawCount === null) return;
    const newUsageCount = Number(rawCount);
    if (!Number.isInteger(newUsageCount) || newUsageCount < 0 || newUsageCount > 3) {
      triggerToast('Referral usage count must be a whole number from 0 to 3.');
      return;
    }
    const reason = window.prompt('Enter the audit reason for this referral-count correction:');
    if (!reason?.trim()) return;
    try {
      const result = await api.adjustReferralUsage(code, newUsageCount, reason.trim());
      triggerToast(result.message);
      const refreshed = await api.getAdminReferrals();
      setReferralData(refreshed);
      await fetchAdminData(false);
    } catch (error: any) {
      triggerToast(error.message || 'Referral usage adjustment failed.');
    }
  };

  const handleCompleteRefund = async (order: CamporaOrder) => {
    if (!window.confirm('Confirm that the actual UPI/bank refund has already been processed to the customer. CAMPORA Cash used on this order will also be restored.')) return;
    const reason = window.prompt('Enter the refund reference or audit reason:');
    if (!reason?.trim()) return;
    try {
      const result = await api.completeOrderRefund(order.id, reason.trim());
      setOrders((previous) => previous.map((item) => item.id === order.id ? result.order : item));
      triggerToast(result.message);
      await fetchAdminData(false);
    } catch (error: any) {
      triggerToast(error.message || 'Refund could not be recorded.');
    }
  };

  const handleVerifyCombinedPayment = async (batchId: string, action: 'confirm' | 'reject') => {
    const reason = action === 'reject' ? window.prompt('Enter the reason for rejecting this combined payment proof:') : undefined;
    if (action === 'reject' && !reason?.trim()) return;
    try {
      const result = await api.verifyCombinedPayment(batchId, action, reason);
      triggerToast(result.message);
      await fetchAdminData(false);
    } catch (error: any) { triggerToast(error.message || 'Combined payment update failed.'); }
  };

  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !newDeliverableTitle.trim() || !newDeliverableFile) {
      triggerToast('Please provide a title and select the actual deliverable file.');
      return;
    }
    if (activeOrder.paymentStatus !== 'paid') {
      triggerToast('Verify payment before uploading a customer deliverable.');
      return;
    }
    if (newDeliverableFile.size > 15 * 1024 * 1024) {
      triggerToast('Deliverable files must be 15 MB or smaller.');
      return;
    }
    const selectedExtension = newDeliverableFile.name.split('.').pop()?.toUpperCase() || 'FILE';
    try {
      const res = await api.uploadDeliverable(activeOrder.id, {
        title: newDeliverableTitle.trim(),
        file: newDeliverableFile,
      });
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      const refreshedFiles = await api.getAdminFiles().catch(() => null);
      if (refreshedFiles) setFiles(refreshedFiles.files || []);
      setNewDeliverableTitle('');
      setNewDeliverableFile(null);
      triggerToast('Deliverable securely uploaded and order marked Completed!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to upload deliverable.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await api.exportAdminBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campora-orders-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      triggerToast('Order metadata backup downloaded. Uploaded file binaries remain in private storage.');
    } catch (err: any) {
      triggerToast(err.message || 'Could not export order backup.');
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.updateAdminNotes(activeOrder.id, adminNoteInput);
      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? res.order : o)));
      triggerToast('Private admin notes updated.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save admin notes.');
    }
  };

  // Include cancelled orders in All Orders and distinguish actual screenshot proof from legacy payment flags.
  const paymentDeskOrders = orders.filter((ord) => {
    const hasProof = hasSubmittedPaymentScreenshot(ord);
    if (paymentDeskFilter === 'not_submitted') return ord.paymentStatus !== 'paid' && !hasProof && ord.paymentStatus !== 'awaiting_quote';
    if (paymentDeskFilter === 'submitted') return hasProof && ord.paymentStatus !== 'paid';
    if (paymentDeskFilter === 'paid') return ord.paymentStatus === 'paid';
    return true;
  });

  // Automatic operational buckets. Terminal outcomes take precedence over active/deadline buckets.
  const getOrderBucket = (ord: CamporaOrder): 'refund_completed' | 'cancelled' | 'rejected' | 'completed' | 'in_progress' | 'delayed' | 'live' => {
    if (ord.refundStatus === 'refunded') return 'refund_completed';
    if (ord.status === 'cancelled') return 'cancelled';
    if (ord.status === 'rejected') return 'rejected';
    if (ord.status === 'completed') return 'completed';
    if (ord.status === 'in_progress' || ord.status === 'review') return 'in_progress';
    const createdAt = new Date(ord.createdAt).getTime();
    const deadlineAt = createdAt + getDeadlineDurationMs(ord.deadline);
    if (Number.isFinite(createdAt) && Date.now() > deadlineAt) return 'delayed';
    return 'live';
  };

  const filteredOrders = orders.filter((ord) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ord.id.toLowerCase().includes(query) ||
      ord.customerName.toLowerCase().includes(query) ||
      ord.customerEmail.toLowerCase().includes(query) ||
      ord.whatsappNumber.toLowerCase().includes(query) ||
      ord.college.toLowerCase().includes(query) ||
      ord.topic.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    return manageOrdersTab === 'all' || getOrderBucket(ord) === manageOrdersTab;
  });

  const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (manageOrdersSort === 'date_newest' || manageOrdersSort === 'date_oldest') {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      const direction = manageOrdersSort === 'date_newest' ? -1 : 1;
      return ((Number.isFinite(aDate) ? aDate : 0) - (Number.isFinite(bDate) ? bDate : 0)) * direction;
    }
    const now = Date.now();
    const aCreated = new Date(a.createdAt).getTime();
    const bCreated = new Date(b.createdAt).getTime();
    const aTimeLeft = Number.isFinite(aCreated) ? aCreated + getDeadlineDurationMs(a.deadline) - now : Number.NEGATIVE_INFINITY;
    const bTimeLeft = Number.isFinite(bCreated) ? bCreated + getDeadlineDurationMs(b.deadline) - now : Number.NEGATIVE_INFINITY;
    return bTimeLeft - aTimeLeft;
  });

  const manageOrderTabCounts = {
    all: orders.length,
    live: orders.filter((ord) => getOrderBucket(ord) === 'live').length,
    in_progress: orders.filter((ord) => getOrderBucket(ord) === 'in_progress').length,
    delayed: orders.filter((ord) => getOrderBucket(ord) === 'delayed').length,
    completed: orders.filter((ord) => getOrderBucket(ord) === 'completed').length,
    cancelled: orders.filter((ord) => getOrderBucket(ord) === 'cancelled').length,
    rejected: orders.filter((ord) => getOrderBucket(ord) === 'rejected').length,
    refund_completed: orders.filter((ord) => getOrderBucket(ord) === 'refund_completed').length,
  };

  return (
    <div id="admin-dashboard-root" className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      
      {/* Top Admin Header Bar */}
      <header className="bg-[#111114] border-b border-amber-500/20 px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-sm sm:text-base">CAMPORA Admin Control</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Authorized Desk
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Authenticated: {user?.name || 'Administrator'} ({user?.email})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-admin-close-to-web"
            onClick={onCloseAdmin}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
          >
            Website View
          </button>
          <button
            id="btn-admin-logout"
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Admin Tab Navigation Bar */}
      <div className="bg-[#0E0E11] border-b border-zinc-800 px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
        <button
          id="admin-tab-overview"
          onClick={() => setActiveAdminTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'overview' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Overview & Metrics
        </button>

        <button
          id="admin-tab-manage"
          onClick={() => setActiveAdminTab('manage')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'manage' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Manage Orders ({orders.length})
        </button>

        <button
          id="admin-tab-track"
          onClick={() => setActiveAdminTab('track')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'track' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Track Orders (Search & Tracker)
        </button>

        <button
          id="admin-tab-payments"
          onClick={() => setActiveAdminTab('payments')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'payments' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Verification Desk
          {verificationPendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-bold text-[10px]">
              {verificationPendingCount}
            </span>
          )}
        </button>

        <button
          id="admin-tab-customers"
          onClick={() => setActiveAdminTab('customers')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'customers' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Customers ({customers.length})
        </button>

        <button
          id="admin-tab-referrals"
          onClick={() => setActiveAdminTab('referrals')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeAdminTab === 'referrals' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
        >
          <Gift className="w-4 h-4" /> Referrals & Wallet
        </button>

        <button
          id="admin-tab-files"
          onClick={() => setActiveAdminTab('files')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeAdminTab === 'files' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4" /> File Repository ({files.length})
        </button>
      </div>

      <div className="px-4 sm:px-6 py-2 bg-[#0E0E11] flex justify-end border-b border-zinc-800">
        <button onClick={handleExportBackup} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold">Export Orders Backup</button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-black font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce">
          <Sparkles className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        
        {/* ================= TAB 1: OVERVIEW METRICS ================= */}
        {activeAdminTab === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Executive Dashboard & Operational Metrics</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Real-time status overview across all student submissions, verified revenues, and queue pipelines.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Orders</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">{totalOrders}</div>
                <div className="text-[10px] text-zinc-500 mt-1">All time campus volume</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Verified Revenue</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">₹{totalRevenue}</div>
                <div className="text-[10px] text-emerald-500 mt-1">{paidOrdersCount} orders confirmed</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-blue-500/20 bg-blue-500/5">
                <div className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">Verification Pending</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">{verificationPendingCount}</div>
                <div className="text-[10px] text-blue-400/80 mt-1">UTR submitted by student</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">New Orders / Review</div>
                <div className="text-2xl sm:text-3xl font-black text-yellow-400 mt-1">{newOrdersCount}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Awaiting admin review</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">{inProgressCount}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Designers working</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Completed Deliverables</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{completedCount}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Ready for student download</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Cancelled / Rejected</div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-400 mt-1">{cancelledCount}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Archived records</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Active Clients</div>
                <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">{customers.length}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Unique student accounts</div>
              </div>
            </div>

            {/* Quick Action Queue */}
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
              <h3 className="text-sm font-bold text-white mb-3">Orders Requiring Immediate Action</h3>
              <div className="space-y-2.5">
                {orders.filter((o) => o.paymentStatus === 'verification_pending' || o.status === 'new_order').length === 0 ? (
                  <div className="text-xs text-zinc-500 p-4 text-center">No urgent actions pending in the queue. All orders up to date!</div>
                ) : (
                  orders
                    .filter((o) => o.paymentStatus === 'verification_pending' || o.status === 'new_order')
                    .map((ord) => (
                      <div key={ord.id} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{ord.id}</span>
                            <span className="font-semibold text-white">{ord.customerName}</span>
                            <span className="text-zinc-400 font-normal">({ord.serviceName})</span>
                          </div>
                          <p className="text-zinc-400 text-[11px] mt-0.5">{ord.topic}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ord.paymentStatus === 'verification_pending' && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(ord.id);
                                setActiveAdminTab('payments');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs"
                            >
                              Verify UTR (₹{ord.finalPrice || ord.total})
                            </button>
                          )}
                          {ord.status === 'new_order' && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(ord.id);
                                setActiveAdminTab('manage');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                            >
                              Review & Approve
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2 & 3: MANAGE & TRACK ORDERS ================= */}
        {(activeAdminTab === 'manage' || activeAdminTab === 'track') && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Order List with Filters */}
            <div className="lg:col-span-5 space-y-3">
              {/* Search & Filter Bar */}
              <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, Name, Email, Topic..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {([
                    { id: 'all', label: 'All Orders' },
                    { id: 'live', label: 'Live Orders' },
                    { id: 'in_progress', label: 'Running Orders' },
                    { id: 'delayed', label: 'Delayed Orders' },
                    { id: 'completed', label: 'Completed Orders' },
                    { id: 'cancelled', label: 'Cancelled Orders' },
                    { id: 'rejected', label: 'Rejected Orders' },
                    { id: 'refund_completed', label: 'Refund Completed' },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setManageOrdersTab(tab.id)}
                      className={`px-3 py-2 rounded-lg border text-left font-semibold transition-colors ${
                        manageOrdersTab === tab.id
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      <span className="block">{tab.label}</span>
                      <span className={`text-[10px] ${manageOrdersTab === tab.id ? 'text-black/70' : 'text-zinc-500'}`}>{manageOrderTabCounts[tab.id]} orders</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  <label htmlFor="manage-orders-sort" className="text-[11px] text-zinc-400 whitespace-nowrap">Sort / Filter</label>
                  <select
                    id="manage-orders-sort"
                    value={manageOrdersSort}
                    onChange={(e) => setManageOrdersSort(e.target.value as 'time_left' | 'date_newest' | 'date_oldest')}
                    className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="time_left">Time Left: High to Low</option>
                    <option value="date_newest">Date: Newest First</option>
                    <option value="date_oldest">Date: Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Order Cards List */}
              <div className="space-y-2 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {sortedFilteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border text-xs ${
                      selectedOrderId === ord.id
                        ? 'bg-[#18181D] border-amber-500/60 shadow-lg shadow-amber-500/5'
                        : 'bg-[#121215] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-bold text-amber-400">{ord.id}</span>
                      <span className="text-[10px] text-zinc-500">{ord.createdAt}</span>
                    </div>

                    <div className="font-bold text-white truncate">{ord.customerName}</div>
                    <div className="text-zinc-400 text-[11px] truncate mb-2">{ord.serviceName} • {ord.topic}</div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                      <span className="font-bold text-zinc-200">₹{ord.finalPrice || ord.total}</span>
                      <div className="flex items-center gap-1">
                        {ord.paymentStatus === 'paid' && <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid</span>}
                        {ord.paymentStatus === 'verification_pending' && <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Verifying</span>}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 capitalize">{ord.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Selected Order Management Console */}
            <div className="lg:col-span-7 space-y-4">
              {activeOrder ? (
                <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {activeOrder.id}
                        </span>
                        <h2 className="text-lg font-bold text-white">{activeOrder.serviceName}</h2>
                        {activeOrder.isPackage && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Internship Package
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Topic: <strong className="text-zinc-200">{activeOrder.topic}</strong></p>
                      {activeOrder.status !== 'cancelled' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeOrder.deadline.toLowerCase().includes('urgent') && (
                            <span className="inline-flex mt-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-bold">URGENT DEADLINE</span>
                          )}
                          <UrgentDeadlineCountdown order={activeOrder} />
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Total Payable</div>
                      <div className="text-xl font-bold text-amber-400">₹{activeOrder.finalPrice || activeOrder.total}</div>
                    </div>
                  </div>

                  {/* Customer Information Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-bold">Student Name</div>
                      <div className="font-semibold text-white mt-0.5">{activeOrder.customerName}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-bold">WhatsApp</div>
                      <div className="font-semibold text-white mt-0.5">{activeOrder.whatsappNumber}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-bold">College / Univ</div>
                      <div className="font-semibold text-white mt-0.5">{activeOrder.college}</div>
                    </div>
                    <div className="col-span-2 sm:col-span-3 pt-1 border-t border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-bold">Student Instructions</div>
                      <p className="text-zinc-300 mt-0.5 italic">{activeOrder.instructions || 'No specific instructions provided.'}</p>
                    </div>
                  </div>

                  {/* Complete customer brief and downloadable source files */}
                  <div className="p-4 rounded-xl bg-zinc-900/70 border border-amber-500/20 space-y-3">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Order Specifications & Uploaded Materials</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Work Details</div>
                        <div className="text-white font-semibold">{activeOrder.topic}</div>
                        <div className="text-zinc-300 mt-1">{activeOrder.pagesOrSlides} slides/pages • {activeOrder.deadline}</div>
                        <p className="text-zinc-400 mt-2 whitespace-pre-wrap">{activeOrder.instructions || 'No additional instructions.'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">College / University Template</div>
                        {activeOrder.collegeTemplateFile ? (
                          <a href={activeOrder.collegeTemplateFile.downloadUrl || '#'} download className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 underline" onClick={(e) => { if (!activeOrder.collegeTemplateFile?.downloadUrl) e.preventDefault(); }}>
                            <Download className="w-3.5 h-3.5" /> {activeOrder.collegeTemplateFile.name} — Download
                          </a>
                        ) : <span className="text-zinc-300">No template — Standard Format</span>}
                        {activeOrder.templateInstructions && <p className="text-zinc-400 mt-2 whitespace-pre-wrap">{activeOrder.templateInstructions}</p>}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Reference Materials & Rough Notes ({activeOrder.referenceFiles?.length || 0})</div>
                      {activeOrder.referenceFiles?.length ? (
                        <div className="space-y-2">
                          {activeOrder.referenceFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-zinc-200 truncate">{file.name} <span className="text-zinc-500">({file.size})</span></span>
                              <a href={file.downloadUrl || '#'} download onClick={(e) => { if (!file.downloadUrl) e.preventDefault(); }} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20">
                                <Download className="w-3.5 h-3.5" /> Download
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-zinc-500">No reference materials uploaded.</span>}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  {(activeOrder.requiresReview || activeOrder.quoteStatus !== 'not_required' || activeOrder.paymentStatus === 'awaiting_quote') && (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-3">
                      <div>
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Custom Quote Pricing</div>
                        <p className="text-[11px] text-zinc-400 mt-1">Review the request and discuss it with the customer on WhatsApp. Set the final amount here to unlock payment in the customer's My Orders page.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <label className="flex-1 text-xs text-zinc-300">
                          {activeOrder.urgentSurchargePercent === 30 ? 'Base quote before 30% urgent surcharge (INR)' : 'Final price (INR)'}
                          <div className="mt-1 flex items-center rounded-lg border border-zinc-700 bg-zinc-950 px-3">
                            <span className="text-amber-400 font-bold">₹</span>
                            <input type="number" min="0.01" step="0.01" value={quoteAmountInput} onChange={(event) => setQuoteAmountInput(event.target.value)} disabled={activeOrder.paymentStatus === 'paid' || ['cancelled', 'rejected', 'completed'].includes(activeOrder.status)} placeholder="Enter agreed amount" className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none disabled:opacity-50" />
                          </div>
                        </label>
                        <button type="button" onClick={handleSaveQuote} disabled={isSavingQuote || activeOrder.paymentStatus === 'paid' || ['cancelled', 'rejected', 'completed'].includes(activeOrder.status)} className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold">{isSavingQuote ? 'Saving…' : activeOrder.quoteStatus === 'sent' ? 'Update Quote & Price' : 'Save Quote & Enable Payment'}</button>
                      </div>
                      {activeOrder.quoteStatus === 'sent' && <p className="text-[11px] text-emerald-300">Quote saved: ₹{activeOrder.finalPrice || activeOrder.total}. Customer can pay from My Orders.</p>}
                    </div>
                  )}

                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Payment Submission</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-500">Payment Proof</div>
                        <div className={hasSubmittedPaymentScreenshot(activeOrder) ? 'text-emerald-300 font-semibold' : 'text-zinc-400 italic'}>
                          {hasSubmittedPaymentScreenshot(activeOrder) ? 'Submitted' : 'Not Submitted'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-500">UTR Number</div>
                        <div className={activeOrder.paymentDetails?.utrNumber ? 'text-emerald-300 font-semibold' : 'text-zinc-400 italic'}>
                          {activeOrder.paymentDetails?.utrNumber || 'Not Submitted'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-500">Payment Status</div>
                        <div className="text-zinc-200 font-semibold">{activeOrder.paymentStatus.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    {!hasSubmittedPaymentScreenshot(activeOrder) && activeOrder.paymentStatus !== 'paid' && (
                      <p className="text-[11px] text-amber-300">The customer has not submitted a payment screenshot. Payment cannot be confirmed until proof is submitted and checked.</p>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/${activeOrder.whatsappNumber.replace(/\\D/g, '')}?text=${encodeURIComponent(`Hi ${activeOrder.customerName}, CAMPORA update for order ${activeOrder.id}: ${activeOrder.status.replace(/_/g, ' ')}. Please reply here if you need help.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Message Customer on WhatsApp
                  </a>


                  {/* Order Workflow Action Buttons */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Order Actions & Status Control</span>
                      <span className="text-[11px] text-zinc-400 font-normal">Current: <strong className="text-white capitalize">{activeOrder.status.replace('_', ' ')}</strong></span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {/* Approve */}
                      <button
                        id="btn-admin-approve"
                        onClick={handleApproveOrder}
                        className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Requirements
                      </button>

                      {/* In Progress */}
                      <button
                        id="btn-admin-in-progress"
                        onClick={handleMarkInProgress}
                        disabled={activeOrder.paymentStatus !== 'paid'}
                        className="px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" /> Mark In Progress
                      </button>

                      {/* Review */}
                      <button
                        id="btn-admin-review"
                        onClick={handleMarkReview}
                        disabled={activeOrder.paymentStatus !== 'paid'}
                        className="px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Move to Review
                      </button>

                      {/* Online Razorpay payments are confirmed only by a verified gateway callback/webhook. */}
                      {activeOrder.paymentGateway?.provider === 'razorpay' && activeOrder.paymentGateway.status === 'created' && activeOrder.paymentStatus !== 'paid' && (
                        <span className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
                          Awaiting Razorpay payment confirmation
                        </span>
                      )}
                      {/* Manual payment confirmation remains for legacy UPI proof only. */}
                      {activeOrder.paymentStatus !== 'paid' && !(activeOrder.paymentGateway?.provider === 'razorpay' && activeOrder.paymentGateway.status === 'created') && activeOrder.paymentStatus !== 'awaiting_quote' && (
                        <button
                          id="btn-admin-confirm-pay"
                          onClick={() => handleConfirmPayment()}
                          className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Manually Confirm Payment
                        </button>
                      )}

                      {/* Reject Order */}
                      <button
                        id="btn-admin-reject"
                        onClick={() => setIsRejecting(true)}
                        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold border border-red-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Order
                      </button>

                      {/* Cancel Order */}
                      <button
                        id="btn-admin-cancel"
                        onClick={() => setIsCancelling(true)}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancel Order
                      </button>
                      {activeOrder.refundStatus === 'requested' || activeOrder.refundStatus === 'processing' ? (
                        <button
                          id="btn-admin-complete-refund"
                          onClick={() => handleCompleteRefund(activeOrder)}
                          className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Confirm Refund Completed
                        </button>
                      ) : null}
                    </div>

                    {/* Rejection Prompt */}
                    {isRejecting && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 mt-2">
                        <label className="block text-xs font-bold text-red-400">Specify Rejection Reason (visible to student):</label>
                        <input
                          type="text"
                          value={rejectionNote}
                          onChange={(e) => setRejectionNote(e.target.value)}
                          placeholder="e.g. Scope exceeds standard timeframe / Topic needs revision"
                          className="w-full bg-zinc-900 border border-red-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleRejectOrder} className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded">Confirm Rejection</button>
                          <button onClick={() => setIsRejecting(false)} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Prompt */}
                    {isCancelling && (
                      <div className="p-3.5 rounded-xl bg-zinc-800 border border-zinc-700 space-y-2 mt-2">
                        <label className="block text-xs font-bold text-zinc-200">Select or Enter Cancellation Reason:</label>
                        <select
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        >
                          <option value="Duplicate request / Student cancelled">Duplicate request / Student cancelled</option>
                          <option value="Student unresponsive to clarifications">Student unresponsive to clarifications</option>
                          <option value="Topic outside academic domain capabilities">Topic outside academic domain capabilities</option>
                          <option value="Other">Custom Reason...</option>
                        </select>
                        {cancellationReason === 'Other' && (
                          <input
                            type="text"
                            value={customCancellationText}
                            onChange={(e) => setCustomCancellationText(e.target.value)}
                            placeholder="Enter specific cancellation reason..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        )}
                        <div className="flex gap-2">
                          <button onClick={handleCancelOrder} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold rounded">Confirm Cancellation</button>
                          <button onClick={() => setIsCancelling(false)} className="px-3 py-1 bg-zinc-900 text-zinc-400 text-xs rounded">Dismiss</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Completed Work Section */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-4 h-4" /> Upload Completed Deliverable
                    </div>

                    <form onSubmit={handleUploadDeliverable} className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={newDeliverableTitle}
                            onChange={(e) => setNewDeliverableTitle(e.target.value)}
                            placeholder="Deliverable title (e.g. Final_Seminar_VIT_Deck.pptx)"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <span className="w-full block bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400">File type detected from filename</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="file"
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
                          onChange={(e) => setNewDeliverableFile(e.target.files?.[0] || null)}
                          className="block w-full text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-700"
                        />
                        <p className="text-[10px] text-zinc-500">
                          {newDeliverableFile ? `Selected: ${newDeliverableFile.name} (${(newDeliverableFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Select the actual deliverable file (PDF, PPT/PPTX, Word, Excel, image, ZIP, text or CSV; maximum 15 MB).'}
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={!newDeliverableFile}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> Upload & Mark Order Completed
                      </button>
                    </form>
                  </div>

                  {/* Admin-only audit trail */}
                  {activeOrder.activityHistory && activeOrder.activityHistory.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Order Activity History</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...activeOrder.activityHistory].reverse().map((entry) => <div key={entry.id} className="text-xs border-l-2 border-amber-500/40 pl-3"><div className="text-zinc-200 font-semibold">{entry.description}</div><div className="text-[10px] text-zinc-500">{entry.actor} • {new Date(entry.timestamp).toLocaleString()}</div></div>)}
                      </div>
                    </div>
                  )}

                  {/* Private Admin Notes (Protected from Customer) */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Edit3 className="w-3.5 h-3.5" /> Private Admin Notes
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal">Internal only (never sent to customer)</span>
                    </div>

                    <textarea
                      rows={2}
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="Add internal designer notes, citation guidelines, or payment observations..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                    />

                    <button
                      onClick={handleSaveAdminNotes}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                    >
                      Save Admin Note
                    </button>
                  </div>

                  {/* Live Progress Timeline Inspector */}
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5">Live Progress Tracker</h3>
                    <div className="space-y-2">
                      {activeOrder.timeline.map((step, idx) => (
                        <div key={step.id || idx} className="flex items-start gap-2.5 text-xs">
                          <div className={`mt-0.5 w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center ${
                            step.status === 'completed' ? 'bg-emerald-500 text-black' : step.status === 'current' ? 'bg-amber-500 text-black animate-pulse' : 'bg-zinc-800 text-zinc-600'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{step.title}</span>
                              {step.timestamp && <span className="text-[10px] text-zinc-500 font-normal">{step.timestamp}</span>}
                            </div>
                            <p className="text-zinc-400 text-[11px]">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 text-xs">Select an order on the left to manage.</div>
              )}
            </div>
          </div>
        )}

        {/* ================= COMBINED CHECKOUT VERIFICATION ================= */}
        {activeAdminTab === 'payments' && (
          <div className="max-w-7xl mx-auto mb-7 p-5 rounded-2xl bg-[#121215] border border-amber-500/25">
            <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-base font-bold text-white">Combined Checkout Verification</h3><p className="text-[11px] text-zinc-400">One UPI payment can cover multiple independent orders. Verify the full amount before confirming.</p></div><span className="text-[10px] text-amber-300">{checkoutBatches.filter((b) => b.paymentStatus === 'verification_pending').length} awaiting review</span></div>
            {checkoutBatches.length === 0 ? <p className="text-xs text-zinc-500">No combined checkouts have been created yet.</p> : <div className="space-y-3">{checkoutBatches.map((batch) => <div key={batch.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-bold text-amber-400">{batch.id}</span><span className="text-xs text-white font-semibold">{batch.customer}</span><span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${batch.paymentStatus === 'verification_pending' ? 'bg-blue-500/10 text-blue-300' : batch.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>{batch.paymentStatus.replace(/_/g,' ')}</span></div><p className="text-[11px] text-zinc-400 mt-1">Orders: {(batch.orderIds || []).join(', ')}</p><p className="text-[11px] text-zinc-400">UTR: {batch.utrNumber || 'Not provided'} · Submitted: {batch.submittedAt ? new Date(batch.submittedAt).toLocaleString() : 'Not submitted'}</p></div>
                <div className="text-right"><div className="text-[10px] text-zinc-500">UPI amount to verify</div><div className="text-lg font-bold text-white">₹{Number(batch.amountDue).toFixed(2)}</div><div className="text-[10px] text-amber-300">CAMPORA Cash: ₹{Number(batch.cashRedeemed).toFixed(2)}</div></div></div>
              <div className="mt-3 flex flex-wrap items-center gap-2">{batch.screenshotUrl && <a href={batch.screenshotUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white">View payment screenshot</a>}{batch.paymentStatus === 'verification_pending' && <><button onClick={() => handleVerifyCombinedPayment(batch.id,'confirm')} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold">Confirm Full Payment</button><button onClick={() => handleVerifyCombinedPayment(batch.id,'reject')} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">Reject Proof</button></>}</div>
            </div>)}</div>}
          </div>
        )}

        {/* ================= TAB: REFERRALS & WALLET OVERSIGHT ================= */}
        {activeAdminTab === 'referrals' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div><h2 className="text-xl font-bold text-white">Referral Program & CAMPORA Cash</h2><p className="text-xs text-zinc-400 mt-1">Review referral usage, successful rewards and audited wallet balances.</p></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800"><div className="text-[11px] text-zinc-400">Referral Codes</div><div className="text-2xl font-bold text-white">{referralData.codes.length}</div></div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800"><div className="text-[11px] text-zinc-400">Referred Customers</div><div className="text-2xl font-bold text-white">{referralData.uses.length}</div></div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800"><div className="text-[11px] text-zinc-400">Wallets</div><div className="text-2xl font-bold text-amber-300">{referralData.wallets.length}</div></div>
            </div>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto"><h3 className="text-sm font-bold text-white mb-3">Referral Usage & Reward Status</h3>
              {referralData.uses.length === 0 ? <p className="text-xs text-zinc-500">No referral code has been used yet.</p> : <table className="w-full text-xs"><thead><tr className="text-zinc-500 text-left border-b border-zinc-800"><th className="py-2">Referrer</th><th>Referred Customer</th><th>Code</th><th>Qualifying Order</th><th>Reward Status</th><th>Credited</th></tr></thead><tbody>{referralData.uses.map((use:any)=><tr key={use.referred_customer_id} className="border-b border-zinc-800/60"><td className="py-2 text-white">{use.referrerName}</td><td>{use.referredName}</td><td className="font-mono text-amber-300">{use.code}</td><td>{use.qualifying_order_id || '—'}</td><td>{use.reward_status}</td><td>{use.credited_at ? new Date(use.credited_at).toLocaleString() : '—'}</td></tr>)}</tbody></table>}
            </div>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto"><h3 className="text-sm font-bold text-white mb-3">Customer Wallets & Adjustments</h3>
              {referralData.wallets.length === 0 ? <p className="text-xs text-zinc-500">No customer wallets yet.</p> : <table className="w-full text-xs"><thead><tr className="text-zinc-500 text-left border-b border-zinc-800"><th className="py-2">Customer</th><th>Customer ID</th><th>Balance</th><th>Action</th></tr></thead><tbody>{referralData.wallets.map((wallet:any)=><tr key={wallet.customer_id} className="border-b border-zinc-800/60"><td className="py-2 text-white">{wallet.customerName}</td><td className="font-mono text-zinc-500">{wallet.customer_id}</td><td className="font-bold text-amber-300">₹{Number(wallet.balance).toFixed(2)}</td><td><button onClick={()=>handleWalletAdjustment(wallet.customer_id)} className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Adjust with reason</button></td></tr>)}</tbody></table>}
            </div>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto"><h3 className="text-sm font-bold text-white mb-3">Latest Wallet Ledger</h3>
              {referralData.ledger.length === 0 ? <p className="text-xs text-zinc-500">No wallet transactions yet.</p> : <table className="w-full text-xs"><thead><tr className="text-zinc-500 text-left border-b border-zinc-800"><th className="py-2">Customer</th><th>Type</th><th>Amount</th><th>Reference</th><th>Description</th></tr></thead><tbody>{referralData.ledger.slice(0,100).map((entry:any,i:number)=><tr key={`${entry.customer_id}-${entry.reference_key}-${i}`} className="border-b border-zinc-800/60"><td className="py-2">{entry.customerName}</td><td>{entry.entry_type}</td><td className={Number(entry.amount)>=0?'text-emerald-300':'text-red-300'}>₹{Number(entry.amount).toFixed(2)}</td><td className="font-mono">{entry.reference_key}</td><td>{entry.description}</td></tr>)}</tbody></table>}
            </div>
          </div>
        )}

        {/* ================= TAB 4: PAYMENT VERIFICATION DESK ================= */}
        {activeAdminTab === 'payments' && (
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Manual UPI Payment Verification Desk</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Check each submitted screenshot and optional UTR against your bank records before activating design work.</p>
              </div>
              <div className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                UPI ID: {UPI_ID}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([['all','All Orders'],['not_submitted','Proof Not Submitted'],['submitted','Proof Submitted'],['paid','Paid & Verified']] as const).map(([value,label]) => (
                <button key={value} onClick={() => setPaymentDeskFilter(value)} className={`px-3 py-2 rounded-lg text-xs border ${paymentDeskFilter === value ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}>{label}</button>
              ))}
            </div>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">UTR Number</th>
                    <th className="pb-3">Screenshot Proof</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {paymentDeskOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-zinc-900/50">
                      <td className="py-3.5 font-mono text-amber-400 font-bold">{ord.id}</td>
                      <td className="py-3.5">
                        <div className="font-semibold text-white">{ord.customerName}</div>
                        <div className="text-[11px] text-zinc-500">{ord.whatsappNumber}</div>
                      </td>
                      <td className="py-3.5 font-bold text-zinc-100">₹{ord.finalPrice || ord.total}</td>
                      <td className="py-3.5 font-mono">
                        {ord.paymentDetails?.utrNumber ? (
                          <span className="bg-zinc-800 px-2 py-0.5 rounded text-amber-300 font-bold">
                            {ord.paymentDetails.utrNumber}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">Not Submitted</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {ord.paymentDetails?.screenshotUrl || ord.paymentDetails?.screenshotName ? (
                          <button
                            onClick={() => { if (ord.paymentDetails?.screenshotUrl) setPreviewScreenshotUrl(ord.paymentDetails.screenshotUrl); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700"
                          >
                            <FileImage className="w-3.5 h-3.5 text-amber-400" /> View Receipt
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-[11px] italic">Not Submitted</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {ord.status === 'cancelled' ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${ord.paymentStatus === 'paid' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                            {ord.paymentStatus === 'paid' ? 'Paid / Cancelled' : 'Cancelled'}
                          </span>
                        ) : ord.paymentStatus === 'paid' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified & Paid</span>
                        ) : hasSubmittedPaymentScreenshot(ord) ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Proof Submitted — Verify</span>
                        ) : ord.paymentStatus === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Payment Proof Not Submitted</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        {ord.paymentStatus !== 'paid' && ord.paymentStatus !== 'awaiting_quote' && ord.status !== 'cancelled' && !(ord.paymentGateway?.provider === 'razorpay' && ord.paymentGateway.status === 'created') && (
                          <button
                            onClick={() => handleConfirmPayment(ord.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors"
                          >
                            Manually Confirm ₹{ord.finalPrice || ord.total}
                          </button>
                        )}
                        {ord.paymentStatus === 'verification_pending' && (
                          <button
                            onClick={() => handleRejectPayment(ord.id)}
                            className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs border border-red-500/20 transition-colors"
                          >
                            Reject Proof
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= REFERRALS & CAMPORA CASH ADMIN ================= */}
        {activeAdminTab === 'referrals' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Referral Performance & CAMPORA Cash</h2>
              <p className="text-xs text-zinc-400 mt-1">Review referral activity, wallet balances and audited manual corrections.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Referral uses</div>
                <div className="text-2xl font-black text-white mt-1">{referralData.codes.reduce((sum, item) => sum + Number(item.usage_count || 0), 0)}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Successful referrals</div>
                <div className="text-2xl font-black text-emerald-300 mt-1">{referralData.uses.filter((item) => item.reward_status === 'credited').length}</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Outstanding CAMPORA Cash</div>
                <div className="text-2xl font-black text-amber-300 mt-1">₹{referralData.wallets.reduce((sum, item) => sum + Number(item.balance || 0), 0).toFixed(2)}</div>
              </div>
            </div>

            <section className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">Customer Referral Counts</h3>
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead><tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                  <th className="pb-3">Customer</th><th className="pb-3">Referral Code</th><th className="pb-3">Referrals Used</th><th className="pb-3">Successful</th><th className="pb-3 text-right">Correction</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {referralData.codes.map((item) => (
                    <tr key={item.code}>
                      <td className="py-3"><div className="font-semibold text-white">{item.referrerName}</div><div className="text-[10px] text-zinc-500">{item.referrer_id}</div></td>
                      <td className="py-3 font-mono text-amber-300">{item.code}</td>
                      <td className="py-3 text-white tabular-nums">{item.usage_count}/{item.max_usage}</td>
                      <td className="py-3 text-emerald-300">{referralData.uses.filter((use) => use.referrer_id === item.referrer_id && use.reward_status === 'credited').length}</td>
                      <td className="py-3 text-right"><button onClick={() => handleReferralUsageAdjustment(item.code, Number(item.usage_count || 0))} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200">Edit count</button></td>
                    </tr>
                  ))}
                  {referralData.codes.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-zinc-500">No referral codes have been generated yet.</td></tr>}
                </tbody>
              </table>
              <p className="text-[10px] text-zinc-500 mt-3">Corrections are restricted to 0–3 and cannot be lower than the number of recorded referral registrations. Every correction requires a reason and is written to the admin audit log.</p>
            </section>

            <section className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">Customer CAMPORA Cash Balances</h3>
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead><tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                  <th className="pb-3">Customer</th><th className="pb-3">Wallet Balance</th><th className="pb-3">Last Updated</th><th className="pb-3 text-right">Admin Action</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {referralData.wallets.map((item) => (
                    <tr key={item.customer_id}>
                      <td className="py-3 font-semibold text-white">{item.customerName}<div className="text-[10px] text-zinc-500">{item.customer_id}</div></td>
                      <td className="py-3 font-bold text-amber-300">₹{Number(item.balance || 0).toFixed(2)}</td>
                      <td className="py-3 text-zinc-500">{item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</td>
                      <td className="py-3 text-right"><button onClick={() => handleWalletAdjustment(item.customer_id)} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300">Adjust Cash</button></td>
                    </tr>
                  ))}
                  {referralData.wallets.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-zinc-500">No customer wallets have been initialized yet.</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
              <h3 className="text-sm font-bold text-white mb-3">Referral Count Audit History</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {referralData.audit.map((entry) => (
                  <div key={entry.id} className="border-b border-zinc-800/70 pb-2 text-xs">
                    <div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-amber-300">{entry.referral_code}</span><span className="text-zinc-400">{entry.old_usage_count} → {entry.new_usage_count} uses</span></div>
                    <div className="text-zinc-200 mt-1">{entry.reason}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{entry.admin_name} · {new Date(entry.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {referralData.audit.length === 0 && <p className="text-xs text-zinc-500">No referral-count corrections recorded.</p>}
              </div>
            </section>

            <section className="p-5 rounded-2xl bg-[#121215] border border-zinc-800">
              <h3 className="text-sm font-bold text-white mb-3">Recent Wallet Transactions</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {referralData.ledger.map((entry, index) => (
                  <div key={entry.id || `${entry.reference_key}-${index}`} className="flex items-start justify-between gap-3 border-b border-zinc-800/70 pb-2 text-xs">
                    <div><div className="text-zinc-200">{entry.customerName} — {entry.description}</div><div className="text-[10px] text-zinc-500">{new Date(entry.created_at).toLocaleString()} · {entry.entry_type}</div></div>
                    <span className={Number(entry.amount) >= 0 ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>{Number(entry.amount) >= 0 ? '+' : ''}₹{Number(entry.amount).toFixed(2)}</span>
                  </div>
                ))}
                {referralData.ledger.length === 0 && <p className="text-xs text-zinc-500">No wallet transactions recorded yet.</p>}
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 5: CUSTOMERS DIRECTORY ================= */}
        {activeAdminTab === 'customers' && (
          <div className="max-w-7xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Verified Student Client Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <div key={c.id || c.email} className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                      {c.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{c.name}</h3>
                      <p className="text-[11px] text-zinc-400">{c.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/80">
                    <div>
                      <div className="text-zinc-500 text-[10px]">Total Orders</div>
                      <div className="font-bold text-white">{c.ordersCount} Orders</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[10px]">Lifetime Spend</div>
                      <div className="font-bold text-amber-400">₹{c.totalSpend}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[10px]">Referrals Done</div>
                      <div className="font-bold text-white">{c.referralUsage || 0}/3</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[10px]">CAMPORA Cash Owned</div>
                      <div className="font-bold text-amber-300">₹{Number(c.walletBalance || 0).toFixed(2)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-zinc-500 text-[10px]">College</div>
                      <div className="text-zinc-300 font-medium truncate">{c.college || 'University Student'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 6: FILES REPOSITORY ================= */}
        {activeAdminTab === 'files' && (
          <div className="max-w-7xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Academic File Repository & Documents</h2>
            <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Order</th>
                    <th className="pb-3">File Name</th>
                    <th className="pb-3">Classification</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Uploaded At</th>
                    <th className="pb-3 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {files.map((f, i) => (
                    <tr key={f.id || i} className="hover:bg-zinc-900/50">
                      <td className="py-3 font-mono text-amber-400 font-bold">{f.orderId}</td>
                      <td className="py-3 font-medium text-white max-w-xs truncate">{f.name}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                          {f.type}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400">{f.size}</td>
                      <td className="py-3 text-zinc-500">{f.uploadedAt}</td>
                      <td className="py-3 text-right">
                        {(f.downloadUrl || f.previewUrl) ? (
                          <a
                            href={f.downloadUrl || f.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View / Download
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Legacy record — file not stored</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Screenshot Preview Modal */}
      {previewScreenshotUrl && (
        <ScreenshotPreviewModal
          screenshotUrl={previewScreenshotUrl}
          onClose={() => setPreviewScreenshotUrl(null)}
        />
      )}
    </div>
  );
};
