import React, { useState } from 'react';
import { Send, FileSearch, Smartphone, Download, CheckCircle2, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onStartOrder: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartOrder }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: '01',
      title: 'Send Requirements',
      icon: Send,
      short: 'Share your brief, rubric, guidelines, or topic via our fast online form or direct WhatsApp chat.',
      details: 'Upload syllabus PDFs, draft slides, prompt sheets, or raw notes. Tell us your target deadline and preferred academic formatting style (IEEE, APA, Harvard).',
    },
    {
      number: '02',
      title: 'Get Your Quote',
      icon: FileSearch,
      short: 'Fixed-price services show their price upfront. Custom and urgent requests are reviewed and quoted before payment.',
      details: 'The order form shows the calculated price for eligible fixed-price services. If your request needs a custom quote, payment stays unavailable until the quote is approved.',
    },
    {
      number: '03',
      title: 'Make Payment',
      icon: Smartphone,
      short: 'After your order is approved, pay by UPI and submit your UTR number and payment receipt. Work begins after an administrator verifies the payment.',
      details: 'Once your order is saved, you receive a CAMPORA Order ID and can follow status updates in your customer dashboard.',
    },
    {
      number: '04',
      title: 'Receive Your Work',
      icon: Download,
      short: 'Access completed files from your dashboard when the order is marked delivered. File formats and revision options depend on the selected service.',
      details: 'Where included, deliverables are provided in editable formats such as .PPTX or .DOCX and/or PDF. Any included revision follows the scope agreed for the service.',
    },
  ];

  return (
    <section id="how-it-works-section" className="py-16 lg:py-24 bg-[#0B0B0B] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <span>THE PROCESS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            How It Works.
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            From your brief to final delivery in four clear steps.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            const isSelected = activeStep === idx;

            return (
              <div
                key={step.number}
                id={`how-step-${step.number}`}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isLast
                    ? 'bg-[#171717] border-2 border-[#D4A72C] shadow-lg shadow-[#D4A72C]/10'
                    : isSelected
                    ? 'bg-[#171717] border border-[#D4A72C]/70 shadow-md shadow-[#D4A72C]/5'
                    : 'bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50'
                }`}
              >
                {/* Step Top Bar */}
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] ${
                    isLast || isSelected ? 'text-[#D4A72C]' : 'text-[#858585]'
                  }`}>
                    {step.number}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isLast || isSelected
                      ? 'bg-[#D4A72C]/15 text-[#D4A72C] border border-[#D4A72C]/40'
                      : 'bg-[#1D1D1D] text-[#858585] border border-[#2A2A2A]'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Step Content */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                    {step.short}
                  </p>
                  
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-xs text-[#B8B8B8] leading-normal animate-fadeIn">
                      {step.details}
                    </div>
                  )}
                </div>

                {/* Bottom Highlight Indicator */}
                <div className="mt-6 pt-3 flex items-center justify-between text-[11px] font-semibold text-[#858585] border-t border-[#2A2A2A]">
                  <span>{isLast ? 'Files available in your dashboard' : `Step ${idx + 1} of 4`}</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isLast || isSelected ? 'text-[#D4A72C]' : 'text-[#858585]'}`} />
                </div>

                {isLast && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4A72C]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Prompt */}
        <div className="mt-12 text-center">
          <button
            id="how-it-works-start-btn"
            onClick={onStartOrder}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] shadow-lg shadow-[#D4A72C]/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>Start Your Order</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </section>
  );
};
