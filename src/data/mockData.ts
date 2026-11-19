import { ServiceItem, CamporaOrder, PortfolioItem, FAQItem } from '../types';

export const SERVICES_DATA: ServiceItem[] = [
  // Presentations
  {
    id: 'basic-ppt',
    title: 'Basic PPT',
    category: 'presentations',
    price: 250,
    currency: '₹',
    turnaround: '24-48 hrs',
    unit: 'up to 20 slides',
    pricingType: 'fixed',
    maxIncludedPages: 20,
    supportsTemplate: true,
    description: 'Clean formatting, standard academic layout, clear bullet points and essential visuals.',
    features: [
      'Up to 20 Custom Slides Included',
      'Standard Academic Theme',
      'Presenter Notes Included',
      '1 Free Revision',
      'Editable .PPTX & PDF',
      'College Template Support'
    ],
  },
  {
    id: 'premium-ppt',
    title: 'Premium PPT',
    category: 'presentations',
    price: 350,
    currency: '₹',
    turnaround: '12-24 hrs',
    unit: 'up to 20 slides',
    pricingType: 'fixed',
    maxIncludedPages: 20,
    supportsTemplate: true,
    description: 'Custom corporate graphics, infographic visualizations, animations, and topic research.',
    features: [
      'Up to 20 Custom Slides Included',
      'Modern Visual Hierarchy & Infographics',
      'Custom Data Charts & Icons',
      'Full Content Research',
      'Priority Turnaround',
      'College Template Support'
    ],
  },
  {
    id: 'urgent-ppt',
    title: 'Urgent PPT',
    category: 'presentations',
    price: 400,
    currency: '₹',
    turnaround: '1-3 hrs',
    unit: 'starting from (quote-first)',
    pricingType: 'variable',
    maxIncludedPages: 20,
    supportsTemplate: true,
    isUrgent: true,
    tag: '1-3 HOUR DELIVERY',
    description: 'Delivery within 1–3 hours. Starting from ₹400. Final price may vary depending on complexity and urgency.',
    features: [
      'Delivered in 1–3 Hours',
      'Starting from ₹400 (Quote Review)',
      'Dedicated Lead Designer',
      'WhatsApp updates during support hours',
      'Timeline confirmed during quote review',
      'Editable .PPTX + PDF export'
    ],
  },

  // Documentation & Reports
  {
    id: 'college-report',
    title: 'College Report',
    category: 'documentation',
    price: 200,
    currency: '₹',
    turnaround: '24-48 hrs',
    unit: 'up to 20 pages',
    pricingType: 'fixed',
    maxIncludedPages: 20,
    supportsTemplate: true,
    description: 'Standard IEEE / APA / Harvard formatted academic report with structured index and bibliography.',
    features: [
      'Up to 20 Formatted Pages Included',
      'College/University Template Alignment',
      'Automated Table of Contents',
      'Referencing & Citations',
      'Editable Word & PDF formats'
    ],
  },
  {
    id: 'word-file',
    title: 'Word File',
    category: 'documentation',
    price: 200,
    currency: '₹',
    turnaround: '24 hrs',
    unit: 'up to 20 pages',
    pricingType: 'fixed',
    maxIncludedPages: 20,
    supportsTemplate: true,
    description: 'Neatly organized assignment solutions, lab manuals, case summaries, and theory writeups.',
    features: [
      'Up to 20 Pages Included',
      'Clean Typography & Spacing',
      'Diagrams & Formula Formatting',
      'Grammar & Syntax Polishing',
      'Follows University Template'
    ],
  },
  {
    id: 'internship-report',
    title: 'Internship Report',
    category: 'documentation',
    price: 300,
    currency: '₹',
    turnaround: '24-48 hrs',
    unit: 'up to 20 pages',
    pricingType: 'fixed',
    maxIncludedPages: 20,
    supportsTemplate: true,
    description: 'Structured internship report based on your genuine internship details, project work and supporting documents.',
    features: [
      'Up to 20 Formatted Pages Included',
      'Company Overview & Architecture',
      'Weekly/Monthly Task Logs',
      'Follows Prescribed College Format',
      'Ready for Final Viva Voce'
    ],
  },

  // Design Services
  {
    id: 'poster-design',
    title: 'Poster Design',
    category: 'design',
    price: 250,
    currency: '₹',
    turnaround: '24 hrs',
    unit: 'Digital / Printed',
    pricingType: 'fixed',
    supportsTemplate: false,
    description: 'High-impact research posters for symposiums, seminars, college exhibitions, and tech fests.',
    features: [
      'Digital & Print-Ready CMYK 300 DPI',
      'Standard A0/A1/A2/A3 Formats',
      'Structured Columns & Infographics',
      'High-Resolution Export + Source'
    ],
  },
  {
    id: 'certificate-design',
    title: 'Certificate Design',
    category: 'design',
    price: 150,
    currency: '₹',
    turnaround: '12-24 hrs',
    unit: 'per template',
    pricingType: 'fixed',
    supportsTemplate: false,
    description: 'Professional event certificates, workshop credentials, badges, and college club creatives.',
    features: [
      'Vector Precision Design',
      'Custom College/Club Branding',
      'Batch Name Friendly Layout',
      'Print Ready & High-Res PDF'
    ],
  },
  {
    id: 'custom-designs',
    title: 'Custom Academic Designs',
    category: 'design',
    price: 250,
    currency: '₹',
    turnaround: '24 hrs',
    unit: 'per design brief',
    pricingType: 'fixed',
    supportsTemplate: true,
    description: 'Flowcharts, architecture diagrams, UI mockups, infographics, and project summary banners.',
    features: [
      'Tailored to Exact Specifications',
      'Vector Assets (.PNG, .SVG, .PDF)',
      'Full Color Matching & High Res',
      'Fast Turnaround'
    ],
  },

  // Internship Support
  {
    id: 'internship-package',
    title: 'Complete Internship Package',
    category: 'internship',
    price: 499,
    currency: '₹',
    turnaround: '2-3 days',
    unit: 'complete package',
    pricingType: 'fixed',
    maxIncludedPages: 40,
    supportsTemplate: true,
    description: 'Internship documentation support based on your genuine internship or project details, including report formatting, certificate layout design and viva preparation.',
    features: [
      'Comprehensive Formatted Project Report',
      'Presentation deck (15-20 slides)',
      'Weekly activity log templates based on supplied details',
      'Viva preparation questions and answers guide',
      'Priority 6 AM – 12 AM WhatsApp Assistance'
    ],
  },
  {
    id: 'internship-doc-only',
    title: 'Internship Documentation',
    category: 'internship',
    price: 350,
    currency: '₹',
    turnaround: '24-48 hrs',
    unit: 'complete doc',
    pricingType: 'fixed',
    maxIncludedPages: 30,
    supportsTemplate: true,
    description: 'Industry-aligned internship documentation with standard chapters, appendices, and index.',
    features: [
      'Full Formatted Report (Up to 30 Pages)',
      'Company Profile & Project Workflow',
      'Code Snippets & Architecture Diagrams',
      'Formatted in College Template'
    ],
  },
  {
    id: 'online-assistance',
    title: 'Online Internship Assistance',
    category: 'internship',
    price: 0,
    currency: '₹',
    turnaround: 'Scheduled',
    unit: 'Contact for Pricing',
    pricingType: 'variable',
    supportsTemplate: false,
    tag: 'CONTACT FOR PRICING',
    description: '1-on-1 prep guidance covering your project code, architecture, and expected viva questions.',
    features: [
      '1-on-1 Concept Walkthrough',
      'Architecture & Tech Stack Q&A',
      'Sample Viva Questions Prep',
      'Tailored Pricing Based on Scope'
    ],
  },
];

