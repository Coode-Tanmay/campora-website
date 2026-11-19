import React from 'react';
import { FileText, GraduationCap, Clock, Palette } from 'lucide-react';

export const StatsBar: React.FC = () => {
  const highlights = [
    { id: 'stat-presentations', value: 'Presentations', label: 'PPT DESIGN & FORMATTING', icon: FileText },
    { id: 'stat-documentation', value: 'Documentation', label: 'REPORTS & WORD FILES', icon: GraduationCap },
    { id: 'stat-design', value: 'Creative Design', label: 'POSTERS & CERTIFICATES', icon: Palette },
    { id: 'stat-support', value: '6 AM – 12 AM', label: 'DAILY SUPPORT WINDOW', icon: Clock },
  ];

  return (
    <section className="border-y border-[#2A2A2A] bg-[#0B0B0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} id={item.id} className="flex items-center justify-center gap-3 py-2">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C]">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight">{item.value}</div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-[#858585] tracking-wider mt-1">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
