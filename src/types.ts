export type UserRole = 'customer' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  whatsapp?: string;
  college?: string;
  authProvider?: 'email' | 'google' | 'microsoft';
  createdAt?: string;
}

export type ServiceCategory = 'all' | 'presentations' | 'documentation' | 'design' | 'development' | 'website' | 'career' | 'data' | 'internship';

export type PricingType = 'fixed' | 'variable';

export interface ServiceItem {
  id: string;
  title: string;
  category: ServiceCategory;
  price: number;
  currency: string;
  turnaround: string;
  unit: string;
  description: string;
  features: string[];
  pricingType: PricingType; // 'fixed' | 'variable'
  maxIncludedPages?: number; // e.g. 20
  popular?: boolean;
  tag?: string;
  isUrgent?: boolean;
  supportsTemplate?: boolean;
}

export type OrderStatus =
  | 'new_order'
  | 'under_review'
  | 'approved'
  | 'payment_pending'
  | 'verification_pending'
  | 'payment_confirmed'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'requirements_review'
  | 'quote_sent';

export type PaymentStatus = 'pending' | 'verification_pending' | 'paid' | 'awaiting_quote' | 'rejected';
export type PaymentProofStatus = 'not_submitted' | 'submitted';
export type RefundStatus = 'requested' | 'processing' | 'refunded';

export type QuoteStatus = 'not_required' | 'pending' | 'sent' | 'accepted';

export interface PaymentVerificationDetails {
  upiId: string; // 'tanmayvbhagat-1@oksbi'
  utrNumber?: string;
  screenshotUrl?: string;
  screenshotPath?: string;
  screenshotName?: string;
  screenshotSize?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  amountPaid?: number;
  rejectionReason?: string;
}

export interface PaymentGatewayDetails {
  provider: 'razorpay';
  orderId: string;
  paymentId?: string;
  status: 'created' | 'captured' | 'failed';
  amount: number; // paise
  currency: 'INR';
  createdAt: string;
  paidAt?: string;
  webhookEventIds?: string[];
}

export interface TimelineStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending';
}

export interface OrderAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt?: string;
  dataUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
}

export interface DeliverableFile {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
  uploadedAt: string;
  storagePath?: string;
  downloadUrl?: string;
}

export interface OrderFileUploadPayload {
  fileId: string;
  category: 'college-template' | 'reference';
  fileName: string;
  dataUrl: string;
}

export interface OrderActivity {
  id: string;
  action: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface CamporaOrder {
  id: string; // e.g. CMP-1024
  customerId: string;
  customerName: string;
  customerEmail: string;
  whatsappNumber: string;
  college: string;
  serviceId: string;
  serviceName: string;
  isPackage?: boolean;
  pricingType: PricingType; // 'fixed' | 'variable'
  topic: string;
  pagesOrSlides: number;
  deadline: string; // e.g., 'Within 1-3 hrs', 'Standard (24-48 hrs)'
  instructions: string;
  
  // Template Support
  hasCollegeTemplate: boolean;
  collegeTemplateFile?: OrderAttachment;
  templateInstructions?: string;
  
  // Reference Materials
  referenceFiles: OrderAttachment[];
  
  // Financials & Pricing
  subtotal: number;
  finalPrice?: number;
  discount: number;
  discountEligible?: boolean;
  couponCode?: string;
  total: number;
  quoteStatus: QuoteStatus;
  paymentStatus: PaymentStatus;
  paymentProofStatus?: PaymentProofStatus;
  paymentDetails?: PaymentVerificationDetails;
  paymentGateway?: PaymentGatewayDetails;
  refundStatus?: RefundStatus;
  refundRequestedAt?: string;
  camporaCashRedeemed?: number;
  refundedAt?: string;
  
  // Status Tracking
  status: OrderStatus;
  requiresReview: boolean;
  reviewReason?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery: string;
  timeline: TimelineStep[];
  activityHistory?: OrderActivity[];
  deliverables?: DeliverableFile[];
  adminNotes?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  pages: string;
  grade: string;
  thumbnail: string;
  summary: string;
  tags: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface ReferralStats {
  referralCode: string;
  successfulReferrals: number;
  creditsEarned: number;
  creditBalance: number;
}


