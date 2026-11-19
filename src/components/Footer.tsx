import React from 'react';
import { MessageCircle, Clock, ShieldCheck, Mail, Instagram, ArrowRight, FileText } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: string) => void;
  onOpenOrderModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, onOpenOrderModal }) => {
  const whatsappNumber = '917559225529';
  const defaultMsg = encodeURIComponent('Hi CAMPORA team, I would like to place an order.');

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#2A2A2A] text-[#858585] pb-20 sm:pb-12 pt-14 sm:pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#2A2A2A]">
          
          {/* Brand Col (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D4A72C] flex items-center justify-center text-[#0B0B0B] font-black text-base">
                C
              </div>
              <span className="font-black text-xl tracking-tight text-white font-['Outfit',sans-serif]">
                CAMPORA
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#B8B8B8] max-w-sm leading-relaxed">
              Turning Deadlines Into Done. Premium academic presentations, reports, research documentation, posters, and comprehensive internship assistance.
            </p>

            <div className="flex items-center gap-4 text-xs text-[#B8B8B8] pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D4A72C]" />
                <span>6 AM – 12 AM Support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" />
                <span>Private file access</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              {['home', 'services', 'how-it-works', 'portfolio', 'faq', 'contact'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => onSelectTab(item)}
                    className="hover:text-[#D4A72C] transition-colors capitalize text-left"
                  >
                    {item === 'services' ? 'Services & Pricing' : item === 'how-it-works' ? 'How It Works' : item === 'contact' ? 'Contact' : item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Offered */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Popular Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onSelectTab('services')} className="hover:text-[#D4A72C]">
                  Basic & Premium PPTs (₹250+)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('services')} className="hover:text-[#D4A72C]">
                  College & IEEE Reports (₹200)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('services')} className="hover:text-[#D4A72C]">
                  Complete Internship Pack (₹499)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('services')} className="hover:text-[#D4A72C]">
                  Academic Posters (₹250)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('services')} className="hover:text-[#D4A72C]">
                  Urgent 3-Hour PPT Delivery
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Direct Contact
            </h4>
            <div className="space-y-2.5 text-xs">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${defaultMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#B8B8B8] hover:text-[#35C759]"
              >
                <MessageCircle className="w-4 h-4 text-[#35C759]" />
                <span>+91 75592 25529</span>
              </a>

              <a
                href="https://instagram.com/campora_in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#B8B8B8] hover:text-[#F0D27A]"
              >
                <Instagram className="w-4 h-4 text-[#D4A72C]" />
                <span>@campora_in</span>
              </a>

              <a href="mailto:camporasupport@gmail.com" className="flex items-center gap-2 text-[#B8B8B8] hover:text-[#D4A72C] transition-colors">
                <Mail className="w-4 h-4 text-[#D4A72C]" />
                <span>camporasupport@gmail.com</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#858585] gap-4">
          <div>
            © {new Date().getFullYear()} CAMPORA. All rights reserved. Designed for student excellence.
          </div>
          <div className="flex items-center gap-6">
            <span>Academic Guidelines Compliant</span>
            <span>Clear scope • Student-first support • Secure file access</span>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0B]/95 backdrop-blur-lg border-t border-[#2A2A2A] px-4 py-2.5 sm:hidden flex items-center justify-between gap-3 shadow-2xl">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${defaultMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs font-semibold text-white flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-4 h-4 text-[#35C759]" />
          <span>WhatsApp</span>
        </a>

        <button
          onClick={onOpenOrderModal}
          className="flex-1 py-2.5 rounded-xl bg-[#D4A72C] text-[#0B0B0B] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:bg-[#E5B93F]"
        >
          <span>Order Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
