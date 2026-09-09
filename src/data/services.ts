export interface SubService {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  fee: number;
  plan: 'Silver' | 'Gold' | 'VIP';
  inputLabel: string;
  inputPlaceholder: string;
  serviceType: 'phone' | 'telegram' | 'adhr' | 'vehicle' | 'email' | 'veh_owner_num' | 'bnk';
}

export interface Category {
  id: string;
  title: string;
  countText: string;
  countNum: number;
  iconName: string;
  badgeBg: string;
  badgeText: string;
  subservices: SubService[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'phone',
    title: 'Number Lookup',
    countText: 'Active Service',
    countNum: 1,
    iconName: 'Phone',
    badgeBg: 'bg-emerald-50 border-emerald-100',
    badgeText: 'text-emerald-600',
    subservices: [
      {
        id: 'number-lookup',
        categoryId: 'phone',
        title: 'Number Lookup',
        subtitle: 'Carrier, Location & Telecom Record Lookup',
        fee: 5,
        plan: 'Silver',
        inputLabel: 'MOBILE NUMBER',
        inputPlaceholder: 'Enter 10-digit Mobile No (e.g. 9876543210)',
        serviceType: 'phone'
      }
    ]
  },
  {
    id: 'telegram',
    title: 'Telegram Lookup',
    countText: 'Active Service',
    countNum: 1,
    iconName: 'Send',
    badgeBg: 'bg-sky-50 border-sky-100',
    badgeText: 'text-sky-600',
    subservices: [
      {
        id: 'telegram-lookup',
        categoryId: 'telegram',
        title: 'Telegram Lookup',
        subtitle: 'Identify Linked Phone Number from Telegram Handle',
        fee: 10,
        plan: 'Silver',
        inputLabel: 'TELEGRAM USERNAME / ID',
        inputPlaceholder: 'Enter Telegram Username (e.g. @username)',
        serviceType: 'telegram'
      }
    ]
  }
];

export const ALL_CATEGORIES: Category[] = [
  ...CATEGORIES,
  {
    id: 'aadhaar',
    title: 'Aadhaar & Identity',
    countText: '1 Service',
    countNum: 1,
    iconName: 'ShieldCheck',
    badgeBg: 'bg-amber-50 border-amber-100',
    badgeText: 'text-amber-600',
    subservices: [
      {
        id: 'aadhaar-lookup',
        categoryId: 'aadhaar',
        title: 'Aadhaar Identity Verification',
        subtitle: 'Verify Aadhaar status and linked PAN / identity records',
        fee: 10,
        plan: 'Gold',
        inputLabel: 'AADHAAR NUMBER',
        inputPlaceholder: 'Enter 12-digit Aadhaar Number',
        serviceType: 'adhr'
      }
    ]
  },
  {
    id: 'vehicle',
    title: 'Vehicle & Transport',
    countText: '2 Services',
    countNum: 2,
    iconName: 'Car',
    badgeBg: 'bg-orange-50 border-orange-100',
    badgeText: 'text-orange-600',
    subservices: [
      {
        id: 'rc-lookup',
        categoryId: 'vehicle',
        title: 'Vehicle RC Registration Lookup',
        subtitle: 'Fetch Vehicle registration, maker, model & insurance intel',
        fee: 10,
        plan: 'Silver',
        inputLabel: 'VEHICLE NUMBER',
        inputPlaceholder: 'Enter Vehicle Number (e.g. DL01AB1234)',
        serviceType: 'vehicle'
      },
      {
        id: 'veh-owner-num',
        categoryId: 'vehicle',
        title: 'Vehicle Owner Phone Lookup',
        subtitle: 'Find owner mobile number linked to vehicle registration',
        fee: 15,
        plan: 'VIP',
        inputLabel: 'VEHICLE REGISTRATION NUMBER',
        inputPlaceholder: 'Enter Vehicle Number (e.g. MH02CD5678)',
        serviceType: 'veh_owner_num'
      }
    ]
  },
  {
    id: 'banking',
    title: 'Banking & IFSC',
    countText: '1 Service',
    countNum: 1,
    iconName: 'Building2',
    badgeBg: 'bg-emerald-50 border-emerald-100',
    badgeText: 'text-emerald-600',
    subservices: [
      {
        id: 'bank-ifsc-lookup',
        categoryId: 'banking',
        title: 'Bank IFSC & Branch Verification',
        subtitle: 'Verify Indian bank branch, city, address & MICR code',
        fee: 5,
        plan: 'Silver',
        inputLabel: 'IFSC CODE',
        inputPlaceholder: 'Enter 11-digit IFSC code (e.g. SBIN0001234)',
        serviceType: 'bnk'
      }
    ]
  },
  {
    id: 'email',
    title: 'Digital & Email Intel',
    countText: '1 Service',
    countNum: 1,
    iconName: 'Mail',
    badgeBg: 'bg-purple-50 border-purple-100',
    badgeText: 'text-purple-600',
    subservices: [
      {
        id: 'email-lookup',
        categoryId: 'email',
        title: 'Email Address Intelligence',
        subtitle: 'Inspect email deliverability, breach records & domain metadata',
        fee: 5,
        plan: 'Silver',
        inputLabel: 'EMAIL ADDRESS',
        inputPlaceholder: 'Enter Email Address (e.g. target@domain.com)',
        serviceType: 'email'
      }
    ]
  }
];
