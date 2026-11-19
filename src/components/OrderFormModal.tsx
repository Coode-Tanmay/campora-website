import React, { useState, useEffect } from 'react';
import { SERVICES_DATA } from '../data/mockData';
import { CamporaOrder, OrderAttachment, PricingType, OrderStatus, QuoteStatus, PaymentStatus } from '../types';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  Tag,
  Clock,
  Building,
  User,
  Phone,
  HelpCircle,
  CreditCard,
  QrCode,
  AlertCircle,
  FileUp,
  Info,
  Check,
  Layers,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: string;
  initialTemplateMode?: boolean;
  onOrderCreated: (newOrder: CamporaOrder) => Promise<CamporaOrder>;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  initialServiceId,
  initialTemplateMode = false,
  onOrderCreated,
}) => {
  // 8 Steps:
  // 1: Select Service
  // 2: Student Details
  // 3: Work Details
  // 4: College Template Support
  // 5: Reference Material
  // 6: Order Review
  // 7: Price Calculation
  // 8: Payment & Confirmation
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Service Selection
  const [serviceId, setServiceId] = useState(initialServiceId || 'premium-ppt');

  // Step 2: Student Details
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [college, setCollege] = useState('');

  // Step 3: Work Details
  const [topic, setTopic] = useState('');
  const [pagesOrSlides, setPagesOrSlides] = useState<number>(1);
  const [deadline, setDeadline] = useState('Standard (24-48 hrs)');
  const [requirements, setRequirements] = useState(
    ''
  );

  // Step 4: College/University Template Support
  const [hasCollegeTemplate, setHasCollegeTemplate] = useState<boolean>(initialTemplateMode);
  const [collegeTemplateFile, setCollegeTemplateFile] = useState<OrderAttachment | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState('');

  // Step 5: Reference Material (Separate from template)
  const [referenceFiles, setReferenceFiles] = useState<OrderAttachment[]>([]);

  // Step 7 & 8: Pricing & Payment
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'whatsapp'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompletedSuccess, setOrderCompletedSuccess] = useState(false);
  const [createdOrderSummary, setCreatedOrderSummary] = useState<CamporaOrder | null>(null);

  // Validation Error Message
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    if (initialServiceId) {
      setServiceId(initialServiceId);
    }
  }, [initialServiceId]);

  useEffect(() => {
    if (initialTemplateMode) {
      setHasCollegeTemplate(true);
    }
  }, [initialTemplateMode]);

  if (!isOpen) return null;

  const currentService = SERVICES_DATA.find((s) => s.id === serviceId) || SERVICES_DATA[1];
  const isVariableService = currentService.pricingType === 'variable';
  const isOverLimit = pagesOrSlides > 20;
  const requiresAdminReview = isVariableService || isOverLimit;

  // Dynamic Base Price calculation
  let calculatedSubtotal = currentService.price;
  if (currentService.id === 'urgent-ppt') {
    calculatedSubtotal = 400;
  } else if (currentService.id === 'online-assistance') {
    calculatedSubtotal = 0;
  }

  // Calculate total with discount
  const finalTotal = isVariableService && currentService.price === 0
    ? 0
    : Math.max(0, calculatedSubtotal - appliedDiscount);

  const stepTitles = [
    '1. Select Service',
    '2. Student Details',
    '3. Work Details',
    '4. College Template',
    '5. Reference Files',
    '6. Order Review',
    '7. Price & Review',
    '8. Payment',
  ];

  const isPackageOrder = currentService.id === 'internship-package' || currentService.title.toLowerCase().includes('internship package') || currentService.price === 499;

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');

    // Package discount restriction rule
    if (isPackageOrder) {
      setCouponError('This package is not eligible for discount codes.');
      setAppliedDiscount(0);
      return;
    }

    const cleanCode = couponCode.trim().toUpperCase();
    if (cleanCode === 'CAMPORA100' || cleanCode === 'CAMPORA123') {
      if (calculatedSubtotal < 250 && calculatedSubtotal > 0) {
        setCouponError('Minimum order value of ₹250 required to apply this coupon.');
        return;
      }
      setAppliedDiscount(100);
      setCouponSuccess(`Code ${cleanCode} applied! ₹100 discount added.`);
    } else if (cleanCode === 'ALEX20CMP') {
      if (calculatedSubtotal < 250 && calculatedSubtotal > 0) {
        setCouponError('Minimum order value of ₹250 required for referral discount.');
        return;
      }
      const disc = Math.round(calculatedSubtotal * 0.2);
      setAppliedDiscount(disc);
      setCouponSuccess(`Referral code ${cleanCode} applied! 20% (₹${disc}) discount added.`);
    } else if (cleanCode === '') {
      setAppliedDiscount(0);
    } else {
      setCouponError('Invalid coupon code. Try CAMPORA100 or ALEX20CMP');
      setAppliedDiscount(0);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read selected file.'));
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });

  const handleTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setStepError('Please choose a template file smaller than 3 MB.');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCollegeTemplateFile({
        id: `tmpl-${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type || 'application/octet-stream',
        uploadedAt: 'Just now',
        dataUrl,
      });
      setStepError('');
    } catch (error: any) {
      setStepError(error.message || 'Unable to read template file.');
    }
  };

  const handleReferenceFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected: File[] = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (referenceFiles.length + selected.length > 10) {
      setStepError('You can attach a maximum of 10 reference files.');
      e.target.value = '';
      return;
    }
    const existingBytes = referenceFiles.reduce((sum, file) => sum + (file.dataUrl ? Math.floor(file.dataUrl.length * 0.75) : 0), 0);
    const selectedBytes = selected.reduce((sum, file) => sum + file.size, 0);
    if (selected.some((file) => file.size > 3 * 1024 * 1024) || existingBytes + selectedBytes > 4 * 1024 * 1024) {
      setStepError('Each file must be under 3 MB and all reference files together must be under 4 MB.');
      e.target.value = '';
      return;
    }
    try {
      const newAtts: OrderAttachment[] = await Promise.all(selected.map(async (file, idx) => ({
        id: `att-${Date.now()}-${idx}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type || 'application/octet-stream',
        uploadedAt: 'Just now',
        dataUrl: await readFileAsDataUrl(file),
      })));
      setReferenceFiles((previous) => [...previous, ...newAtts]);
      setStepError('');
    } catch (error: any) {
      setStepError(error.message || 'Unable to read reference files.');
    }
  };

  const handleRemoveReference = (id: string) => {
    setReferenceFiles(referenceFiles.filter((a) => a.id !== id));
  };

  const handleNextStep = () => {
    setStepError('');

    // Validation checks per step
    if (currentStep === 1) {
      if (!serviceId) {
        setStepError('Please select a service to continue.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!fullName.trim()) {
        setStepError('Please enter your full name.');
        return;
      }
      if (!whatsappNumber.trim()) {
        setStepError('Please enter your WhatsApp number.');
        return;
      }
      if (!college.trim()) {
        setStepError('Please enter your College or University name.');
        return;
      }
    }

    if (currentStep === 3) {
      if (!topic.trim()) {
        setStepError('Please enter the topic or title for your assignment.');
        return;
      }
      if (!pagesOrSlides || pagesOrSlides < 1) {
        setStepError('Please enter a valid slide or page count.');
        return;
      }
      if (!deadline.trim()) {
        setStepError('Please select your target deadline.');
        return;
      }
    }

    if (currentStep === 4) {
      if (hasCollegeTemplate && !collegeTemplateFile) {
        setStepError('Please upload your college/university template file.');
        return;
      }
    }

    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    setStepError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsProcessing(true);
    setStepError('');

    const initialStatus: OrderStatus = requiresAdminReview ? 'requirements_review' : 'new_order';
    const initialQuoteStatus: QuoteStatus = requiresAdminReview ? 'pending' : 'not_required';
    const initialPaymentStatus: PaymentStatus = requiresAdminReview ? 'awaiting_quote' : 'pending';

    const newOrder: CamporaOrder = {
      id: `CMP-${Date.now()}`,
      customerId: '',
      customerEmail: '',
      customerName: fullName.trim(),
      whatsappNumber: whatsappNumber.trim(),
      college: college.trim(),
      serviceId: currentService.id,
      serviceName: currentService.title,
      pricingType: currentService.pricingType,
      topic: topic.trim(),
      pagesOrSlides,
      deadline,
      instructions: requirements.trim(),
      hasCollegeTemplate,
      collegeTemplateFile: hasCollegeTemplate ? (collegeTemplateFile || undefined) : undefined,
      templateInstructions: hasCollegeTemplate ? templateInstructions : undefined,
      referenceFiles,
      subtotal: calculatedSubtotal,
      finalPrice: finalTotal,
      discount: appliedDiscount,
      couponCode: appliedDiscount > 0 ? couponCode : undefined,
      total: finalTotal,
      quoteStatus: initialQuoteStatus,
      paymentStatus: initialPaymentStatus,
      status: initialStatus,
      requiresReview: requiresAdminReview,
      reviewReason: isOverLimit
        ? `Page count (${pagesOrSlides}) exceeds 20 limit.`
        : isVariableService
        ? 'Variable service requiring custom quote.'
        : undefined,
      progressPercent: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDelivery: deadline.includes('1-3') ? 'In 3 hours' : 'In 24-48 hours',
      timeline: [],
      deliverables: [],
    };

    try {
      const savedOrder = await onOrderCreated(newOrder);
      setCreatedOrderSummary(savedOrder);
      setOrderCompletedSuccess(true);
    } catch (error: any) {
      setStepError(error?.message || 'We could not save your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishAndClose = () => {
    setOrderCompletedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto animate-fadeIn relative text-white">
        
        {/* Top Header */}
        <div className="px-5 sm:px-8 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D4A72C] flex items-center justify-center text-[#0B0B0B] font-black text-sm shadow-md">
              C
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white font-['Outfit',sans-serif]">
                CAMPORA Academic Order Flow
              </h3>
              <p className="text-[11px] text-[#B8B8B8]">
                Turning deadlines into done • 6 AM – 12 AM Support
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1D1D1D] hover:bg-[#2A2A2A] text-[#B8B8B8] hover:text-white flex items-center justify-center border border-[#2A2A2A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progression Bar (8 Steps) */}
        <div className="px-5 sm:px-8 pt-5 pb-3 bg-[#111111] border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-[#B8B8B8]">
              Step <span className="text-white font-bold">{currentStep}</span> of 8
            </span>
            <span className="text-[#F0D27A] font-bold">
              {stepTitles[currentStep - 1]}
            </span>
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s < currentStep
                    ? 'bg-[#35C759]'
                    : s === currentStep
                    ? 'bg-[#D4A72C]'
                    : 'bg-[#2A2A2A]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Error Notice */}
        {stepError && (
          <div className="mx-5 sm:mx-8 mt-4 p-3 rounded-xl bg-[#FF5A5F]/15 border border-[#FF5A5F]/40 text-[#FF5A5F] text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FF5A5F]" />
            <span>{stepError}</span>
          </div>
        )}

        {/* Order Completed Confirmation Overlay */}
        {orderCompletedSuccess && createdOrderSummary ? (
          <div className="p-6 sm:p-10 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#35C759]/20 border-2 border-[#35C759] flex items-center justify-center text-[#35C759] mx-auto">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#D4A72C]/20 border border-[#D4A72C]/40 text-[#F0D27A] text-xs font-bold mb-2 font-mono">
                #{createdOrderSummary.id}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit',sans-serif]">
                {createdOrderSummary.requiresReview ? 'Order Brief Submitted for Review!' : 'Order Submitted Successfully!'}
              </h3>
              <p className="text-sm text-[#B8B8B8] max-w-lg mx-auto mt-2">
                {createdOrderSummary.requiresReview
                  ? 'Our academic review desk is examining your brief. You will receive quote confirmation on your WhatsApp & dashboard shortly.'
                  : 'Your order has been received. Track its status from your student dashboard. Work begins after payment verification.'}
              </p>
            </div>

            {/* Quick Order Highlights Box */}
            <div className="max-w-md mx-auto bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 text-xs text-left space-y-2 text-[#B8B8B8]">
              <div className="flex justify-between">
                <span>Service:</span>
                <span className="font-bold text-white">{createdOrderSummary.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span>Student:</span>
                <span className="text-white">{createdOrderSummary.customerName} ({createdOrderSummary.college})</span>
              </div>
              <div className="flex justify-between">
                <span>WhatsApp Updates:</span>
                <span className="text-[#35C759] font-mono">{createdOrderSummary.whatsappNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Template Format:</span>
                <span className="text-[#F0D27A]">{createdOrderSummary.hasCollegeTemplate ? 'College Template Attached' : 'Standard Academic Format'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#2A2A2A]">
                <span>Status:</span>
                <span className="font-bold text-[#D4A72C] uppercase">{createdOrderSummary.status.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="btn-view-tracking-dashboard"
                onClick={handleFinishAndClose}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold transition-all shadow-lg shadow-[#D4A72C]/20"
              >
                Go to Live Order Tracker
              </button>
            </div>
          </div>
        ) : (
          /* Main 8-Step Interactive Layout */
          <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[72vh] overflow-y-auto">
            
            {/* Left Main Form Container */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* STEP 1: SELECT SERVICE */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      1. Select Your Service
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Choose from our standard academic solutions or specialized internship packages.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {SERVICES_DATA.map((srv) => {
                      const isSelected = srv.id === serviceId;
                      const isVariable = srv.pricingType === 'variable';

                      return (
                        <div
                          key={srv.id}
                          id={`step1-service-${srv.id}`}
                          onClick={() => setServiceId(srv.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#1D1D1D] border-[#D4A72C] shadow-md shadow-[#D4A72C]/15 ring-1 ring-[#D4A72C]'
                              : 'bg-[#171717] border-[#2A2A2A] hover:border-[#D4A72C]/40 hover:bg-[#1D1D1D]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">{srv.title}</div>
                              <div className="text-[11px] text-[#858585] mt-0.5 line-clamp-1">{srv.unit}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isVariable
                                ? 'bg-[#F0B429]/15 text-[#F0B429] border border-[#F0B429]/30'
                                : 'bg-[#D4A72C]/15 text-[#F0D27A] border border-[#D4A72C]/30'
                            }`}>
                              {isVariable ? 'QUOTE' : `₹${srv.price}`}
                            </span>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#2A2A2A] flex items-center justify-between text-[11px]">
                            <span className="text-[#858585] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#D4A72C]" />
                              {srv.turnaround}
                            </span>
                            {srv.supportsTemplate && (
                              <span className="text-[#F0D27A] text-[10px] font-semibold">
                                Template Ready
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: STUDENT DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      2. Student Information
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Your identity and files are protected with ironclad student confidentiality.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-student-fullname"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Alex Carter"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                        WhatsApp Number (For Instant Delivery & Quotes) *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-student-whatsapp"
                          type="tel"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+91 75592 25529"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                        />
                      </div>
                      <span className="text-[11px] text-[#858585] mt-1 block">
                        We send order updates, draft previews, and final delivery files directly to your WhatsApp.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                        College / University *
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-student-college"
                          type="text"
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          placeholder="e.g. Vellore Institute of Technology"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: WORK DETAILS & 20-PAGE LIMIT */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      3. Work Details & Volume
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Specify the scope, topic, and expected volume for {currentService.title}.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                        Topic / Assignment Title *
                      </label>
                      <input
                        id="input-work-topic"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Cloud Computing Architecture & Edge Intelligence"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                          Number of Slides / Pages *
                        </label>
                        <input
                          id="input-work-pages"
                          type="number"
                          min="1"
                          max="120"
                          value={pagesOrSlides}
                          onChange={(e) => setPagesOrSlides(parseInt(e.target.value) || 1)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white focus:outline-none focus:border-[#D4A72C]"
                        />
                        <span className="text-[11px] text-[#858585] mt-1 block">
                          Base pricing includes up to 20 slides/pages.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                          Target Deadline *
                        </label>
                        <select
                          id="select-work-deadline"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-sm text-white focus:outline-none focus:border-[#D4A72C]"
                        >
                          <option value="Standard (24-48 hrs)">Standard (24-48 hrs)</option>
                          <option value="Urgent (12-24 hrs)">Urgent (12-24 hrs)</option>
                          <option value="Critical Rush (1-3 hrs)">Critical Rush (1-3 hrs)</option>
                          <option value="Flexible (3+ days)">Flexible (3+ days)</option>
                        </select>
                      </div>
                    </div>

                    {/* 20-Page Limit Warning Banner */}
                    {isOverLimit && (
                      <div className="p-3.5 rounded-2xl bg-[#F0B429]/10 border border-[#F0B429]/40 text-[#F0B429] text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-[#F0B429] flex-shrink-0" />
                          <span>20 Page / Slide Limit Exceeded ({pagesOrSlides} requested)</span>
                        </div>
                        <p className="text-[#B8B8B8] pl-6 text-[11px] leading-relaxed">
                          "Your selected service includes up to 20 pages/slides. Additional charges may apply beyond this limit." Your order will be marked for review before final pricing.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                        Additional Guidelines & Instructions
                      </label>
                      <textarea
                        id="input-work-requirements"
                        rows={3}
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        placeholder="Specify syllabus points, citation style (IEEE, APA, Harvard), formatting notes, or target grading rubric..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs sm:text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: COLLEGE/UNIVERSITY TEMPLATE SUPPORT */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      4. College / University Template
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Have a college or university template? Upload it and we'll follow the required format.
                    </p>
                  </div>

                  {/* Toggle Choice */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      id="btn-template-no"
                      onClick={() => {
                        setHasCollegeTemplate(false);
                        setCollegeTemplateFile(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        !hasCollegeTemplate
                          ? 'bg-[#1D1D1D] border-[#D4A72C] text-white ring-1 ring-[#D4A72C]'
                          : 'bg-[#171717] border-[#2A2A2A] text-[#858585] hover:border-[#D4A72C]/40'
                      }`}
                    >
                      <div className="text-sm font-bold text-white">Standard Format</div>
                      <div className="text-[11px] text-[#858585] mt-0.5">Use CAMPORA's clean academic template</div>
                    </button>

                    <button
                      type="button"
                      id="btn-template-yes"
                      onClick={() => setHasCollegeTemplate(true)}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        hasCollegeTemplate
                          ? 'bg-[#1D1D1D] border-[#D4A72C] text-white ring-1 ring-[#D4A72C]'
                          : 'bg-[#171717] border-[#2A2A2A] text-[#858585] hover:border-[#D4A72C]/40'
                      }`}
                    >
                      <div className="text-sm font-bold text-[#F0D27A] flex items-center gap-1.5">
                        <FileUp className="w-4 h-4 text-[#D4A72C]" />
                        <span>I Have a Template</span>
                      </div>
                      <div className="text-[11px] text-[#B8B8B8] mt-0.5">Upload university prescribed format</div>
                    </button>
                  </div>

                  {hasCollegeTemplate && (
                    <div className="space-y-3.5 pt-2 animate-fadeIn">
                      {/* Template File Upload Zone */}
                      <div>
                        <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                          Upload College / University Template *
                        </label>
                        <label className="border-2 border-dashed border-[#D4A72C]/50 hover:border-[#D4A72C] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-[#171717] hover:bg-[#1D1D1D] transition-all block">
                          <FileUp className="w-8 h-8 text-[#D4A72C] mb-2" />
                          <span className="text-xs font-semibold text-white">
                            {collegeTemplateFile ? 'Replace Template File' : 'Click to upload your College Template'}
                          </span>
                          <span className="text-[11px] text-[#858585] mt-0.5">
                            PDF, DOCX, PPTX, JPG, PNG (up to 3MB)
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx,.pptx,.ppt,.doc,.jpg,.png"
                            onChange={handleTemplateFileUpload}
                          />
                        </label>

                        {/* Selected Template File Badge */}
                        {collegeTemplateFile && (
                          <div className="mt-2.5 p-3 rounded-xl bg-[#171717] border border-[#D4A72C]/50 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <FileText className="w-4 h-4 text-[#D4A72C] flex-shrink-0" />
                              <span className="font-semibold text-white truncate">{collegeTemplateFile.name}</span>
                              <span className="text-[#858585] text-[10px] font-mono flex-shrink-0">({collegeTemplateFile.size})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCollegeTemplateFile(null)}
                              className="text-[#858585] hover:text-[#FF5A5F] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Template Specific Instructions */}
                      <div>
                        <label className="block text-xs font-semibold text-[#B8B8B8] mb-1">
                          Template Instructions
                        </label>
                        <textarea
                          id="input-template-instructions"
                          rows={2}
                          value={templateInstructions}
                          onChange={(e) => setTemplateInstructions(e.target.value)}
                          placeholder="Tell us about specific formatting requirements, logos, cover pages, fonts, sections, page layouts, etc."
                          className="w-full px-3.5 py-2 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs text-white placeholder-[#858585] focus:outline-none focus:border-[#D4A72C] resize-none"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-[#171717] border border-[#2A2A2A] text-[11px] text-[#858585] flex items-start gap-2">
                        <Info className="w-4 h-4 text-[#D4A72C] flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Note:</strong> Additional charges may apply for highly complex formatting or custom macros.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: REFERENCE MATERIAL */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      5. Reference Materials & Rough Notes
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Upload any syllabus copies, problem statements, raw notes, or datasets (separate from college template).
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <label className="border-2 border-dashed border-[#2A2A2A] hover:border-[#D4A72C]/40 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-[#171717] hover:bg-[#1D1D1D] transition-all block">
                      <Upload className="w-7 h-7 text-[#858585] mb-2" />
                      <span className="text-xs font-semibold text-white">
                        Click to upload reference material or notes
                      </span>
                      <span className="text-[11px] text-[#858585] mt-0.5">
                        PDF, DOCX, PPTX, ZIP, TXT, CSV (up to 50MB)
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleReferenceFilesUpload}
                      />
                    </label>

                    {/* Uploaded Reference Files List */}
                    {referenceFiles.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
                          Attached Reference Files ({referenceFiles.length})
                        </span>
                        {referenceFiles.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#2A2A2A] text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 text-[#D4A72C] flex-shrink-0" />
                              <span className="text-white truncate">{att.name}</span>
                              <span className="text-[#858585] text-[10px] font-mono flex-shrink-0">({att.size})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveReference(att.id)}
                              className="text-[#858585] hover:text-[#FF5A5F] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#858585] italic text-center py-2">
                        No reference files attached (Optional).
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: ORDER REVIEW */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      6. Review Your Order Specifications
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Please verify all details before proceeding to pricing & payment.
                    </p>
                  </div>

                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
                    <div className="flex justify-between items-center pb-2.5 border-b border-[#2A2A2A]">
                      <span className="text-[#858585]">Selected Service:</span>
                      <span className="font-bold text-white text-right">{currentService.title}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">Student & College:</span>
                      <span className="text-white text-right">{fullName} • {college}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">WhatsApp Notification:</span>
                      <span className="text-[#35C759] font-mono text-right">{whatsappNumber}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">Topic:</span>
                      <span className="text-white text-right max-w-[240px] truncate">{topic}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">Volume & Deadline:</span>
                      <span className="text-white text-right">{pagesOrSlides} Slides/Pages • {deadline}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">College Template:</span>
                      <span className={`font-semibold ${hasCollegeTemplate ? 'text-[#F0D27A]' : 'text-[#858585]'}`}>
                        {hasCollegeTemplate ? `Yes (${collegeTemplateFile?.name || 'Uploaded'})` : 'No (Standard format)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#858585]">Reference Materials:</span>
                      <span className="text-[#B8B8B8]">{referenceFiles.length} file(s) attached</span>
                    </div>

                    {requiresAdminReview && (
                      <div className="mt-2 p-3 rounded-xl bg-[#F0B429]/10 border border-[#F0B429]/30 text-[#F0B429] text-[11px] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F0B429]" />
                        <span>Requires brief review by academic team before final quote confirmation.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 7: PRICING & COUPON */}
              {currentStep === 7 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      7. Transparent Price Breakdown
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      Review applicable discounts, referral credits, and estimated total.
                    </p>
                  </div>

                  {/* Coupon Box */}
                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-semibold text-[#B8B8B8]">
                      Apply Promo / Referral Code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-pricing-coupon"
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="e.g. CAMPORA100 or ALEX20CMP"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-white uppercase font-mono placeholder-[#858585] focus:outline-none focus:border-[#D4A72C]"
                        />
                      </div>
                      <button
                        type="button"
                        id="btn-apply-coupon"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 rounded-xl bg-[#1D1D1D] hover:bg-[#2A2A2A] text-xs font-bold text-white border border-[#2A2A2A] hover:border-[#D4A72C]/40 transition-colors"
                      >
                        Apply
                      </button>
                    </div>

                    {couponSuccess && (
                      <p className="text-xs text-[#35C759] font-medium">{couponSuccess}</p>
                    )}
                    {couponError && (
                      <p className="text-xs text-[#FF5A5F]">{couponError}</p>
                    )}
                  </div>

                  {/* Pricing Details Display */}
                  <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 space-y-2.5 text-xs">
                    <div className="flex justify-between text-[#858585]">
                      <span>Service Base Rate:</span>
                      <span className="text-white">{isVariableService && currentService.price === 0 ? 'Quote-First' : `₹${calculatedSubtotal}`}</span>
                    </div>

                    {hasCollegeTemplate && (
                      <div className="flex justify-between text-[#F0D27A]">
                        <span>College Template Adaptation:</span>
                        <span>Included (Free)</span>
                      </div>
                    )}

                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-[#35C759] font-medium">
                        <span>Discount Applied:</span>
                        <span>-₹{appliedDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-white font-extrabold text-base pt-3 border-t border-[#2A2A2A]">
                      <span>{requiresAdminReview ? 'Estimated Base Price:' : 'Total Payable:'}</span>
                      <span className="text-[#D4A72C] text-xl font-['Outfit',sans-serif]">
                        {isVariableService && currentService.price === 0 ? 'Custom Quote' : `₹${finalTotal}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: PAYMENT METHOD */}
              {currentStep === 8 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
                      8. Confirm & Submit Order
                    </h4>
                    <p className="text-xs text-[#B8B8B8] mt-1">
                      {requiresAdminReview
                        ? 'Submit your brief. We will review and send confirmation + payment link to your WhatsApp.'
                        : 'Choose your payment gateway to initiate immediate production.'}
                    </p>
                  </div>

                  {!requiresAdminReview ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          id="pay-method-upi"
                          onClick={() => setPaymentMethod('upi')}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                            paymentMethod === 'upi'
                              ? 'bg-[#1D1D1D] border-[#D4A72C] text-white ring-1 ring-[#D4A72C]'
                              : 'bg-[#171717] border-[#2A2A2A] text-[#858585] hover:border-[#D4A72C]/40'
                          }`}
                        >
                          <QrCode className="w-5 h-5 text-[#D4A72C]" />
                          <span>UPI / GPay / QR</span>
                        </button>

                        <button
                          type="button"
                          id="pay-method-card"
                          onClick={() => setPaymentMethod('card')}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                            paymentMethod === 'card'
                              ? 'bg-[#1D1D1D] border-[#D4A72C] text-white ring-1 ring-[#D4A72C]'
                              : 'bg-[#171717] border-[#2A2A2A] text-[#858585] hover:border-[#D4A72C]/40'
                          }`}
                        >
                          <CreditCard className="w-5 h-5 text-[#D4A72C]" />
                          <span>Cards / NetBanking</span>
                        </button>

                        <button
                          type="button"
                          id="pay-method-whatsapp"
                          onClick={() => setPaymentMethod('whatsapp')}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                            paymentMethod === 'whatsapp'
                              ? 'bg-[#35C759]/15 border-[#35C759] text-white ring-1 ring-[#35C759]'
                              : 'bg-[#171717] border-[#2A2A2A] text-[#858585] hover:border-[#D4A72C]/40'
                          }`}
                        >
                          <Phone className="w-5 h-5 text-[#35C759]" />
                          <span>Pay via WhatsApp</span>
                        </button>
                      </div>

                      <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 text-xs space-y-2">
                        <div className="flex justify-between text-[#B8B8B8]">
                          <span>Deliverable:</span>
                          <span className="font-bold text-white">{currentService.title}</span>
                        </div>
                        <div className="flex justify-between text-[#B8B8B8]">
                          <span>Direct WhatsApp Delivery:</span>
                          <span className="text-[#35C759] font-mono">{whatsappNumber}</span>
                        </div>
                        <div className="flex justify-between text-[#B8B8B8] pt-2 border-t border-[#2A2A2A] font-bold">
                          <span>Amount Due Now:</span>
                          <span className="text-base text-[#D4A72C]">₹{finalTotal}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 space-y-3 text-xs">
                      <div className="flex items-center gap-2 text-[#F0B429] font-bold">
                        <Info className="w-4 h-4" />
                        <span>Quote Review Process</span>
                      </div>
                      <p className="text-[#B8B8B8] leading-relaxed">
                        Because your order has custom scope or exceeded 20 pages/slides, our academic team will review your guidelines immediately. You will receive a final confirmed price & payment link within 15–30 minutes on WhatsApp ({whatsappNumber}).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Back / Next Controls */}
              <div className="pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 rounded-xl bg-[#171717] hover:bg-[#1D1D1D] text-xs font-semibold text-white flex items-center gap-1.5 border border-[#2A2A2A] hover:border-[#D4A72C]/40 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-[#171717] text-xs font-semibold text-[#858585] hover:text-white border border-[#2A2A2A]"
                  >
                    Cancel
                  </button>
                )}

                {currentStep < 8 ? (
                  <button
                    type="button"
                    id="btn-order-step-next"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#D4A72C]/20 transition-all"
                  >
                    <span>{currentStep === 7 ? 'Proceed to Payment' : 'Next Step'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-confirm-order-final"
                    disabled={isProcessing}
                    onClick={handleFinalSubmit}
                    className="px-7 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#E5B93F] text-[#0B0B0B] text-xs font-bold flex items-center gap-2 shadow-xl shadow-[#D4A72C]/25 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>{requiresAdminReview ? 'Submit for Quote Review' : `Pay ₹${finalTotal} & Track Order`}</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Right Sticky Sidebar: Realtime Summary */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Live Card */}
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                  <span className="font-bold text-sm text-white">Live Order Brief</span>
                  <span className="text-[10px] font-mono bg-[#D4A72C]/15 text-[#F0D27A] px-2 py-0.5 rounded-md font-bold border border-[#D4A72C]/30">
                    CAMPORA SECURE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-[#B8B8B8]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Service:</span>
                    <span className="font-semibold text-white text-right">{currentService.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Volume:</span>
                    <span className="font-medium text-white">{pagesOrSlides} Pages / Slides</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Deadline:</span>
                    <span className="font-medium text-white">{deadline}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Template Mode:</span>
                    <span className={hasCollegeTemplate ? 'text-[#F0D27A] font-semibold' : 'text-[#858585]'}>
                      {hasCollegeTemplate ? 'College Template' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Confidentiality:</span>
                    <span className="text-[#35C759] font-semibold">100% Private</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#858585]">Revisions:</span>
                    <span className="text-[#35C759] font-semibold">Free Included</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="pt-3 border-t border-[#2A2A2A] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#858585]">
                    <span>Base Estimate</span>
                    <span className="text-white">{isVariableService && currentService.price === 0 ? 'Quote-First' : `₹${calculatedSubtotal}`}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#35C759]">
                      <span>Discount</span>
                      <span>-₹${appliedDiscount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-white font-extrabold text-base pt-2 border-t border-[#2A2A2A]">
                    <span>Estimated Total</span>
                    <span className="text-[#D4A72C] text-lg font-['Outfit',sans-serif]">
                      {isVariableService && currentService.price === 0 ? 'Custom Quote' : `₹${finalTotal}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantee Box */}
              <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 flex items-start gap-3 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#35C759]/10 border border-[#35C759]/20 flex items-center justify-center text-[#35C759] flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-[#858585] leading-relaxed">
                  <span className="font-bold text-white block">CAMPORA Guarantee</span>
                  Zero AI plagiarism, verified citations, and university template compliance guaranteed.
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