export const INITIAL_ORDERS: CamporaOrder[] = [
  {
    id: 'CMP-1024',
    customerId: 'cust-alex-1',
    customerName: 'Alex Carter',
    customerEmail: 'alex.carter@vit.ac.in',
    whatsappNumber: '+91 75592 25529',
    college: 'Vellore Institute of Technology',
    serviceId: 'premium-ppt',
    serviceName: 'Premium PPT Presentation',
    isPackage: false,
    pricingType: 'fixed',
    topic: 'Cloud Computing Architecture & Edge Intelligence',
    pagesOrSlides: 18,
    deadline: 'Standard (24-48 hrs)',
    instructions: 'Please include high-contrast diagrams of hybrid cloud topology and IoT edge nodes. Keep the theme dark & gold.',
    hasCollegeTemplate: true,
    collegeTemplateFile: {
      id: 'tmpl-1',
      name: 'VIT_Official_Seminar_Template_2026.pptx',
      size: '2.4 MB',
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      uploadedAt: 'Oct 24, 09:00 AM'
    },
    templateInstructions: 'Use the official VIT blue & gold slide headers and placement of the department crest on slide 1.',
    referenceFiles: [
      { id: 'att-1', name: 'Edge_Computing_Syllabus_Guidelines.pdf', size: '1.4 MB', type: 'application/pdf', uploadedAt: 'Oct 24, 09:00 AM' },
      { id: 'att-2', name: 'Raw_Research_Notes.docx', size: '320 KB', type: 'application/docx', uploadedAt: 'Oct 24, 09:00 AM' }
    ],
    subtotal: 350,
    finalPrice: 350,
    discount: 50,
    discountEligible: true,
    couponCode: 'CAMPORA100',
    total: 300,
    quoteStatus: 'not_required',
    paymentStatus: 'paid',
    paymentDetails: {
      upiId: 'tanmayvbhagat-1@oksbi',
      utrNumber: '429810238491',
      screenshotName: 'GPay_VIT_Payment_300.png',
      screenshotSize: '340 KB',
      submittedAt: 'Oct 24, 11:00 AM',
      verifiedAt: 'Oct 24, 11:15 AM',
      verifiedBy: 'CAMPORA Lead Admin',
      amountPaid: 300,
    },
    status: 'in_progress',
    requiresReview: false,
    adminNotes: 'Student needs standard VIT template formatting with department crest on slide 1.',
    progressPercent: 68,
    createdAt: 'Oct 24, 09:00 AM',
    updatedAt: 'Oct 24, 11:15 AM',
    estimatedDelivery: 'Oct 25, 06:00 PM',
    timeline: [
      { id: 't1', title: 'Order Received', description: 'Brief and template files logged into system', timestamp: 'Oct 24, 09:00 AM', status: 'completed' },
      { id: 't2', title: 'Requirements Confirmed', description: 'Topic & VIT template verified by lead designer', timestamp: 'Oct 24, 10:30 AM', status: 'completed' },
      { id: 't3', title: 'Payment Completed', description: 'Payment of ₹300 confirmed (UTR: 429810238491)', timestamp: 'Oct 24, 11:15 AM', status: 'completed' },
      { id: 't4', title: 'Work In Progress', description: 'Senior designer is crafting slide graphics in VIT template (68% complete)', timestamp: 'Active Now', status: 'current' },
      { id: 't5', title: 'Quality Review', description: 'Formatting, structure and readability review', status: 'pending' },
      { id: 't6', title: 'Final Delivery', description: 'Downloadable .pptx & high-res PDF available in dashboard', status: 'pending' }
    ],
    deliverables: []
  },
  {
    id: 'CMP-1048',
    customerId: 'cust-priya-2',
    customerName: 'Priya Sharma',
    customerEmail: 'priya.sharma@srm.edu.in',
    whatsappNumber: '+91 98765 43210',
    college: 'SRM Institute of Science and Technology',
    serviceId: 'urgent-ppt',
    serviceName: 'Urgent PPT (1-3 hrs)',
    isPackage: false,
    pricingType: 'variable',
    topic: 'Biomedical Signal Processing & ECG Denoising',
    pagesOrSlides: 15,
    deadline: 'Within 1-3 hrs',
    instructions: 'Need this urgently before 2 PM review meeting. 15 slides with MATLAB signal plots.',
    hasCollegeTemplate: false,
    referenceFiles: [
      { id: 'att-urg-1', name: 'ECG_Waveforms_Data.pdf', size: '3.1 MB', type: 'application/pdf', uploadedAt: 'Today, 10:15 AM' }
    ],
    subtotal: 400,
    finalPrice: 450,
    discount: 0,
    discountEligible: true,
    total: 450,
    quoteStatus: 'sent',
    paymentStatus: 'verification_pending',
    paymentDetails: {
      upiId: 'tanmayvbhagat-1@oksbi',
      utrNumber: '519283746102',
      screenshotName: 'PhonePe_Transfer_450.png',
      screenshotSize: '410 KB',
      screenshotUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      submittedAt: 'Today, 10:35 AM',
      amountPaid: 450,
    },
    status: 'verification_pending',
    requiresReview: true,
    reviewReason: 'Urgent rush timeline (2 hours). Quote confirmed: ₹450.',
    adminNotes: 'Payment proof submitted. Verify UTR in SBI statement before starting.',
    progressPercent: 35,
    createdAt: 'Today, 10:15 AM',
    updatedAt: 'Today, 10:35 AM',
    estimatedDelivery: 'Today, 01:00 PM',
    timeline: [
      { id: 't1', title: 'Order Received', description: 'Urgent request received', timestamp: 'Today, 10:15 AM', status: 'completed' },
      { id: 't2', title: 'Requirements Review', description: 'Admin reviewed urgent timeline', timestamp: 'Today, 10:20 AM', status: 'completed' },
      { id: 't3', title: 'Payment Verification Pending', description: 'Student submitted UTR: 519283746102. Admin verifying transaction.', timestamp: 'Today, 10:35 AM', status: 'current' },
      { id: 't4', title: 'Work In Progress', description: 'Designer ready to produce slides immediately upon payment confirmation', status: 'pending' },
      { id: 't5', title: 'Completed', description: 'Instant delivery via WhatsApp & Portal', status: 'pending' }
    ],
    deliverables: []
  },
  {
    id: 'CMP-1060',
    customerId: 'cust-rohit-3',
    customerName: 'Rohit Verma',
    customerEmail: 'rohit.verma@bits-pilani.ac.in',
    whatsappNumber: '+91 91234 56780',
    college: 'BITS Pilani',
    serviceId: 'internship-package',
    serviceName: 'Internship Completion + Certification + Report',
    isPackage: true,
    pricingType: 'fixed',
    topic: 'Full-Stack Distributed Cloud Systems Internship',
    pagesOrSlides: 35,
    deadline: 'Standard (2-3 days)',
    instructions: 'Complete package with 35-page report, presentation deck, weekly timesheets and top 25 viva questions.',
    hasCollegeTemplate: true,
    collegeTemplateFile: {
      id: 'tmpl-bits',
      name: 'BITS_Pilani_PS2_Internship_Report_Template.docx',
      size: '2.1 MB',
      type: 'application/docx',
      uploadedAt: 'Today, 08:30 AM'
    },
    referenceFiles: [
      { id: 'att-b1', name: 'Company_Offer_Letter_Sanitized.pdf', size: '650 KB', type: 'application/pdf', uploadedAt: 'Today, 08:30 AM' }
    ],
    subtotal: 499,
    finalPrice: 499,
    discount: 0,
    discountEligible: false,
    total: 499,
    quoteStatus: 'not_required',
    paymentStatus: 'pending',
    status: 'new_order',
    requiresReview: true,
    reviewReason: 'New order awaiting admin approval and requirements check.',
    adminNotes: 'Package order ₹499. No discount codes permitted.',
    progressPercent: 10,
    createdAt: 'Today, 08:30 AM',
    updatedAt: 'Today, 08:30 AM',
    estimatedDelivery: 'In 3 Days',
    timeline: [
      { id: 't1', title: 'Order Submitted', description: 'Awaiting Admin Approval & Review', timestamp: 'Today, 08:30 AM', status: 'current' },
      { id: 't2', title: 'Approval & Payment', description: 'Admin verifies scope and activates UPI payment card', status: 'pending' },
      { id: 't3', title: 'Work In Progress', description: 'Report writing and viva deck synthesis', status: 'pending' },
      { id: 't4', title: 'Delivery', description: 'Complete documentation dossier ready for download', status: 'pending' }
    ],
    deliverables: []
  },
  {
    id: 'CMP-0982',
    customerId: 'cust-alex-1',
    customerName: 'Alex Carter',
    customerEmail: 'alex.carter@vit.ac.in',
    whatsappNumber: '+91 75592 25529',
    college: 'Vellore Institute of Technology',
    serviceId: 'college-report',
    serviceName: 'College Report',
    isPackage: false,
    pricingType: 'fixed',
    topic: 'Renewable Energy Storage & Battery Chemistry',
    pagesOrSlides: 14,
    deadline: 'Completed',
    instructions: 'Standard APA 7th edition formatting with 15 peer-reviewed citations.',
    hasCollegeTemplate: true,
    collegeTemplateFile: {
      id: 'tmpl-2',
      name: 'VIT_School_of_Electrical_Format.docx',
      size: '1.1 MB',
      type: 'application/docx',
      uploadedAt: 'Oct 18, 02:00 PM'
    },
    referenceFiles: [
      { id: 'att-3', name: 'Assignment_Rubric.pdf', size: '890 KB', type: 'application/pdf', uploadedAt: 'Oct 18, 02:00 PM' }
    ],
    subtotal: 200,
    finalPrice: 200,
    discount: 0,
    discountEligible: true,
    total: 200,
    quoteStatus: 'not_required',
    paymentStatus: 'paid',
    status: 'completed',
    requiresReview: false,
    progressPercent: 100,
    createdAt: 'Oct 18, 02:00 PM',
    updatedAt: 'Oct 19, 03:50 PM',
    estimatedDelivery: 'Oct 19, 04:00 PM',
    timeline: [
      { id: 't1', title: 'Order Received', description: 'Brief & template received', timestamp: 'Oct 18, 02:00 PM', status: 'completed' },
      { id: 't2', title: 'Requirements Confirmed', description: 'Specifications approved', timestamp: 'Oct 18, 02:45 PM', status: 'completed' },
      { id: 't3', title: 'Payment Completed', description: 'Verified', timestamp: 'Oct 18, 03:00 PM', status: 'completed' },
      { id: 't4', title: 'Work In Progress', description: 'Drafting completed in VIT format', timestamp: 'Oct 19, 11:00 AM', status: 'completed' },
      { id: 't5', title: 'Quality Review', description: 'Formatting and citation presentation reviewed', timestamp: 'Oct 19, 02:30 PM', status: 'completed' },
      { id: 't6', title: 'Completed', description: 'Delivered on time', timestamp: 'Oct 19, 03:50 PM', status: 'completed' }
    ],
    deliverables: [
      { id: 'del-1', title: 'Renewable_Battery_Research_Final.docx', fileType: 'DOCX', fileSize: '1.8 MB', uploadedAt: 'Oct 19, 03:50 PM', downloadUrl: '#' },
    ]
  },
  {
    id: 'CMP-0915',
    customerId: 'cust-alex-1',
    customerName: 'Alex Carter',
    customerEmail: 'alex.carter@vit.ac.in',
    whatsappNumber: '+91 75592 25529',
    college: 'Vellore Institute of Technology',
    serviceId: 'poster-design',
    serviceName: 'Poster Design',
    isPackage: false,
    pricingType: 'fixed',
    topic: 'Quantum Key Distribution in Optical Networks',
    pagesOrSlides: 1,
    deadline: 'Completed',
    instructions: 'A1 vertical orientation for National Science Day exhibition.',
    hasCollegeTemplate: false,
    referenceFiles: [],
    subtotal: 250,
    finalPrice: 250,
    discount: 50,
    discountEligible: true,
    total: 200,
    quoteStatus: 'not_required',
    paymentStatus: 'paid',
    status: 'completed',
    requiresReview: false,
    progressPercent: 100,
    createdAt: 'Oct 10, 11:00 AM',
    updatedAt: 'Oct 11, 12:30 PM',
    estimatedDelivery: 'Oct 11, 01:00 PM',
    timeline: [
      { id: 't1', title: 'Order Received', description: 'Poster theme received', timestamp: 'Oct 10, 11:00 AM', status: 'completed' },
      { id: 't2', title: 'Completed', description: 'Print-ready vector exported', timestamp: 'Oct 11, 12:30 PM', status: 'completed' }
    ],
    deliverables: [
      { id: 'del-3', title: 'Quantum_Poster_A1_300DPI_Print.pdf', fileType: 'PDF', fileSize: '8.4 MB', uploadedAt: 'Oct 11, 12:30 PM', downloadUrl: '#' }
    ]
  }
];

