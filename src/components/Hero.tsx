import React from 'react';
import { ArrowRight, Clock, FileText, Presentation, Palette, MessageCircle } from 'lucide-react';

interface HeroProps {
  onExploreServices: () => void;
  onOrderNow: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreServices, onOrderNow }) => {
  return (
    <section className="campora-hero relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="campora-hero-grid">
          <div className="campora-hero-copy">
            <div className="campora-eyebrow"><span className="campora-eyebrow-dot" /> STUDENT WORK, HANDLED WITH CARE</div>
            <p className="campora-kicker">CAMPORA / ACADEMIC SUPPORT STUDIO</p>
            <h1 className="campora-display">Your next deadline<br /><em>starts here.</em></h1>
            <p className="campora-lede">
              Thoughtful presentations, clear reports and polished academic documents — made around your brief, your college format and your deadline.
            </p>
            <div className="campora-hero-actions">
              <button id="hero-order-now-btn" onClick={onOrderNow} className="campora-button-primary">
                Start an order <ArrowRight size={17} />
              </button>
              <button id="hero-explore-services-btn" onClick={onExploreServices} className="campora-button-secondary">
                Explore services
              </button>
            </div>
            <div className="campora-hero-meta">
              <span><Clock size={15} /> Support 6 AM – 12 AM</span>
              <span><MessageCircle size={15} /> Direct WhatsApp assistance</span>
            </div>
          </div>

          <div className="campora-hero-visual" aria-label="A workspace with academic documents and a laptop">
            <img
              className="campora-hero-photo"
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=85"
              alt="A calm, well-organised laptop workspace"
              fetchPriority="high"
            />
            <div className="campora-photo-shade" />
            <div className="campora-photo-caption">
              <span>THE CAMPORA APPROACH</span>
              <strong>Clear work. Calm process.</strong>
              <small>From the first brief to the final file.</small>
            </div>
            <div className="campora-service-index">
              <div><Presentation size={17} /><span>01</span><strong>Presentations</strong></div>
              <div><FileText size={17} /><span>02</span><strong>Reports & documents</strong></div>
              <div><Palette size={17} /><span>03</span><strong>Design & internship support</strong></div>
            </div>
            <span className="campora-visual-mark">C.</span>
          </div>
        </div>
        <div className="campora-hero-bottomline">
          <span>TURNING DEADLINES INTO DONE</span>
          <span>ACADEMIC SUPPORT / INDIA</span>
        </div>
      </div>
    </section>
  );
};
