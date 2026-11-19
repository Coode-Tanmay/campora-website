import React, { useState } from 'react';
import { PORTFOLIO_SAMPLES } from '../data/mockData';
import { PortfolioItem } from '../types';
import { Sparkles, Eye, Award, FileText, ArrowRight, ExternalLink, X } from 'lucide-react';

interface PortfolioSectionProps {
  onOrderSimilar: (category: string) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({ onOrderSimilar }) => {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [filter, setFilter] = useState('All');

  const categories = ['All', 'Presentations', 'Documentation', 'Design Services', 'Internship Support'];

  const filteredItems = PORTFOLIO_SAMPLES.filter(
    (item) => filter === 'All' || item.category === filter
  );

  return (
    <section id="portfolio-section" className="py-16 lg:py-24 bg-[#0B0B0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <span>SAMPLE WORK</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            Proven Academic Excellence.
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            Browse illustrative examples of the formats and design styles CAMPORA can create. These are sample concepts, not customer submissions.
          </p>

          {/* Filter Tabs */}
          <div className="mt-8 flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === cat
                    ? 'bg-[#D4A72C] text-[#0B0B0B] font-bold shadow-md shadow-[#D4A72C]/20'
                    : 'bg-[#171717] text-[#B8B8B8] border border-[#2A2A2A] hover:text-white hover:border-[#D4A72C]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/60 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative h-48 overflow-hidden bg-[#111111]">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                />
                
                {/* Overlay Badge */}
                <div className="absolute top-3 left-3 bg-[#111111]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[#F0D27A] border border-[#2A2A2A]">
                  {item.category}
                </div>

                <div className="absolute top-3 right-3 bg-[#35C759] text-[#0B0B0B] font-black text-[10px] px-2 py-0.5 rounded-full">
                  Sample concept
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent opacity-80" />
                
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white font-medium">
                  <FileText className="w-3.5 h-3.5 text-[#D4A72C]" />
                  <span>{item.pages}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-white group-hover:text-[#F0D27A] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[#B8B8B8] text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-[#2A2A2A]">
                  {item.tags.map((t, i) => (
                    <span key={i} className="text-[10px] font-mono text-[#858585] bg-[#111111] px-2 py-0.5 rounded-md border border-[#2A2A2A]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Portfolio Preview Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#171717] border border-[#2A2A2A] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fadeIn">
            <div className="relative h-64 sm:h-72 bg-[#111111] overflow-hidden">
              <img
                src={selectedItem.thumbnail}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#111111]/80 text-white flex items-center justify-center hover:bg-[#1D1D1D]"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-[#D4A72C] text-[#0B0B0B] font-bold text-xs">
                  Sample concept
                </span>
                <span className="px-3 py-1 rounded-full bg-[#171717]/90 text-white font-medium text-xs border border-[#2A2A2A]">
                  {selectedItem.pages}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <h3 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                {selectedItem.title}
              </h3>
              <p className="text-sm text-[#B8B8B8] leading-relaxed">
                {selectedItem.summary}
              </p>

              <div className="pt-4 flex items-center justify-between border-t border-[#2A2A2A]">
                <div className="flex gap-1.5">
                  {selectedItem.tags.map((t, i) => (
                    <span key={i} className="text-xs font-mono text-[#858585] bg-[#111111] px-2.5 py-1 rounded-lg border border-[#2A2A2A]">
                      {t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const cat = selectedItem.category;
                    setSelectedItem(null);
                    onOrderSimilar(cat);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <span>Order Similar Work</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