export const PORTFOLIO_SAMPLES: PortfolioItem[] = [
  {
    id: 'p1',
    title: 'AI in Healthcare & Robotic Surgery',
    category: 'Presentations',
    pages: '20 Slides (College Template)',
    grade: 'A+ Grade',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    summary: 'High-impact medical tech presentation designed inside university prescribed layout with custom 3D anatomical charts, visual hierarchy, and speaker notes.',
    tags: ['Machine Learning', 'Medical PPT', 'Infographics', 'College Format']
  },
  {
    id: 'p2',
    title: 'Blockchain Smart Contract Security Audit',
    category: 'Documentation',
    pages: '18 Pages',
    grade: '10/10 Score',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    summary: 'Comprehensive IEEE formatted technical report detailing vulnerability vectors, re-entrancy attack simulations, and audit scripts.',
    tags: ['IEEE Standard', 'Code Snippets', 'Cybersecurity']
  },
  {
    id: 'p3',
    title: 'Neural Networks & Deep Learning Symposium',
    category: 'Design Services',
    pages: 'A0 Poster',
    grade: '1st Prize',
    thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    summary: 'Vector exhibition poster with high-contrast network architecture diagrams, math notation, and QR code to code repository.',
    tags: ['Academic Poster', 'Print Ready', 'Vector Art']
  },
  {
    id: 'p4',
    title: 'FinTech Full-Stack Web Internship Report',
    category: 'Internship Support',
    pages: '20 Pages + Deck',
    grade: 'O Grade',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    summary: 'Complete legitimate internship documentation binder with weekly task logs, sprint charts, database schemas, and external viva Q&A handbook.',
    tags: ['Internship Dossier', 'Full Package', 'Viva Guide']
  }
];

