import React from 'react';
import { FileUp, CheckCircle, Sparkles, ArrowRight, ShieldCheck, FileText, Layers, Check } from 'lucide-react';

interface CollegeTemplateSectionProps {
  onUploadTemplate: () => void;
}

export const CollegeTemplateSection: React.FC<CollegeTemplateSectionProps> = ({ onUploadTemplate }) => {
  return (
    <section className="py-14 sm:py-20 relative overflow-hidden bg-[#0B0B0B]">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[300px] bg-[#D4A72C]/5 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl relative overflow-hidden">
          
          {/* Subtle gold watermark badge in background */}
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#D4A72C]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4A72C]/15 border border-[#D4A72C]/30 text-xs font-bold text-[#F0D27A]">
                <FileUp className="w-3.5 h-3.5" />
                <span>UNIVERSITY FORMAT COMPLIANCE</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-['Outfit',sans-serif] tracking-tight">
                  YOUR COLLEGE HAS A TEMPLATE?
                </h2>
                <h3 className="text-xl sm:text-2xl font-bold gold-gradient-text">
                  We've got you covered.
                </h3>
              </div>

              <p className="text-[#B8B8B8] text-sm sm:text-base max-w-xl leading-relaxed">
                Upload your college/university format with your order and we'll follow the required format. From department slide masters to official margins, font hierarchies, cover pages, and citation guidelines.
              </p>

              {/* Key Template Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#B8B8B8]">
                  <div className="w-5 h-5 rounded-full bg-[#35C759]/15 text-[#35C759] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>PPTX Slide Masters & Color Themes</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#B8B8B8]">
                  <div className="w-5 h-5 rounded-full bg-[#35C759]/15 text-[#35C759] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Official Cover Pages & Crests</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#B8B8B8]">
                  <div className="w-5 h-5 rounded-full bg-[#35C759]/15 text-[#35C759] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>IEEE, APA, & Harvard Standard Margins</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#B8B8B8]">
                  <div className="w-5 h-5 rounded-full bg-[#35C759]/15 text-[#35C759] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>100% Submission-Ready Formatting</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  id="template-section-upload-btn"
                  onClick={onUploadTemplate}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] shadow-xl shadow-[#D4A72C]/20 transition-all transform hover:-translate-y-0.5"
                >
                  <FileUp className="w-4 h-4 text-[#0B0B0B]" />
                  <span>Upload Your Template</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <span className="text-xs text-[#858585]">
                  Supports .PDF, .DOCX, .PPTX, .PNG, .JPG
                </span>
              </div>
            </div>

            {/* Right Interactive Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#D4A72C]/15 border border-[#D4A72C]/30 flex items-center justify-center text-[#D4A72C]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">University Format Upload</div>
                      <div className="text-[10px] text-[#858585]">Separate from reference notes</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#35C759]/15 text-[#35C759] text-[10px] font-bold">
                    INCLUDED
                  </span>
                </div>

                {/* Simulated File Chip */}
                <div className="bg-[#171717] border border-dashed border-[#D4A72C]/60 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1D1D1D] flex items-center justify-center text-[#D4A72C] flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-semibold text-white truncate">
                      College_Seminar_Template_2026.pptx
                    </div>
                    <div className="text-[10px] text-[#858585] font-mono">
                      Official Format • Ready to apply
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#35C759] flex-shrink-0" />
                </div>

                {/* Simulated Custom Note */}
                <div className="bg-[#171717] rounded-xl p-3 border border-[#2A2A2A] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#D4A72C]">
                    Custom Template Instructions:
                  </span>
                  <p className="text-xs text-[#B8B8B8] italic">
                    "Use official college header font, right-align department logo, and apply 1.5 line spacing."
                  </p>
                </div>

                <div className="text-[11px] text-[#858585] flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#35C759]" />
                  <span>Strict compliance with your college evaluation rubric</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
