import React, { useState } from 'react';
import {
  X,
  Upload,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Info
} from 'lucide-react';
import { UPI_ID } from './UpiPaymentCard';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  serviceName?: string;
  onConfirm: (utrNumber: string, screenshotUrl: string, screenshotName: string) => void;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  amount,
  orderId,
  serviceName,
  onConfirm,
}) => {
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<{
    name: string;
    size: string;
    url: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];

      if (!validTypes.includes(file.type.toLowerCase())) {
        setErrorMsg('Invalid file format. Please upload a JPG, JPEG, or PNG screenshot.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10MB limit. Please upload a smaller screenshot.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setErrorMsg('Please enter your 12-digit UPI Transaction ID / UTR Number.');
      return;
    }

    if (cleanUtr.length < 6) {
      setErrorMsg('Transaction ID / UTR number seems too short. Please verify your banking receipt.');
      return;
    }

    if (!screenshotFile) {
      setErrorMsg('Please upload a screenshot of your successful UPI payment.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm(cleanUtr, screenshotFile.url, screenshotFile.name);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-white my-auto">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#111111]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4A72C] flex items-center justify-center text-[#0B0B0B] font-black text-sm">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                Confirm UPI Payment
              </h3>
              <p className="text-[11px] text-[#858585]">
                Order #{orderId} • ₹{amount}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1D1D1D] hover:bg-[#2A2A2A] text-[#858585] hover:text-white flex items-center justify-center border border-[#2A2A2A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Helper / Instruction Box */}
          <div className="p-3.5 rounded-2xl bg-[#111111] border border-[#2A2A2A] flex items-start gap-2.5 text-xs text-[#B8B8B8]">
            <Info className="w-4 h-4 text-[#D4A72C] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Please upload a screenshot of your successful payment and enter the UTR/Transaction ID so we can verify your payment.
            </p>
          </div>

          {/* Payment Summary Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs">
            <div>
              <span className="text-[#858585]">Transfer Target:</span>
              <span className="text-white font-mono ml-2">{UPI_ID}</span>
            </div>
            <div>
              <span className="text-[#858585]">Amount:</span>
              <span className="text-[#D4A72C] font-bold font-mono ml-2">₹{amount}</span>
            </div>
          </div>

          {/* Field 1: UPI Transaction ID / UTR Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white">
              UPI Transaction ID / UTR Number <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              id="input-utr-number"
              type="text"
              required
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. 423891002341 (12 digits)"
              className="w-full px-4 py-2.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs font-mono text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
            />
            <span className="text-[10px] text-[#858585] block">
              Found in your GPay / PhonePe / Paytm / Bank App transaction receipt.
            </span>
          </div>

          {/* Field 2: Payment Screenshot Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white">
              Payment Screenshot <span className="text-[#FF5A5F]">*</span>
            </label>

            {!screenshotFile ? (
              <label className="border-2 border-dashed border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-[#111111] hover:bg-[#1D1D1D] transition-all block">
                <Upload className="w-6 h-6 text-[#858585] mb-2" />
                <span className="text-xs font-semibold text-white">
                  Upload Payment Screenshot
                </span>
                <span className="text-[10px] text-[#858585] mt-0.5">
                  Accepted formats: JPG, JPEG, PNG (Max 10MB)
                </span>
                <input
                  id="input-screenshot-file"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            ) : (
              <div className="p-3 rounded-2xl bg-[#111111] border border-[#D4A72C]/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileImage className="w-4 h-4 text-[#D4A72C] flex-shrink-0" />
                    <span className="text-white font-medium truncate">{screenshotFile.name}</span>
                    <span className="text-[10px] text-[#858585] font-mono flex-shrink-0">({screenshotFile.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreenshotFile(null)}
                    className="p-1 text-[#858585] hover:text-[#FF5A5F] transition-colors"
                    title="Remove Screenshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnail Preview */}
                <div className="relative rounded-xl overflow-hidden border border-[#2A2A2A] max-h-36 flex items-center justify-center bg-black">
                  <img
                    src={screenshotFile.url}
                    alt="Uploaded payment proof"
                    className="w-full h-36 object-contain"
                  />
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/75 text-[10px] text-[#35C759] font-bold border border-[#35C759]/30">
                    Proof Attached ✓
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FF5A5F]/15 border border-[#FF5A5F]/40 text-[#FF5A5F] text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Admin Verification Security Notice */}
          <div className="p-3 rounded-xl bg-[#111111] border border-[#2A2A2A] text-[11px] text-[#858585] space-y-1">
            <span className="font-bold text-white block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
              <span>Manual Verification Rule</span>
            </span>
            <p>
              Your payment will enter <span className="text-[#F0D27A] font-semibold">Payment Verification Pending</span>. A CAMPORA admin will verify the transaction with the bank before updating to <span className="text-[#35C759] font-semibold">Payment Confirmed</span> and initiating work.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#1D1D1D] text-xs font-semibold text-[#B8B8B8] hover:text-white border border-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>

            <button
              id="submit-payment-proof-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-extrabold shadow-lg shadow-[#D4A72C]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Payment Details</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
