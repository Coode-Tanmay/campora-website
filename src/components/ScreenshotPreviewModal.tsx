import React from 'react';
import { X, Download, ExternalLink, ShieldCheck } from 'lucide-react';

interface ScreenshotPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  utrNumber?: string;
  amount?: number;
  orderId?: string;
}

export const ScreenshotPreviewModal: React.FC<ScreenshotPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Payment_Receipt.png',
  utrNumber,
  amount,
  orderId,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-white my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#111111] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#D4A72C]" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-['Outfit',sans-serif]">
                UPI Payment Receipt
              </h3>
              <p className="text-[11px] text-[#858585]">
                {orderId ? `Order #${orderId} • ` : ''}{amount ? `₹${amount} • ` : ''}{imageName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1D1D1D] hover:bg-[#2A2A2A] text-[#858585] hover:text-white flex items-center justify-center border border-[#2A2A2A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#0B0B0B]">
          <div className="max-w-full rounded-2xl overflow-hidden border border-[#2A2A2A] bg-black p-2 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Payment Screenshot Preview"
              className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>

          {utrNumber && (
            <div className="mt-4 p-3 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs flex items-center justify-between w-full max-w-md">
              <span className="text-[#858585]">Submitted UTR / Transaction ID:</span>
              <span className="font-mono font-bold text-[#F0D27A] select-all">{utrNumber}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2A2A2A] bg-[#111111] flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs font-bold text-white border border-[#2A2A2A]"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
