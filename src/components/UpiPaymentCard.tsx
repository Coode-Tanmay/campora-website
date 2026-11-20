import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { PaymentVerificationModal } from './PaymentVerificationModal';
import { CamporaOrder } from '../types';

interface UpiPaymentCardProps {
  amount: number;
  orderId?: string;
  serviceName?: string;
  order?: CamporaOrder;
  onPaymentSubmitted?: (utrNumber: string, screenshotUrl: string, screenshotName: string) => void | Promise<void>;
  compact?: boolean;
}

export const UPI_ID = 'tanmayvbhagat-1@oksbi';

export const UpiPaymentCard: React.FC<UpiPaymentCardProps> = ({
  amount,
  orderId,
  serviceName,
  order,
  onPaymentSubmitted,
  compact = false,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate UPI QR Code data URL dynamically
  useEffect(() => {
    const upiUri = amount > 0
      ? `upi://pay?pa=${UPI_ID}&pn=CAMPORA&am=${amount}&cu=INR&tn=${encodeURIComponent(orderId ? `CAMPORA Order ${orderId}` : 'CAMPORA Academic Service')}`
      : `upi://pay?pa=${UPI_ID}&pn=CAMPORA&cu=INR`;

    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0B0B0B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [amount, orderId]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  return (
    <>
      <div
        id="campora-upi-payment-card"
        className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4A72C]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="text-center space-y-1.5 pb-5 border-b border-[#2A2A2A]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A72C]/15 border border-[#D4A72C]/30 text-[#F0D27A] text-[11px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" />
            <span>UPI Payment • Manual Verification</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif] tracking-tight">
            Complete Your Payment
          </h3>

          <p className="text-xs sm:text-sm text-[#B8B8B8]">
            Pay securely using UPI.
          </p>
        </div>

        {/* Dynamic Amount Banner */}
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-[#111111] border border-[#D4A72C]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold block">
              Amount to Pay
            </span>
            {serviceName && (
              <span className="text-xs text-[#B8B8B8] truncate max-w-[280px] block">
                {serviceName} {orderId ? `(#${orderId})` : ''}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#D4A72C] font-['Outfit',sans-serif]">
              ₹{amount}
            </span>
            <span className="text-xs text-[#858585] font-mono">INR</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative group">
            {/* White/light background container for QR code as required */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border-2 border-[#D4A72C]/40 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Scan to Pay ₹${amount} via UPI to ${UPI_ID}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="w-8 h-8 border-2 border-[#D4A72C] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Subtle Brand Badge in Center or Below */}
            <div className="mt-2 text-center">
              <span className="text-[11px] text-[#D4A72C] font-bold tracking-wider font-mono">
                CAMPORA SECURE QR
              </span>
            </div>
          </div>

          <p className="text-xs font-medium text-white text-center">
            Scan the QR code using any UPI app
          </p>

          {/* Supported UPI Apps Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
            {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Any UPI App'].map((app) => (
              <span
                key={app}
                className="px-2.5 py-1 rounded-lg bg-[#111111] border border-[#2A2A2A] text-[10px] font-semibold text-[#B8B8B8]"
              >
                {app}
              </span>
            ))}
          </div>

          {/* "OR" Divider */}
          <div className="w-full flex items-center gap-3 my-2">
            <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
            <span className="text-xs font-bold text-[#858585] uppercase tracking-widest px-2">
              OR
            </span>
            <div className="flex-1 h-[1px] bg-[#2A2A2A]" />
          </div>

          {/* UPI ID Box */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs text-[#B8B8B8] px-1">
              <span className="font-semibold">UPI ID</span>
              <span className="text-[11px] text-[#858585]">State Bank of India</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#111111] border border-[#2A2A2A] shadow-inner">
              <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide select-all px-2 py-1 truncate">
                {UPI_ID}
              </span>

              <button
                id="copy-upi-id-btn"
                type="button"
                onClick={handleCopyUpi}
                className="px-4 py-2.5 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all border border-[#2A2A2A] hover:border-[#D4A72C]/50 flex-shrink-0"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-4 h-4 text-[#35C759]" />
                    <span className="text-[#35C759]">UPI ID Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#D4A72C]" />
                    <span>COPY UPI ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* "I'VE MADE THE PAYMENT" Action Section */}
          <div className="w-full pt-6 border-t border-[#2A2A2A] space-y-3">
            <div className="text-center">
              <span className="text-xs text-[#858585] block mb-2">
                Already paid?
              </span>

              <button
                id="btn-ive-made-payment"
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-sm font-extrabold transition-all shadow-xl shadow-[#D4A72C]/20 flex items-center justify-center gap-2"
              >
                <span>I'VE MADE THE PAYMENT</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Payment Verification Notice */}
            <div className="p-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] flex items-start gap-2.5 text-xs text-[#B8B8B8]">
              <Clock className="w-4 h-4 text-[#D4A72C] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">Payment verification:</strong> "We'll verify your payment before starting your order." Once you submit your screenshot and UTR number, CAMPORA admin will verify the receipt and begin crafting your deliverable immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation / Proof Upload Modal */}
      <PaymentVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={amount}
        orderId={orderId || order?.id || 'CMP-ORDER'}
        serviceName={serviceName || order?.serviceName || 'Academic Service'}
        onConfirm={async (utr, screenshotUrl, screenshotName) => {
          if (onPaymentSubmitted) {
            await onPaymentSubmitted(utr, screenshotUrl, screenshotName);
          }
          setIsModalOpen(false);
        }}
      />
    </>
  );
};
