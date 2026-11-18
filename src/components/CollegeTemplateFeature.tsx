import React from 'react';
import { FileCode, CheckCircle2, ArrowRight, Sparkles, Layers, ShieldCheck } from 'lucide-react';

interface CollegeTemplateFeatureProps {
  onUploadTemplate: () => void;
}

export const CollegeTemplateFeature: React.FC<CollegeTemplateFeatureProps> = ({ onUploadTemplate }) => {
  return (
    <section id="college-template-feature" className="py-16 bg-[#0B0B0B] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D4A72C]/5 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl bg-[#171717] border border-[#2A2A2A] p-8 sm:p-12 lg:p-14 shadow-2xl shadow-black/80 overflow-hidden">
          
          {/* Subtle watermark / pattern */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-80 h-80 bg-[#D4A72C]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4A72C]/15 border border-[#D4A72C]/30 text-xs font-bold text-[#F0D27A]">
                <FileCode className="w-3.5 h-3.5" />
                <span>OFFICIAL UNIVERSITY GUIDELINES</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-['Outfit',sans-serif] leading-[1.15]">
                YOUR COLLEGE HAS A TEMPLATE?
                <span className="block text-[#D4A72C] mt-1 font-bold">
                  We've got you covered.
                </span>
              </h2>

              <p className="text-[#B8B8B8] text-sm sm:text-base leading-relaxed max-w-xl">
                Upload your college/university format with your order and we'll follow the required format. From strict cover page crests and typography to IEEE columns, slide masters, and margin guidelines.
              </p>

              {/* Supported template pills */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-[#B8B8B8]">
                <span className="px-3 py-1 rounded-lg bg-[#1D1D1D] border border-[#2A2A2A] font-medium">
                  ✓ Official PPTX Masters
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#1D1D1D] border border-[#2A2A2A] font-medium">
                  ✓ IEEE / APA Reports
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#1D1D1D] border border-[#2A2A2A] font-medium">
                  ✓ Department Cover Sheets
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#1D1D1D] border border-[#2A2A2A] font-medium">
                  ✓ No Template Fee
                </span>
              </div>

              {/* Action Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  id="btn-upload-college-template"
                  onClick={onUploadTemplate}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] shadow-xl shadow-[#D4A72C]/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Upload Your Template</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div className="text-xs text-[#858585] font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#35C759]" />
                  <span>Accepted: .PDF, .DOCX, .PPTX, .PNG</span>
                </div>
              </div>
            </div>

            {/* Right Visual: Interactive Mockup Comparison / Template Preview */}
            <div className="lg:col-span-5 relative">
              <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-2xl space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#D4A72C]" />
                    <span className="text-xs font-bold text-white font-mono">Template Match Protocol</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#35C759]/15 text-[#35C759] border border-[#35C759]/30">
                    100% Compliant
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#D4A72C]/15 border border-[#D4A72C]/30 flex items-center justify-center text-[#D4A72C] font-bold text-xs">
                        PPT
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">University PPT Master</div>
                        <div className="text-[10px] text-[#858585]">Header logo, font hierarchy, footer index</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[#35C759]" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        DOC
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Project Report Format</div>
                        <div className="text-[10px] text-[#858585]">Certificate page, declaration, TOC layout</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[#35C759]" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#171717] border border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#35C759]/15 border border-[#35C759]/30 flex items-center justify-center text-[#35C759] font-bold text-xs">
                        PDF
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">IEEE Two-Column Standard</div>
                        <div className="text-[10px] text-[#858585]">Abstract, equations, citations & references</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[#35C759]" />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-[11px] text-[#B8B8B8] text-center font-medium">
                  Additional charges may apply for highly complex formatting or custom LaTeX requirements.
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