export const FAQ_DATA: FAQItem[] = [
  {
    category: 'Ordering & Delivery',
    question: 'How fast can CAMPORA deliver my assignment or PPT?',
    answer: 'We offer flexible turnarounds to match your deadline! Our standard turnaround is 24-48 hours. For urgent needs, our Urgent PPT service delivers within 1–3 hours (starting from ₹400).'
  },
  {
    category: 'College Templates',
    question: 'Can you follow my university’s official formatting template?',
    answer: 'Yes. If the selected service supports templates, upload your university or department format during checkout and include any specific instructions. We will use it as the formatting reference for the work.'
  },
  {
    category: 'Pricing & Limits',
    question: 'What is the 20-page / 20-slide limit policy?',
    answer: 'Our listed base prices for Presentations (Basic ₹250, Premium ₹350) and Reports (College Report ₹200, Word File ₹200, Internship Report ₹300) include up to 20 slides or pages. If your document exceeds 20 pages/slides, our team reviews the additional scope to provide transparent pricing.'
  },
  {
    category: 'Quality & Authenticity',
    question: 'How do you handle originality and citations?',
    answer: 'We prepare work from the brief and source material agreed for your order, and can format citations where requested. We do not promise a specific similarity score or provide a Turnitin report unless that is explicitly part of an agreed service. Students should review the work and follow their institution’s academic integrity rules.'
  },
  {
    category: 'Support & Revisions',
    question: 'What if my professor asks for changes or feedback?',
    answer: 'Revision availability depends on the selected service and the scope confirmed before work begins. If a revision is included, contact us during support hours with the requested changes and your order ID.'
  },
  {
    category: 'Payment & Privacy',
    question: 'Is my personal information and college details safe?',
    answer: 'Order files are stored in a private bucket and access is restricted to the customer account and authorized CAMPORA administrators. We use submitted details to process and support the order, and do not publish customer files.'
  },
  {
    category: 'Internship Support',
    question: 'What is included in the ₹499 Complete Internship Package?',
    answer: 'The package covers internship documentation support using the student's genuine internship or project details: report formatting, a presentation deck, activity-log templates and viva preparation. CAMPORA does not issue third-party internship certificates.'
  }
];

