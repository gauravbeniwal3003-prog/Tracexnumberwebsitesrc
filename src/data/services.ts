export interface SubService {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  fee: number;
  plan: 'Silver' | 'Gold' | 'VIP';
  inputLabel: string;
  inputPlaceholder: string;
  serviceType: 'phone' | 'telegram' | 'adhr' | 'vehicle' | 'email' | 'veh_owner_num';
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
  }
];
