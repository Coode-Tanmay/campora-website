import React, { useState } from 'react';
import { CheckCircle2, Globe, ShoppingCart, CreditCard, LayoutDashboard, Database, Search, CalendarDays, Send, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CamporaOrder } from '../types';

interface BuildWebsiteSectionProps {
  onRequireLogin: () => void;
  onSubmitted: (order: CamporaOrder) => void;
}

const WEBSITE_TYPES = ['Personal portfolio', 'Business website', 'E-commerce store', 'Educational / LMS website', 'Custom website'];
const WEBSITE_PACKAGES = [
  { id: 'portfolio', title: 'Personal Portfolio', price: '₹1,999', description: 'Up to 3 pages, projects, skills and contact section.' },
  { id: 'starter', title: 'Starter Website', price: '₹2,499', description: 'Up to 3 responsive pages and a contact section; provider subdomain.' },
  { id: 'business', title: 'Business Website', price: '₹5,999', description: 'Up to 5 pages, contact form and basic SEO; custom domain setup.' },
  { id: 'ecommerce', title: 'E-commerce Website', price: '₹9,999', description: 'Product catalogue, cart and order management; payment integration quoted separately.' },
  { id: 'education', title: 'Educational / LMS', price: '₹7,999', description: 'Course pages, student login and a basic learning dashboard.' },
  { id: 'custom', title: 'Custom Website', price: 'Custom quote', description: 'A tailored build priced after requirements review.' },
];
const MAINTENANCE_OPTIONS = [
  { id: 'none', label: 'No maintenance required', price: 'Included in no ongoing plan' },
  { id: 'one-time-update', label: 'One-time minor update', price: '₹199 onwards' },
  { id: 'one-time-bugfix', label: 'One-time bug fixing', price: '₹299 onwards' },
  { id: 'basic-monthly', label: 'Basic monthly maintenance', price: '₹499/month' },
  { id: 'standard-monthly', label: 'Standard monthly maintenance', price: '₹999/month' },
  { id: 'premium-monthly', label: 'Premium monthly maintenance', price: '₹1,999/month' },
];
const FEATURES = [
  { id: 'payment', label: 'Payment gateway', icon: CreditCard },
  { id: 'admin', label: 'Admin dashboard', icon: LayoutDashboard },
  { id: 'database', label: 'Database and login system', icon: Database },
  { id: 'seo', label: 'SEO setup', icon: Search },
  { id: 'booking', label: 'Booking or appointment system', icon: CalendarDays },
];

