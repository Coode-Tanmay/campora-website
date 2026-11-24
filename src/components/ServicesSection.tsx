import React, { useState } from 'react';
import { SERVICES_DATA } from '../data/mockData';
import { ServiceCategory, ServiceItem } from '../types';
import { Check, Sparkles, Clock, ArrowRight, MessageCircle, Info, ShieldCheck, Flame, Search, FileCheck2 } from 'lucide-react';

interface ServicesSectionProps {
  onSelectService: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: ServiceCategory; label: string }[] = [
    { id: 'all', label: 'All Services' },
    { id: 'presentations', label: 'Presentations (PPT)' },
    { id: 'documentation', label: 'Reports & Documentation' },
    { id: 'design', label: 'Design & Posters' },
    { id: 'internship', label: 'Internship Support' },
  ];

  const filteredServices = SERVICES_DATA.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const whatsappNumber = '917559225529';
  const quoteWhatsAppUrl = (serviceTitle = 'Custom academic project') => {
    const message = [
      'Hi CAMPORA Team! I would like to request a custom quote.',
      '',
      `Service / Requirement: ${serviceTitle}`,
      'My name:',
      'College / University:',
      'Topic / Project details:',
      'Pages / Slides (if applicable):',
      'Deadline:',
      'Reference files: I will attach them here.',
      'Budget (optional):',
      '',
      'Please review my requirements and share the estimated price and next steps. I understand this is a quote request, not a confirmed order.'
    ].join('\n');
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <section id="services-section" className="py-16 lg:py-24 relative bg-[#0B0B0B]">
      {/* Glow highlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#D4A72C]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171717] border border-[#D4A72C]/40 text-xs font-semibold text-[#F0D27A] mb-3">
            <span>OUR SERVICES & PRICING</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-['Outfit',sans-serif]">
            Transparent Pricing. Zero Hidden Fees.
          </h2>
          <p className="text-[#B8B8B8] text-sm sm:text-base mt-3">
            Academic documents, presentations, PDFs, design, coding support and digital services. Fixed prices are shown where available; custom-scope services receive a clear quote before payment.
          </p>

          {/* Pricing notification banner */}
          <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs text-[#B8B8B8] shadow-sm text-left">
            <Info className="w-4 h-4 text-[#D4A72C] flex-shrink-0" />
            <span>
              <strong>Smart Pricing:</strong> Some services are quote-first because price depends on file count, complexity and deadline. You will see the final price before making any payment.
            </span>
          </div>
        </div>

        {/* Category Filter Pills & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          {/* Categories */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4A72C] text-[#0B0B0B] shadow-md shadow-[#D4A72C]/20 font-bold'
                    : 'bg-[#171717] text-[#B8B8B8] border border-[#2A2A2A] hover:text-white hover:border-[#D4A72C]/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search service, topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-full bg-[#111111] border border-[#2A2A2A] text-xs text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const isPopular = service.popular;
            const isUrgent = service.isUrgent;
            const isVariable = service.pricingType === 'variable';

            return (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative group ${
                  isPopular
                    ? 'bg-[#171717] border-2 border-[#D4A72C] shadow-xl shadow-[#D4A72C]/10'
                    : isUrgent
                    ? 'bg-[#171717] border border-[#FF5A5F]/40 hover:border-[#FF5A5F]/70 shadow-lg shadow-[#FF5A5F]/10'
                    : 'bg-[#171717] border border-[#2A2A2A] hover:border-[#D4A72C]/50'
                }`}
              >
                {/* Popular or Urgent Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 right-6 bg-[#D4A72C] text-[#0B0B0B] font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-md">
                    {service.tag || 'MOST POPULAR'}
                  </div>
                )}

                {isUrgent && (
                  <div className="absolute -top-3.5 right-6 bg-[#FF5A5F] text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>{service.tag || 'URGENT 1-3 HRS'}</span>
                  </div>
                )}

                <div>
                  {/* Title & category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#D4A72C] tracking-wider">
                        {service.category}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1 group-hover:text-[#F0D27A] transition-colors">
                        {service.title}
                      </h3>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-4 pb-4 border-b border-[#2A2A2A] flex items-baseline gap-2">
                    {isVariable && service.price === 0 ? (
                      <span className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif]">
                        Contact for Pricing
                      </span>
                    ) : (
                      <>
                        <span className="text-3xl sm:text-4xl font-black text-white font-['Outfit',sans-serif]">
                          <span className="text-[#D4A72C]">{service.currency}</span>
                          {service.price}
                          {isVariable && <span className="text-lg text-[#D4A72C]">+</span>}
                        </span>
                        <span className="text-xs text-[#B8B8B8] font-medium">/ {service.unit}</span>
                      </>
                    )}
                  </div>

                  {/* Turnaround Badge & Template support indicator */}
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-[#B8B8B8]">
                      <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
                      <span>{service.turnaround}</span>
                    </div>
                    {service.supportsTemplate && (
                      <div className="flex items-center gap-1 text-[11px] text-[#F0D27A]">
                        <FileCheck2 className="w-3 h-3" />
                        <span>Template Ready</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features List */}
                  <div className="mt-5 space-y-2.5">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#B8B8B8]">
                        <div className="w-4 h-4 rounded-full bg-[#1D1D1D] border border-[#2A2A2A] flex items-center justify-center text-[#D4A72C] flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Order Action */}
                <div className="mt-8 pt-4 border-t border-[#2A2A2A]">
                  {isVariable ? (
                    <button
                      id={`btn-order-${service.id}`}
                      type="button"
                      onClick={() => onSelectService(service.id)}
                      className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        isPopular
                          ? 'bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] shadow-lg shadow-[#D4A72C]/20'
                          : isUrgent
                          ? 'bg-[#1D1D1D] text-[#FF5A5F] border border-[#FF5A5F]/40 hover:bg-[#FF5A5F] hover:text-white'
                          : 'bg-[#1D1D1D] text-white hover:bg-[#D4A72C] hover:text-[#0B0B0B] border border-[#2A2A2A]'
                      }`}
                    >
                      <span>Request Quote for {service.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      id={`btn-order-${service.id}`}
                      onClick={() => onSelectService(service.id)}
                      className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        isPopular
                          ? 'bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] shadow-lg shadow-[#D4A72C]/20'
                          : isUrgent
                          ? 'bg-[#1D1D1D] text-[#FF5A5F] border border-[#FF5A5F]/40 hover:bg-[#FF5A5F] hover:text-white'
                          : 'bg-[#1D1D1D] text-white hover:bg-[#D4A72C] hover:text-[#0B0B0B] border border-[#2A2A2A]'
                      }`}
                    >
                      <span>Order {service.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Project Callout Card */}
        <div className="mt-14 bg-[#171717] border border-[#2A2A2A] rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4A72C] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>CUSTOM SPECIFICATIONS</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif]">
              Need something custom or unique?
            </h3>
            <p className="text-[#B8B8B8] text-sm max-w-xl">
              Don’t see your exact requirement listed? We handle complex capstone documentation, IEEE papers, MATLAB/Python reports, and specialized design briefs tailored to your syllabus.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <a
              id="custom-quote-btn"
              href={quoteWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold text-[#0B0B0B] bg-[#D4A72C] hover:bg-[#E5B93F] transition-all shadow-md text-center"
            >
              Get a Custom Quote
            </a>
            <a
              id="custom-whatsapp-btn"
              href={quoteWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold text-[#B8B8B8] bg-[#1D1D1D] border border-[#2A2A2A] hover:text-white hover:border-[#D4A72C] transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#35C759]" />
              <span>WhatsApp CAMPORA</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

