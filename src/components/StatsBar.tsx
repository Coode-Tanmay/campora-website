import React from 'react';
import { FileText, Users, Star, Clock } from 'lucide-react';

export const StatsBar: React.FC = () => {
  const stats = [
    {
      id: 'stat-docs',
      value: '5,000+',
      label: 'DOCUMENTS DELIVERED',
      icon: FileText,
      highlight: false,
    },
    {
      id: 'stat-students',
      value: '2,500+',
      label: 'HAPPY STUDENTS',
      icon: Users,
      highlight: false,
    },
    {
      id: 'stat-rating',
      value: '4.9 ★',
      label: 'AVERAGE RATING',
      icon: Star,
      highlight: true,
    },
    {
      id: 'stat-support',
      value: '18h',
      label: 'DAILY SUPPORT (6AM - 12AM)',
      icon: Clock,
      highlight: false,
    },
  ];

  return (
    <section className="border-y border-[#2A2A2A] bg-[#0B0B0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                id={stat.id}
                className={`flex flex-col items-center text-center p-4 rounded-xl transition-all ${
                  stat.highlight ? 'bg-[#171717] border border-[#D4A72C]/30' : 'bg-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] mb-2.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#B8B8B8] tracking-wider mt-1 uppercase">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
