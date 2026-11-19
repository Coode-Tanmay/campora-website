import React from 'react';
import { Zap, Clock, GraduationCap, FileCheck2, Lock, Award, ArrowUpRight } from 'lucide-react';

export const WhyUs: React.FC = () => {
  return (
    <section id="why-us-section" className="py-16 lg:py-24 relative overflow-hidden bg-[#0B0B0B]">
      {/* Background soft glow */}
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[#D4A72C]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <span>WHY CAMPORA</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            The Premium Standard.
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            Practical support for student projects and documentation, with clear service scopes, defined turnaround options and private handling of order files.
          </p>
        </div>

        {/* Bento Grid Layout (6 feature cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          
          {/* Card 1: Fast Delivery */}
          <div
            id="why-card-fast-delivery"
            className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                ⚡ Fast Delivery
              </h3>
              <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                Standard and urgent turnaround options are available. Urgent requests are reviewed first, and the final timeline is confirmed with the quote.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center gap-2 text-xs font-semibold text-[#D4A72C]">
              <span>Urgent turnaround available</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Extended Support */}
          <div
            id="why-card-support"
            className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div className="absolute right-3 top-2 text-6xl font-black font-['Outfit',sans-serif] text-[#2A2A2A]/40 pointer-events-none select-none">
              18h
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                🕐 Extended Support
              </h3>
              <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                WhatsApp support is available from 6 AM – 12 AM for order questions and updates. Response times can vary with demand.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center gap-2 text-xs font-semibold text-[#35C759]">
              <span className="w-2 h-2 rounded-full bg-[#35C759] animate-pulse" />
              <span>6 AM – 12 AM Active</span>
            </div>
          </div>

          {/* Card 3: Student Focused */}
          <div
            id="why-card-student-focused"
            className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                🎯 Student Focused
              </h3>
              <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                Services are designed around common college requirements. Pricing starts at ₹150; custom and urgent work is quoted before payment.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-xs font-semibold text-[#858585]">
              Transparent upfront pricing
            </div>
          </div>

          {/* Card 4: College Template Support */}
          <div
            id="why-card-college-template"
            className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                📄 College Template Support
              </h3>
              <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                Upload your university-prescribed format and we'll follow it. Strict compliance with department slide masters and cover pages.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-xs font-semibold text-[#D4A72C]">
              Included with presentations & reports
            </div>
          </div>

          {/* Card 5: 100% Confidential */}
          <div
            id="why-card-confidential"
            className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#F0D27A] transition-colors">
                🔒 Confidential
              </h3>
              <p className="text-[#B8B8B8] text-xs sm:text-sm mt-2 leading-relaxed">
                Order files are stored privately. Access is limited to the customer account and authorized CAMPORA administrators for order handling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-xs font-semibold text-[#858585]">
              Private storage and signed file access
            </div>
          </div>

          {/* Card 6: Quality Work (Elevated Gold Border Highlight) */}
          <div
            id="why-card-quality-work"
            className="bg-[#171717] border-2 border-[#D4A72C] rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden text-white shadow-xl shadow-[#D4A72C]/10 group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#D4A72C]/15 border border-[#D4A72C]/30 flex items-center justify-center text-[#F0D27A] mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white font-['Outfit',sans-serif]">
                ✨ Quality Work
              </h3>
              <p className="text-[#B8B8B8] font-normal text-xs sm:text-sm mt-2 leading-relaxed">
                Work is prepared to the agreed brief and selected service. Any included revision and its scope are confirmed with the order.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between font-bold text-xs">
              <span className="text-[#B8B8B8]">Service-specific revisions</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1D1D1D] text-[#D4A72C] text-[11px] font-semibold border border-[#2A2A2A]">
                Clear process
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

