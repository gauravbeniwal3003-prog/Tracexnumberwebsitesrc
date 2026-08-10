export interface SubService {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  fee: number;
  plan: 'Silver' | 'Gold' | 'VIP';
  inputLabel: string;
  inputPlaceholder: string;
  serviceType: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'vehicle' | 'pancard' | 'aadhaar_to_pan' | 'email' | 'veh_owner_num';
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
    title: 'Phone & Telecom',
    countText: '1 Service',
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
        fee: 3,
        plan: 'Silver',
        inputLabel: 'MOBILE NUMBER',
        inputPlaceholder: 'Enter 10-digit Mobile No (e.g. 9876543210)',
        serviceType: 'phone'
      }
    ]
  },
  {
    id: 'email',
    title: 'Email & Digital ID',
    countText: '1 Service',
    countNum: 1,
    iconName: 'Mail',
    badgeBg: 'bg-indigo-50 border-indigo-100',
    badgeText: 'text-indigo-600',
    subservices: [
      {
        id: 'email-lookup',
        categoryId: 'email',
        title: 'Email Lookup',
        subtitle: 'Digital Footprint & Account Lookup',
        fee: 20,
        plan: 'Silver',
        inputLabel: 'EMAIL ADDRESS',
        inputPlaceholder: 'Enter Email (e.g. user@gmail.com)',
        serviceType: 'email'
      }
    ]
  },
  {
    id: 'telegram',
    title: 'Telegram & Social',
    countText: '1 Service',
    countNum: 1,
    iconName: 'Send',
    badgeBg: 'bg-sky-50 border-sky-100',
    badgeText: 'text-sky-600',
    subservices: [
      {
        id: 'telegram-lookup',
        categoryId: 'telegram',
        title: 'Telegram To Number Lookup',
        subtitle: 'Identify Linked Phone Number from Telegram Handle',
        fee: 10,
        plan: 'Silver',
        inputLabel: 'TELEGRAM USERNAME / ID',
        inputPlaceholder: 'Enter Telegram Username (e.g. @username)',
        serviceType: 'telegram'
      }
    ]
  },
  {
    id: 'aadhaar',
    title: 'Aadhaar Services',
    countText: '1 Service',
    countNum: 1,
    iconName: 'ShieldCheck',
    badgeBg: 'bg-orange-50 border-orange-100',
    badgeText: 'text-amber-600',
    subservices: [
      {
        id: 'aadhar-lookup',
        categoryId: 'aadhaar',
        title: 'Aadhar Lookup',
        subtitle: 'Aadhaar Verification & Identity Info',
        fee: 25,
        plan: 'Silver',
        inputLabel: 'AADHAAR NUMBER',
        inputPlaceholder: 'Enter 12-digit Aadhaar No (e.g. 998877665544)',
        serviceType: 'adhr'
      }
    ]
  },
  {
    id: 'banking',
    title: 'Banking & Financial',
    countText: '1 Service',
    countNum: 1,
    iconName: 'Building2',
    badgeBg: 'bg-purple-50 border-purple-100',
    badgeText: 'text-purple-600',
    subservices: [
      {
        id: 'ifsc-lookup',
        categoryId: 'banking',
        title: 'IFSC Lookup',
        subtitle: 'Bank Branch Name, Address & MICR Details',
        fee: 5,
        plan: 'Silver',
        inputLabel: 'IFSC CODE',
        inputPlaceholder: 'Enter 11-character IFSC Code (e.g. SBIN0001234)',
        serviceType: 'bnk'
      }
    ]
  },
  {
    id: 'vehicle',
    title: 'Vehicle & Transport',
    countText: '2 Services',
    countNum: 2,
    iconName: 'Car',
    badgeBg: 'bg-amber-50 border-amber-100',
    badgeText: 'text-amber-600',
    subservices: [
      {
        id: 'vehicle-lookup',
        categoryId: 'vehicle',
        title: 'Vehicle Lookup',
        subtitle: 'Vehicle RC Details, Registration & RTO Specs',
        fee: 20,
        plan: 'Silver',
        inputLabel: 'VEHICLE NUMBER',
        inputPlaceholder: 'Enter Vehicle Reg No (e.g. DL01AB1234)',
        serviceType: 'vehicle'
      },
      {
        id: 'vehicle-to-owner-number',
        categoryId: 'vehicle',
        title: 'Vehicle To Owner Number',
        subtitle: 'Fetch Owner Mobile Phone Number from Vehicle No',
        fee: 35,
        plan: 'Gold',
        inputLabel: 'VEHICLE NUMBER',
        inputPlaceholder: 'Enter Vehicle Reg No (e.g. DL01AB1234)',
        serviceType: 'veh_owner_num'
      }
    ]
  }
];