export const BuildWebsiteSection: React.FC<BuildWebsiteSectionProps> = ({ onRequireLogin, onSubmitted }) => {
  const { user, isCustomer } = useAuth();
  const [packageType, setPackageType] = useState<'portfolio' | 'starter' | 'business' | 'ecommerce' | 'education' | 'custom'>('business');
  const [maintenanceOnly, setMaintenanceOnly] = useState(false);
  const [maintenancePlan, setMaintenancePlan] = useState('none');
  const [existingWebsiteUrl, setExistingWebsiteUrl] = useState('');
  const [websiteType, setWebsiteType] = useState('Business website');
  const [features, setFeatures] = useState<string[]>(['payment', 'admin']);
  const [pages, setPages] = useState('Home, About, Services, Contact');
  const [designReference, setDesignReference] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [extraRequirements, setExtraRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleFeature = (id: string) => setFeatures((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]);

  const submitQuote = async () => {
    setError('');
    if (!isCustomer || !user) { onRequireLogin(); return; }
    if (!businessName.trim() || !description.trim() || !whatsapp.trim() || (maintenanceOnly && !existingWebsiteUrl.trim())) { setError(maintenanceOnly ? 'Please enter your project name, WhatsApp number, existing website URL and maintenance requirements.' : 'Please enter your business/project name, WhatsApp number and website description.'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const summary = [
        'CAMPORA WEBSITE DEVELOPMENT QUOTE',
        `Request type: ${maintenanceOnly ? 'Maintenance for an existing website' : 'New website build'},\nPackage: ${maintenanceOnly ? 'Not applicable — maintenance only' : WEBSITE_PACKAGES.find((item) => item.id === packageType)?.title || packageType},\nPackage starting price: ${maintenanceOnly ? 'Not applicable' : WEBSITE_PACKAGES.find((item) => item.id === packageType)?.price || 'Custom quote'},\nMaintenance selection: ${MAINTENANCE_OPTIONS.find((item) => item.id === maintenancePlan)?.label || 'Not selected'} (${MAINTENANCE_OPTIONS.find((item) => item.id === maintenancePlan)?.price || 'To be quoted'}),\nExisting website: ${existingWebsiteUrl.trim() || 'New website'}`,
        `Website type: ${websiteType}`,
        `Business / project name: ${businessName.trim()}`,
        `Requested pages: ${pages.trim() || 'To be discussed'}`,
        `Additional features: ${features.length ? FEATURES.filter((item) => features.includes(item.id)).map((item) => item.label).join(', ') : 'None selected'}`,
        `Design reference: ${designReference.trim() || 'Not provided'}`,
        `Description: ${description.trim()}`,
        `Budget: ${budget.trim() || 'To be discussed'}`,
        `Expected timeline: ${deadline.trim() || 'Flexible / to be discussed'}`,
        `Other requirements: ${extraRequirements.trim() || 'None'}`,
        'Pricing: Admin quotation required. No payment collected in this request.',
      ].join('\n');
      const now = new Date().toISOString();
      const result = await api.createOrder({
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        whatsappNumber: whatsapp.trim(),
        college: user.college || 'Not provided',
        serviceId: 'website-development',
        serviceName: maintenanceOnly ? 'Website Maintenance' : 'Website Development',
        pricingType: 'variable',
        topic: `${websiteType} — ${businessName.trim()}`.slice(0, 300),
        pagesOrSlides: 1,
        deadline: 'To be confirmed',
        instructions: summary,
        hasCollegeTemplate: false,
        referenceFiles: [],
        subtotal: 0,
        finalPrice: 0,
        discount: 0,
        total: 0,
        quoteStatus: 'pending',
        paymentStatus: 'awaiting_quote',
        status: 'requirements_review',
        requiresReview: true,
        progressPercent: 10,
        createdAt: now,
        updatedAt: now,
        estimatedDelivery: 'To be confirmed',
        timeline: [
          { id: 't1', title: 'Website Quote Requested', description: 'Website configuration submitted to CAMPORA.', timestamp: now, status: 'completed' },
          { id: 't2', title: 'Requirements & Pricing Review', description: 'CAMPORA will discuss the scope and prepare a custom quotation on WhatsApp.', timestamp: now, status: 'current' },
          { id: 't3', title: 'Payment', description: 'Payment becomes available only after the quotation is approved and priced.', status: 'pending' },
        ],
        deliverables: [],
      });
      onSubmitted(result.order);
      const message = [
        'Hi CAMPORA Team! I have submitted a Website Development quote request through the CAMPORA website.',
        `Request ID: ${result.order.id}`,
        '',
        summary,
        '',
        'Please review my requirements and discuss the final scope, price and yearly running costs with me. I understand this is only a quote request, not a confirmed paid order.',
      ].join('\n');
      window.location.href = `https://wa.me/917559225529?text=${encodeURIComponent(message)}`;
    } catch (err: any) {
      setError(err.message || 'Could not submit your website quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="build-website" className="min-h-[70vh] bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D4A72C]/30 bg-[#D4A72C]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F0D27A]"><Globe className="w-3.5 h-3.5"/> CAMPORA Website Studio</span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-white">Build a Website <span className="text-[#D4A72C]">Your Way.</span></h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">Choose the website you need. Tell us your requirements and our team will prepare a custom quotation.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#141416] p-5 mb-6">
          <label className="flex items-center gap-3 text-sm font-semibold text-white cursor-pointer">
            <input type="checkbox" checked={maintenanceOnly} onChange={(event) => setMaintenanceOnly(event.target.checked)} className="accent-amber-500 w-4 h-4" />
            I only need maintenance for an existing website
          </label>
          {maintenanceOnly ? (
            <div className="mt-4">
              <label className="block text-xs text-zinc-300 mb-1.5">Existing website URL *</label>
              <input value={existingWebsiteUrl} onChange={(event) => setExistingWebsiteUrl(event.target.value)} maxLength={500} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="https://yourwebsite.com" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {WEBSITE_PACKAGES.map((item) => (
                <button key={item.id} type="button" onClick={() => setPackageType(item.id as typeof packageType)} className={`text-left rounded-xl p-4 border transition-all ${packageType === item.id ? 'border-[#D4A72C] bg-[#D4A72C]/10' : 'border-zinc-800 bg-[#101012] hover:border-zinc-600'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-white">{item.title}</span>{packageType === item.id && <CheckCircle2 className="w-4 h-4 text-[#D4A72C]" />}</div>
                  <div className="text-lg font-black text-[#F0D27A] mt-2">{item.price}</div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#141416] p-5 sm:p-7 space-y-7">
          <div>
            <h2 className="text-lg font-bold text-white">Website Management & Maintenance (Optional)</h2>
            <p className="text-xs text-zinc-500 mt-1">Maintenance is charged separately from website creation. Monthly plans are renewed manually; no automatic billing is used.</p>
            <select value={maintenancePlan} onChange={(event) => setMaintenancePlan(event.target.value)} className="mt-3 w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]">
              {MAINTENANCE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.price}</option>)}
            </select>
            <p className="text-[10px] text-zinc-500 mt-2">Domain, hosting and paid third-party services remain separate. CAMPORA will confirm the exact maintenance scope and renewal period before payment.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">1. Choose Website Type</h2>
            <p className="text-xs text-zinc-500 mt-1">Select the closest match. You can explain a custom requirement below.</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {WEBSITE_TYPES.map((item) => <button key={item} type="button" onClick={() => setWebsiteType(item)} className={`rounded-xl px-4 py-3 text-left text-xs font-semibold border transition-all ${websiteType === item ? 'border-[#D4A72C] bg-[#D4A72C]/10 text-[#F0D27A]' : 'border-zinc-800 bg-[#101012] text-zinc-300 hover:border-zinc-600'}`}>{item}</button>)}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">2. Additional Features</h2>
            <p className="text-xs text-zinc-500 mt-1">Choose any features you need. You can request more features in the notes.</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {FEATURES.map(({id,label,icon:Icon}) => <button key={id} type="button" onClick={() => toggleFeature(id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left border transition-all ${features.includes(id) ? 'border-[#D4A72C]/70 bg-[#D4A72C]/10 text-[#F0D27A]' : 'border-zinc-800 bg-[#101012] text-zinc-300 hover:border-zinc-600'}`}><span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center"><Icon className="w-4 h-4"/></span><span className="text-xs font-semibold flex-1">{label}</span>{features.includes(id) && <CheckCircle2 className="w-4 h-4 text-[#D4A72C]"/>}</button>)}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-zinc-300 mb-1.5">WhatsApp Number *</label><input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} maxLength={30} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Your WhatsApp number"/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">Business / Project Name *</label><input value={businessName} onChange={(e)=>setBusinessName(e.target.value)} maxLength={100} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="e.g. ABC Academy"/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">Pages Needed</label><input value={pages} onChange={(e)=>setPages(e.target.value)} maxLength={300} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Home, About, Contact..."/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">Design Reference (optional)</label><input value={designReference} onChange={(e)=>setDesignReference(e.target.value)} maxLength={500} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Website link or style reference"/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">Budget (optional)</label><input value={budget} onChange={(e)=>setBudget(e.target.value)} maxLength={100} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Your approximate budget"/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">Expected Timeline</label><input value={deadline} onChange={(e)=>setDeadline(e.target.value)} maxLength={100} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="e.g. Within 2 weeks"/></div>
            <div><label className="block text-xs text-zinc-300 mb-1.5">What does the website need to do? *</label><input value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={2000} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Describe the purpose and main functionality"/></div>
          </div>
          <div><label className="block text-xs text-zinc-300 mb-1.5">Other Requirements / More Options</label><textarea value={extraRequirements} onChange={(e)=>setExtraRequirements(e.target.value)} maxLength={5000} rows={4} className="w-full rounded-xl bg-[#101012] border border-zinc-800 px-3 py-3 text-sm text-white outline-none focus:border-[#D4A72C]" placeholder="Add any other pages, integrations, animations, user roles, delivery expectations, maintenance needs, or special functionality..."/></div>

          <div className="rounded-xl border border-[#D4A72C]/30 bg-[#D4A72C]/5 p-4">
            <h3 className="font-bold text-white text-sm">Your Selected Configuration</h3>
            <p className="text-xs text-zinc-300 mt-2">{maintenanceOnly ? 'Maintenance-only request' : (WEBSITE_PACKAGES.find((item) => item.id === packageType)?.title || packageType)}</p>
            <p className="text-xs text-zinc-300 mt-1">{websiteType} · {features.length} additional feature{features.length === 1 ? '' : 's'} selected</p>
            <p className="text-xs text-zinc-300 mt-1">Maintenance: {MAINTENANCE_OPTIONS.find((item) => item.id === maintenancePlan)?.label} · {MAINTENANCE_OPTIONS.find((item) => item.id === maintenancePlan)?.price}</p>
            <p className="text-sm font-bold text-[#F0D27A] mt-2">Final price: Admin quotation after reviewing requirements.</p>
            <p className="text-[11px] text-zinc-400 mt-2">Domain, hosting, database, email and payment-provider charges (if any) are separate third-party costs. We will explain recurring charges before you approve the quotation.</p>
          </div>

          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <button type="button" onClick={submitQuote} disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] disabled:opacity-60 text-black font-bold text-sm py-4">{submitting ? 'Submitting quote request…' : 'Send Website Quote Request'} <ArrowRight className="w-4 h-4"/></button>
          <p className="text-center text-[10px] text-zinc-500">No payment or QR checkout at this stage. Your request is saved first; WhatsApp opens next so you can discuss the scope with CAMPORA.</p>
        </div>
      </div>
    </section>
  );
};
