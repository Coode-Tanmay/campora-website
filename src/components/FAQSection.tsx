import React, { useState } from 'react';
import { FAQ_DATA } from '../data/mockData';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const whatsappNumber = '917559225529';

  return (
    <section id="faq-section" className="py-16 lg:py-24 bg-[#0B0B0B]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>GOT QUESTIONS?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            Frequently Asked Questions.
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            Everything you need to know about our turnarounds, privacy, quality, and revisions.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQ_DATA.map((faq, idx) => {
            const isOpen = openIdx === idx;

            return (
              <div
                key={idx}
                id={`faq-item-${idx}`}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-[#171717] border-[#D4A72C]/50 shadow-lg shadow-[#D4A72C]/5'
                    : 'bg-[#171717] border-[#2A2A2A] hover:border-[#D4A72C]/40'
                }`}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-bold text-sm sm:text-base text-white font-['Outfit',sans-serif]">
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'bg-[#D4A72C] text-[#0B0B0B] rotate-180' : 'bg-[#1D1D1D] text-[#858585]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#B8B8B8] leading-relaxed border-t border-[#2A2A2A] animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions banner */}
        <div className="mt-10 p-6 rounded-2xl bg-[#171717] border border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-bold text-white">Have a specific question not listed here?</div>
            <div className="text-xs text-[#858585] mt-0.5">Our academic team is online 6 AM – 12 AM on WhatsApp.</div>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi CAMPORA team, I have a question about your academic support services.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-[#1D1D1D] hover:bg-[#2A2A2A] text-white text-xs font-semibold flex items-center gap-2 border border-[#2A2A2A] hover:border-[#D4A72C]/50 transition-all whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 text-[#35C759]" />
            <span>Ask on WhatsApp</span>
          </a>
        </div>

      </div>
    </section>
  );
};
