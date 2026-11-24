import React, { useMemo, useState } from 'react';
import { SERVICES_DATA } from '../data/mockData';
import { ServiceCategory, ServiceItem } from '../types';
import {
  ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness, Check, Clock, Code2,
  FileText, Flame, Globe, GraduationCap, Palette, Presentation, Search
} from 'lucide-react';

interface ServicesSectionProps {
  onSelectService: (serviceId: string) => void;
  onSelectCategory?: (category: string) => void;
}

type MainCategory = Exclude<ServiceCategory, 'all'>;

const CATEGORY_CARDS: Array<{
  id: MainCategory | 'website';
  title: string;
  description: string;
  icon: React.ElementType;
  countLabel: string;
}> = [
  { id: 'presentations', title: 'Presentations', description: 'Basic, Premium, Urgent and custom PowerPoint presentations.', icon: Presentation, countLabel: '4 options' },
  { id: 'documentation', title: 'Documents & Reports', description: 'College reports, assignments, lab manuals and research papers.', icon: FileText, countLabel: 'Document services' },
  { id: 'website', title: 'Website Development', description: 'Portfolio, business, e-commerce, educational and custom websites.', icon: Globe, countLabel: 'Build a website' },
  { id: 'development', title: 'Coding & Tech', description: 'Debugging, project support, APIs, databases and app UI/UX.', icon: Code2, countLabel: 'Technical services' },
  { id: 'design', title: 'Graphic Design', description: 'Posters, certificates, logos, UI/UX and infographics.', icon: Palette, countLabel: 'Design services' },
  { id: 'career', title: 'Career Services', description: 'Resumes, CV formatting, LinkedIn profiles and cover letters.', icon: BriefcaseBusiness, countLabel: 'Career documents' },
  { id: 'data', title: 'Data & Excel', description: 'Excel workbooks, dashboards, charts and data visualization.', icon: BarChart3, countLabel: 'Data services' },
  { id: 'internship', title: 'Internship Support', description: 'Genuine project guidance, documentation and viva preparation.', icon: GraduationCap, countLabel: 'Internship services' },
];

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService, onSelectCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState<MainCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCategoryInfo = CATEGORY_CARDS.find((category) => category.id === selectedCategory);
  const filteredServices = useMemo(() => SERVICES_DATA.filter((service) => {
    const matchesCategory = selectedCategory !== null && service.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || service.title.toLowerCase().includes(query)
      || service.description.toLowerCase().includes(query)
      || service.features.some((feature) => feature.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  }), [selectedCategory, searchQuery]);

  return (
    <section id="services-section" className="py-16 lg:py-24 relative bg-[#0B0B0B]">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#D4A72C]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <span>OUR SERVICES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            {selectedCategoryInfo ? selectedCategoryInfo.title : 'What Can We Help You With?'}
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            {selectedCategoryInfo?.description || 'Choose a service category to explore options, transparent starting prices and delivery details.'}
          </p>
        </div>

        {!selectedCategory ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORY_CARDS.map((category) => {
              const Icon = category.icon;
              const count = category.id === 'website'
                ? 6
                : SERVICES_DATA.filter((service) => service.category === category.id).length;
              return (
                <button
                  key={category.id}
                  id={`service-category-${category.id}`}
                  type="button"
                  onClick={() => category.id === 'website'
                    ? onSelectCategory?.('website')
                    : setSelectedCategory(category.id)}
                  className="group text-left p-5 sm:p-6 rounded-2xl bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/70 hover:bg-[#1B1B1B] transition-all min-h-[190px] flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#D4A72C]/10 border border-[#D4A72C]/20 text-[#D4A72C] flex items-center justify-center group-hover:bg-[#D4A72C] group-hover:text-black transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mt-5 group-hover:text-[#F0D27A]">{category.title}</h3>
                  <p className="text-xs text-[#A3A3A3] leading-relaxed mt-2 flex-1">{category.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A2A2A]">
                    <span className="text-[10px] text-[#D4A72C] font-semibold">{category.id === 'website' ? category.countLabel : `${count} services`}</span>
                    <ArrowRight className="w-4 h-4 text-[#D4A72C] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4A72C] hover:text-[#F0D27A]"
              >
                <ArrowLeft className="w-4 h-4" /> All service categories
              </button>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search within this category..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[#111111] border border-[#2A2A2A] text-xs text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                />
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-[#171717] border border-dashed border-[#2A2A2A] text-sm text-[#A3A3A3]">No services match this search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredServices.map((service: ServiceItem) => {
                  const isVariable = service.pricingType === 'variable';
                  return (
                    <article key={service.id} id={`service-card-${service.id}`} className="rounded-2xl p-6 bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50 transition-all flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#D4A72C] tracking-wider">{selectedCategoryInfo?.title}</span>
                          <h3 className="text-lg font-bold text-white mt-1">{service.title}</h3>
                        </div>
                        {service.isUrgent && <span className="text-[10px] font-bold text-red-300 bg-red-500/10 px-2 py-1 rounded-full flex items-center gap-1"><Flame className="w-3 h-3" /> URGENT</span>}
                      </div>
                      <div className="mt-4 pb-4 border-b border-[#2A2A2A]">
                        {isVariable && service.price === 0 ? (
                          <span className="text-2xl font-black text-white">Custom quote</span>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white"><span className="text-[#D4A72C]">{service.currency}</span>{service.price}{isVariable ? '+' : ''}</span>
                            <span className="text-xs text-[#B8B8B8]">/ {service.unit}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#B8B8B8]"><Clock className="w-3.5 h-3.5 text-[#D4A72C]" />{service.turnaround}</div>
                      <p className="mt-3 text-xs text-[#B8B8B8] leading-relaxed">{service.description}</p>
                      <div className="mt-5 space-y-2 flex-1">
                        {service.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2 text-xs text-[#B8B8B8]">
                            <Check className="w-3.5 h-3.5 text-[#D4A72C] shrink-0 mt-0.5" /><span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        id={`btn-order-${service.id}`}
                        type="button"
                        onClick={() => onSelectService(service.id)}
                        className="w-full mt-6 py-3 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        {isVariable ? 'Request Quote' : 'Order Now'} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
