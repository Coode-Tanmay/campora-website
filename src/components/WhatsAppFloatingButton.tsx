import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';

export const WhatsAppFloatingButton: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(true);
  const whatsappNumber = '917559225529';
  const defaultMsg = encodeURIComponent('Hi CAMPORA team, I need help with my college assignment/presentation. Can I get a quote?');

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Tooltip bubble */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2 bg-[#171717]/95 border border-[#D4A72C]/50 text-white text-xs font-medium px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#35C759] animate-pulse" />
          <span>Online now! 6 AM – 12 AM Support</span>
          <button
            onClick={() => setShowTooltip(false)}
            className="text-[#858585] hover:text-white ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Button */}
      <a
        id="floating-whatsapp-btn"
        href={`https://wa.me/${whatsappNumber}?text=${defaultMsg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-13 h-13 rounded-full bg-[#35C759] hover:bg-[#2EB84E] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-black/60 border-2 border-white/20 transition-transform group"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-7 h-7 fill-white/20" />
      </a>
    </div>
  );
};
