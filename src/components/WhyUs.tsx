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
            Engineered specifically for university standards. We combine speed, meticulous academic formatting, and ironclad confidentiality.
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
                Same-day and next-day delivery available. Need it in 1–3 hours? Our urgent team delivers without cutting corners.
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
                Support available from 6 AM – 12 AM across WhatsApp. Quick replies, instant revisions, and direct human updates.
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
                Services designed specifically for college students. Budget-friendly pricing starting from ₹150 with zero hidden charges.
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
                Student files and information are handled privately. Your college details, topics, and personal data are never disclosed.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] text-xs font-semibold text-[#858585]">
              100% Private & Protected
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
                Clean, professional and submission-ready work. Crafted by experienced academic specialists with free revisions included.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between font-bold text-xs">
              <span className="text-[#B8B8B8]">Free revisions included</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4A72C] text-[#0B0B0B] text-[11px] font-bold">
                Guaranteed
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

