import React from 'react';
import { ArrowRight, Sparkles, Clock, Zap, Shield, MessageCircle, CheckCircle2, FileCheck, Award } from 'lucide-react';

interface HeroProps {
  onExploreServices: () => void;
  onOrderNow: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreServices, onOrderNow }) => {
  return (
    <section className="relative pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#D4A72C]/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-[#D4A72C]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Top Micro-Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-[#D4A72C]/40 shadow-sm text-xs font-semibold text-[#F0D27A]">
              <span className="w-2 h-2 rounded-full bg-[#D4A72C] animate-ping" />
              <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
              <span>6 AM – 12 AM SUPPORT</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] font-['Outfit',sans-serif]">
              Your College Work.{' '}
              <span className="block mt-1 gold-gradient-text">
                Done.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#B8B8B8] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              PPTs, reports, posters, academic documentation and internship support — fast, professional and hassle-free. Focus on what matters, we handle the rest.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                id="hero-order-now-btn"
                onClick={onOrderNow}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] shadow-xl shadow-[#D4A72C]/20 transition-all transform hover:-translate-y-0.5"
              >
                <span>Order Now</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                id="hero-explore-services-btn"
                onClick={onExploreServices}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-transparent hover:bg-[#1D1D1D] border border-[#2A2A2A] hover:border-[#D4A72C] transition-all"
              >
                <span>Explore Services</span>
              </button>
            </div>

            {/* 4 Trust Indicators Grid */}
            <div className="pt-6 border-t border-[#2A2A2A] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Fast Delivery</div>
                  <div className="text-[11px] text-[#858585]">From 3 hrs</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Quality Work</div>
                  <div className="text-[11px] text-[#858585]">100% Original</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Confidential</div>
                  <div className="text-[11px] text-[#858585]">Safe & Private</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#35C759]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">WhatsApp</div>
                  <div className="text-[11px] text-[#858585]">6 AM – 12 AM</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: 3D Layered Presentation & Report Mockup Card */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            
            {/* Visual Container with subtle perspective */}
            <div className="w-full max-w-md relative">
              
              {/* Back Card (Underlying Report File) */}
              <div className="absolute -top-4 -left-3 right-5 h-full bg-[#111111] border border-[#2A2A2A] rounded-2xl transform -rotate-3 p-5 shadow-2xl opacity-60 pointer-events-none">
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                  <div className="w-24 h-3 bg-[#2A2A2A] rounded-full" />
                  <div className="w-12 h-3 bg-[#1D1D1D] rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="w-full h-2 bg-[#1D1D1D] rounded" />
                  <div className="w-3/4 h-2 bg-[#1D1D1D] rounded" />
                </div>
              </div>

              {/* Main Presentation Card */}
              <div className="relative bg-[#171717] border border-[#2A2A2A] rounded-2xl p-6 shadow-2xl shadow-black/80 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                
                {/* Header of the mock slide */}
                <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5A5F]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#F0B429]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#35C759]/80" />
                    <span className="ml-2 text-xs font-mono text-[#B8B8B8]">presentation_v2.pptx</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#35C759]/15 text-[#35C759] border border-[#35C759]/30">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>

                {/* Mock Presentation Slide Body */}
                <div className="mt-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#D4A72C] tracking-wider">Slide 04 of 18</span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        Edge AI & Neural Network Optimization
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C]">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Visual charts simulation */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-[#111111] border border-[#2A2A2A] rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-[#858585]">Structure</div>
                      <div className="text-sm font-extrabold text-[#35C759] mt-0.5">Visual</div>
                      <div className="w-full bg-[#2A2A2A] h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-[#35C759] h-full w-3/4" />
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-[#2A2A2A] rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-[#858585]">Readability</div>
                      <div className="text-sm font-extrabold text-[#D4A72C] mt-0.5">Clear</div>
                      <div className="w-full bg-[#2A2A2A] h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-[#D4A72C] h-full w-4/5" />
                      </div>
                    </div>
                    <div className="bg-[#111111] border border-[#2A2A2A] rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-[#858585]">Formatting</div>
                      <div className="text-sm font-extrabold text-[#F0D27A] mt-0.5">Academic</div>
                      <div className="w-full bg-[#2A2A2A] h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-[#F0D27A] h-full w-11/12" />
                      </div>
                    </div>
                  </div>

                  {/* Bullet Points Preview */}
                  <div className="bg-[#111111] rounded-xl p-3 border border-[#2A2A2A] space-y-2 text-xs text-[#B8B8B8]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A72C]" />
                      <span>Clear hierarchy and consistent visual language</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A72C]" />
                      <span>Readable charts, diagrams and academic structure</span>
                    </div>
                  </div>

                  {/* Card bottom bar */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[#858585]">
                    <span className="flex items-center gap-1.5 text-[#B8B8B8]">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4A72C]" /> Crafted by Senior Academic Designer
                    </span>
                    <span className="font-mono text-[11px] text-[#858585]">Sample layout</span>
                  </div>

                </div>

              </div>

              {/* Floating review badge */}
              <div className="absolute -bottom-5 -right-4 bg-[#171717] border border-[#2A2A2A] rounded-xl p-3 shadow-xl flex items-center gap-3 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-[#D4A72C]/15 border border-[#D4A72C]/30 flex items-center justify-center font-bold text-[#F0D27A] text-sm">
                  4.9★
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Illustrative Layout</div>
                  <div className="text-[10px] text-[#858585]">Sample preview • Not client work</div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
