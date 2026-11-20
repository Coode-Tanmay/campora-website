import React, { useState } from 'react';
import { CamporaOrder } from '../types';
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  AlertCircle,
  User,
  ArrowRight,
  ExternalLink,
  FileCode,
  FileCheck2,
  CreditCard,
  Layers,
  Paperclip,
  CheckCheck,
  QrCode,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { UpiPaymentCard, UPI_ID } from './UpiPaymentCard';
import { PaymentVerificationModal } from './PaymentVerificationModal';
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal';
import { api } from '../services/api';

interface OrderTrackingViewProps {
  orders: CamporaOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  onOpenNewOrderModal: () => void;
  onUpdateOrderStatus?: (orderId: string, updates: Partial<CamporaOrder>) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  onOpenNewOrderModal,
  onUpdateOrderStatus,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'review' | 'completed'>('all');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('CAMPORA100');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyOrderId = () => {
    if (activeOrder) {
      navigator.clipboard.writeText(activeOrder.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePaymentSubmitted = async (utrNumber: string, screenshotUrl: string, screenshotName: string) => {
    if (!activeOrder) {
      throw new Error('Select an order before submitting payment proof.');
    }

    // Persist payment proof on the server before updating the customer UI.
    const response = await api.submitPaymentProof(activeOrder.id, {
      utrNumber,
      screenshotUrl,
      screenshotName,
    });

    onUpdateOrderStatus?.(activeOrder.id, response.order);
  };

  const filteredOrders = orders.filter((ord) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'active') return ord.status === 'in_progress' || ord.status === 'review';
    if (filterTab === 'review') return ord.paymentStatus === 'verification_pending' || ord.status === 'requirements_review' || ord.status === 'quote_sent' || ord.status === 'payment_pending';
    if (filterTab === 'completed') return ord.status === 'completed';
    return true;
  });

  const whatsappNumber = '917559225529';
  const whatsappMsg = activeOrder
    ? encodeURIComponent(`Hi CAMPORA Support, I am checking on my active order *#${activeOrder.id}* (${activeOrder.serviceName} - "${activeOrder.topic}"). Could you please provide a status update?`)
    : encodeURIComponent('Hi CAMPORA team, I have a question regarding my order.');

  const getStatusBadge = (order: CamporaOrder) => {
    if (order.status === 'completed') {
      return { label: 'Completed', color: 'bg-[#35C759]/15 border-[#35C759]/30 text-[#35C759]' };
    }
    if (order.paymentStatus === 'verification_pending') {
      return { label: 'Payment Verification Pending', color: 'bg-[#F0B429]/15 border-[#F0B429]/40 text-[#F0D27A]' };
    }
    if (order.paymentStatus === 'paid' || order.status === 'payment_confirmed') {
      return { label: 'Payment Confirmed ✓', color: 'bg-[#35C759]/15 border-[#35C759]/30 text-[#35C759]' };
    }
    if (order.status === 'in_progress') {
      return { label: 'Work In Progress', color: 'bg-[#D4A72C]/15 border-[#D4A72C]/40 text-[#F0D27A]' };
    }
    if (order.status === 'review') {
      return { label: 'Quality & Plagiarism Check', color: 'bg-[#1D1D1D] border-[#2A2A2A] text-[#B8B8B8]' };
    }
    if (order.status === 'quote_sent') {
      return { label: 'Quote Sent • Payment Pending', color: 'bg-[#F0B429]/15 border-[#F0B429]/30 text-[#F0B429]' };
    }
    if (order.status === 'requirements_review') {
      return { label: 'Under Scope Review', color: 'bg-[#1D1D1D] border-[#D4A72C]/40 text-[#F0D27A]' };
    }
    if (order.paymentStatus === 'pending' || order.status === 'payment_pending') {
      return { label: 'Payment Pending', color: 'bg-[#FF5A5F]/15 border-[#FF5A5F]/30 text-[#FF5A5F]' };
    }
    return { label: order.status.replace(/_/g, ' '), color: 'bg-[#171717] border-[#2A2A2A] text-[#B8B8B8]' };
  };

  const payableAmount = activeOrder ? (activeOrder.finalPrice || activeOrder.total) : 0;
  const isPaymentPending = activeOrder && (activeOrder.paymentStatus === 'pending' || activeOrder.status === 'payment_pending' || activeOrder.status === 'quote_sent');
  const isVerificationPending = activeOrder && activeOrder.paymentStatus === 'verification_pending';
  const isPaymentConfirmed = activeOrder && activeOrder.paymentStatus === 'paid';
  const isPaymentRejected = activeOrder && activeOrder.paymentStatus === 'rejected';

  return (
    <section id="student-tracking-dashboard" className="py-10 lg:py-16 bg-[#0B0B0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Student Profile & Actions Bar */}
        <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A72C] p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full bg-[#111111] rounded-[14px] flex items-center justify-center text-[#D4A72C] font-black text-lg">
                AC
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                  {activeOrder?.customerName || 'Alex Carter'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#D4A72C]/20 border border-[#D4A72C]/40 text-[#F0D27A] text-[10px] font-bold">
                  CAMPORA STUDENT
                </span>
              </div>
              <p className="text-xs text-[#B8B8B8] mt-0.5 flex items-center gap-1.5">
                <span>{activeOrder?.college || 'Vellore Institute of Technology'}</span>
                <span>•</span>
                <span>{activeOrder?.whatsappNumber || '+91 75592 25529'}</span>
              </p>
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-new-order-btn"
              onClick={onOpenNewOrderModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold transition-all shadow-md shadow-[#D4A72C]/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Order</span>
            </button>
            <a
              id="dashboard-whatsapp-support-btn"
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-white text-xs font-semibold border border-[#2A2A2A] hover:border-[#D4A72C]/40 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#35C759]" />
              <span>WhatsApp Desk (6 AM – 12 AM)</span>
            </a>
          </div>
        </div>

        {/* Main Grid: Active Order Status & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Main Column: Active Order Details & Timeline */}
          <div className="lg:col-span-8 space-y-6">
            
            {activeOrder ? (
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                
                {/* Active Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#2A2A2A] gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-[#D4A72C] bg-[#111111] px-2.5 py-1 rounded-lg border border-[#D4A72C]/30">
                        #{activeOrder.id}
                      </span>
                      <button
                        onClick={handleCopyOrderId}
                        className="text-[#858585] hover:text-white p-1 text-xs flex items-center gap-1"
                        title="Copy Order ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-[#35C759]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit',sans-serif] mt-2">
                      {activeOrder.serviceName}
                    </h3>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Topic: <span className="text-white font-medium">{activeOrder.topic}</span> ({activeOrder.pagesOrSlides} Pages/Slides)
                    </p>
                  </div>

                  {/* Status Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {(() => {
                      const badge = getStatusBadge(activeOrder);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${badge.color}`}>
                          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                    <span className="text-[11px] text-[#858585] font-mono">
                      Target: {activeOrder.estimatedDelivery}
                    </span>
                  </div>
                </div>

                {/* 1. UPI PAYMENT PENDING SECTION (Dynamic Amount, QR, UTR submission) */}
                {isPaymentPending && (
                  <div className="space-y-4">
                    <UpiPaymentCard
                      amount={payableAmount}
                      orderId={activeOrder.id}
                      serviceName={activeOrder.serviceName}
                      order={activeOrder}
                      onPaymentSubmitted={handlePaymentSubmitted}
                    />
                  </div>
                )}

                {/* 2. PAYMENT VERIFICATION PENDING BANNER */}
                {isVerificationPending && (
                  <div className="p-5 sm:p-6 rounded-3xl bg-[#1D1D1D] border-2 border-[#D4A72C]/40 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A2A2A]">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[#D4A72C]/15 border border-[#D4A72C]/30 flex items-center justify-center text-[#D4A72C]">
                          <Clock className="w-5 h-5 animate-spin" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#F0D27A] uppercase tracking-wider block">
                            Payment Verification Pending
                          </span>
                          <span className="text-sm font-bold text-white">
                            Amount Submitted: ₹{payableAmount}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] text-[#858585] font-mono">
                        Submitted: {activeOrder.paymentDetails?.submittedAt || 'Today'}
                      </span>
                    </div>

                    <div className="text-xs text-[#B8B8B8] leading-relaxed space-y-2">
                      <p>
                        We have received your payment proof for Order <strong className="text-white">#{activeOrder.id}</strong>. Our operations desk is manually checking the UTR reference with our bank account.
                      </p>
                      
                      <div className="p-3 rounded-xl bg-[#111111] border border-[#2A2A2A] flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[#858585]">UTR / Transaction ID:</span>
                          <span className="font-mono font-bold text-white ml-2">
                            {activeOrder.paymentDetails?.utrNumber || 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeOrder.paymentDetails?.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewScreenshotUrl(activeOrder.paymentDetails?.screenshotUrl || null)}
                              className="px-3 py-1.5 rounded-lg bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs text-white font-semibold flex items-center gap-1.5 border border-[#2A2A2A] hover:border-[#D4A72C]/40 transition-colors"
                            >
                              <FileImage className="w-3.5 h-3.5 text-[#D4A72C]" />
                              <span>View Screenshot</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setIsVerificationModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs text-[#F0D27A] font-semibold flex items-center gap-1.5 border border-[#2A2A2A] hover:border-[#D4A72C]/40 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Update UTR / Proof</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#858585] italic">
                        * Work will begin immediately once verified by CAMPORA Admin.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. PAYMENT CONFIRMED NOTICE */}
                {isPaymentConfirmed && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#35C759]/10 border border-[#35C759]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-[#35C759]/20 flex items-center justify-center text-[#35C759] flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-[#35C759] block">
                          Payment Confirmed ✓ (₹{payableAmount})
                        </span>
                        <span className="text-[#858585] text-[11px]">
                          Verified by CAMPORA Admin {activeOrder.paymentDetails?.utrNumber ? `• UTR: ${activeOrder.paymentDetails.utrNumber}` : ''}
                        </span>
                      </div>
                    </div>

                    {activeOrder.paymentDetails?.screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewScreenshotUrl(activeOrder.paymentDetails?.screenshotUrl || null)}
                        className="px-3 py-1.5 rounded-xl bg-[#111111] hover:bg-[#1D1D1D] text-xs text-white font-medium flex items-center gap-1.5 border border-[#2A2A2A] transition-colors"
                      >
                        <FileImage className="w-3.5 h-3.5 text-[#35C759]" />
                        <span>View Receipt</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 4. PAYMENT REJECTED NOTICE */}
                {isPaymentRejected && (
                  <div className="p-5 rounded-2xl bg-[#FF5A5F]/15 border border-[#FF5A5F]/40 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-[#FF5A5F] font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Payment Verification Issue</span>
                    </div>
                    <p className="text-[#B8B8B8]">
                      {activeOrder.paymentDetails?.rejectionReason || 'We could not verify your UTR reference in our bank records. Please double check your UTR number or upload a clearer payment screenshot.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>Re-Submit Payment Proof</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                )}

                {/* Scope Review Notice */}
                {activeOrder.status === 'requirements_review' && !isVerificationPending && !isPaymentPending && (
                  <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#F0D27A] flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-[#B8B8B8] space-y-1">
                      <div className="font-bold text-white">Order Under Academic Scope Review</div>
                      <p>
                        Our senior academic team is evaluating your project prompt and university template. You will receive quote confirmation via WhatsApp shortly.
                      </p>
                    </div>
                  </div>
                )}

                {/* College / University Template Attached Showcase */}
                {activeOrder.hasCollegeTemplate && (
                  <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#D4A72C]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F0D27A] flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-[#D4A72C]" />
                        <span>Official University Template Locked</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#F0D27A] border border-[#2A2A2A]">
                        Strict Adherence
                      </span>
                    </div>

                    {activeOrder.collegeTemplateFile && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-4 h-4 text-[#D4A72C] flex-shrink-0" />
                          <span className="text-white font-medium truncate">
                            {activeOrder.collegeTemplateFile.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#858585] font-mono">
                          {activeOrder.collegeTemplateFile.size}
                        </span>
                      </div>
                    )}

                    {activeOrder.templateInstructions && (
                      <p className="text-[11px] text-[#B8B8B8] italic">
                        "{activeOrder.templateInstructions}"
                      </p>
                    )}
                  </div>
                )}

                {/* Reference Files */}
                {activeOrder.referenceFiles && activeOrder.referenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#858585] flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Reference Materials ({activeOrder.referenceFiles.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeOrder.referenceFiles.map((rf) => (
                        <div
                          key={rf.id}
                          className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-[#B8B8B8] flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#858585]" />
                          <span className="truncate max-w-[180px]">{rf.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestone Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#B8B8B8]">Milestone Progress</span>
                    <span className="font-mono font-bold text-[#D4A72C]">{activeOrder.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#111111] rounded-full overflow-hidden border border-[#2A2A2A]">
                    <div
                      className="h-full bg-[#D4A72C] rounded-full transition-all duration-500"
                      style={{ width: `${activeOrder.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Timeline Steps */}
                <div className="space-y-6 pt-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Live Tracking Milestones
                  </h4>

                  <div className="space-y-4">
                    {activeOrder.timeline.map((step, idx) => {
                      const isCompleted = step.status === 'completed';
                      const isCurrent = step.status === 'current';

                      return (
                        <div key={step.id || idx} className="flex items-start gap-4 relative">
                          {idx !== activeOrder.timeline.length - 1 && (
                            <div
                              className={`absolute left-[15px] top-8 bottom-[-16px] w-[2px] ${
                                isCompleted ? 'bg-[#D4A72C]' : 'bg-[#2A2A2A]'
                              }`}
                            />
                          )}

                          {/* Step Icon */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            isCompleted
                              ? 'bg-[#D4A72C] text-[#0B0B0B] shadow-md shadow-[#D4A72C]/30 font-bold'
                              : isCurrent
                              ? 'bg-[#171717] border-2 border-[#D4A72C] text-[#D4A72C] ring-4 ring-[#D4A72C]/20'
                              : 'bg-[#111111] border border-[#2A2A2A] text-[#858585]'
                          }`}>
                            {isCompleted ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-xs font-bold">{idx + 1}</span>
                            )}
                          </div>

                          {/* Step Text Info */}
                          <div className="flex-1 pb-2">
                            <div className="flex items-center justify-between">
                              <h5 className={`text-sm font-bold ${
                                isCompleted ? 'text-white' : isCurrent ? 'text-[#F0D27A]' : 'text-[#858585]'
                              }`}>
                                {step.title}
                              </h5>
                              {step.timestamp && (
                                <span className="text-[11px] font-mono text-[#858585]">
                                  {step.timestamp}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#B8B8B8] mt-1 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deliverables Download Area */}
                {activeOrder.deliverables && activeOrder.deliverables.length > 0 && (
                  <div className="pt-6 border-t border-[#2A2A2A] space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D4A72C]" />
                      <span>Ready Deliverables & Source Files</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeOrder.deliverables.map((deliv, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111111] border border-[#2A2A2A] hover:border-[#D4A72C]/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-[#D4A72C] flex-shrink-0 border border-[#2A2A2A]">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-semibold text-white truncate">
                                {deliv.title}
                              </div>
                              <div className="text-[10px] text-[#858585] font-mono">
                                {deliv.fileType} • {deliv.fileSize}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => alert(`Downloading final deliverable: ${deliv.title}`)}
                            className="p-2 rounded-xl bg-[#1D1D1D] hover:bg-[#D4A72C] hover:text-[#0B0B0B] text-[#B8B8B8] transition-colors border border-[#2A2A2A]"
                            title="Download Deliverable"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-12 text-center space-y-4">
                <FileText className="w-12 h-12 text-[#858585] mx-auto" />
                <h3 className="text-lg font-bold text-white">No orders matching filter</h3>
                <p className="text-xs text-[#B8B8B8] max-w-sm mx-auto">
                  Submit a new academic brief to start real-time milestone tracking.
                </p>
                <button
                  onClick={onOpenNewOrderModal}
                  className="px-6 py-2.5 rounded-full bg-[#D4A72C] text-[#0B0B0B] text-xs font-bold"
                >
                  Create Order Now
                </button>
              </div>
            )}

          </div>

          {/* Right Sidebar: Referral Rewards & Filterable Orders List */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Referral Rewards Card */}
            <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4A72C] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>REFERRAL REWARDS</span>
              </div>

              <h4 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
                Invite friends, get ₹100 off
              </h4>

              <p className="text-xs text-[#B8B8B8] leading-relaxed">
                Give your college friends ₹100 off their first order (min ₹250). When they order with your code, you also receive ₹100 in discount credits.
              </p>

              {/* Promo Code Box */}
              <div className="flex items-center justify-between p-2.5 pl-4 rounded-2xl bg-[#111111] border border-[#2A2A2A] shadow-inner">
                <span className="font-mono text-sm font-black text-white tracking-wider">
                  CAMPORA100
                </span>
                <button
                  id="dashboard-copy-code-btn"
                  onClick={handleCopyReferral}
                  className="px-3 py-1.5 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs font-bold text-white flex items-center gap-1 transition-colors border border-[#2A2A2A]"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#35C759]" /> : <Copy className="w-3.5 h-3.5 text-[#858585]" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Order History List Card */}
            <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                <h4 className="font-bold text-sm text-white">Your Orders</h4>
                <span className="text-xs text-[#858585] font-mono">{orders.length} Total</span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111111] border border-[#2A2A2A] text-[11px]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterTab === 'all' ? 'bg-[#D4A72C] text-[#0B0B0B] font-bold' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setFilterTab('active')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterTab === 'active' ? 'bg-[#D4A72C] text-[#0B0B0B] font-bold' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterTab('review')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterTab === 'review' ? 'bg-[#D4A72C] text-[#0B0B0B] font-bold' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  Review
                </button>
                <button
                  onClick={() => setFilterTab('completed')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterTab === 'completed' ? 'bg-[#D4A72C] text-[#0B0B0B] font-bold' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  Done
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredOrders.map((ord) => {
                  const isSelected = ord.id === activeOrder?.id;
                  const badge = getStatusBadge(ord);

                  return (
                    <div
                      key={ord.id}
                      onClick={() => onSelectOrder(ord.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1D1D1D] border-[#D4A72C] shadow-md shadow-[#D4A72C]/10'
                          : 'bg-[#111111] border-[#2A2A2A] hover:border-[#D4A72C]/40 hover:bg-[#1D1D1D]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#D4A72C]">
                          #{ord.id}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white mt-1 truncate">
                        {ord.serviceName}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#858585] mt-2">
                        <span>{ord.createdAt}</span>
                        <span className="font-mono text-[#F0D27A] font-bold">₹{ord.finalPrice || ord.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Payment Verification Modal */}
      {activeOrder && (
        <PaymentVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          amount={payableAmount}
          orderId={activeOrder.id}
          serviceName={activeOrder.serviceName}
          onConfirm={async (utr, url, name) => {
            await handlePaymentSubmitted(utr, url, name);
            setIsVerificationModalOpen(false);
          }}
        />
      )}

      {/* Screenshot Preview Lightbox Modal */}
      <ScreenshotPreviewModal
        isOpen={!!previewScreenshotUrl}
        onClose={() => setPreviewScreenshotUrl(null)}
        imageUrl={previewScreenshotUrl || ''}
        imageName={activeOrder?.paymentDetails?.screenshotName || 'Payment_Proof.png'}
        utrNumber={activeOrder?.paymentDetails?.utrNumber}
        amount={payableAmount}
        orderId={activeOrder?.id}
      />

    </section>
  );
};
