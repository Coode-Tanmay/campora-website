import React, { useState } from 'react';
import { Gift, Copy, Check, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';

interface ReferralBannerProps {
  onApplyCode?: (code: string) => void;
}

export const ReferralBanner: React.FC<ReferralBannerProps> = ({ onApplyCode }) => {
  const [copied, setCopied] = useState(false);
  const referralCode = 'CAMPORA123';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    if (onApplyCode) {
      onApplyCode(referralCode);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappShareText = encodeURIComponent(
    `Hey! Use my code *${referralCode}* on CAMPORA to get ₹100 OFF on your PPTs, College Reports, or Internship support! Check them out: https://campora.in`
  );

  return (
    <section className="py-12 bg-[#0B0B0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#171717] border border-[#2A2A2A] p-8 sm:p-12 overflow-hidden shadow-2xl">
          
          {/* Subtle gold decorative background badge */}
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#D4A72C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A72C]/15 border border-[#D4A72C]/30 text-xs font-bold text-[#F0D27A]">
                <Gift className="w-3.5 h-3.5" />
                <span>STUDENT REWARDS PROGRAM</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-['Outfit',sans-serif] tracking-tight">
                REFER A FRIEND & GET <span className="text-[#D4A72C]">₹100 OFF</span>
              </h3>
              <p className="text-[#B8B8B8] text-sm sm:text-base max-w-lg leading-relaxed">
                Give ₹100 credit to your friends on their first academic order, and receive ₹100 discount coupon towards your next PPT or report.
              </p>
            </div>

            {/* Right Interactive Coupon Code Block */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-3 justify-end">
              
              {/* Code Box */}
              <div className="w-full sm:w-auto flex-1 flex items-center justify-between bg-[#111111] border border-[#2A2A2A] rounded-2xl p-2 pl-4 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#858585]">Discount Code</span>
                  <span className="font-mono text-base sm:text-lg font-black text-white tracking-widest">
                    {referralCode}
                  </span>
                </div>
                <button
                  id="copy-referral-code-btn"
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#35C759]" />
                      <span className="text-[#35C759]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#B8B8B8]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Share via WhatsApp Button */}
              <a
                id="share-referral-whatsapp-btn"
                href={`https://wa.me/?text=${whatsappShareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#1D1D1D] border border-[#2A2A2A] hover:border-[#D4A72C] text-white font-bold text-xs sm:text-sm shadow-md transition-all whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#35C759]" />
                <span>Share WhatsApp</span>
              </a>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
