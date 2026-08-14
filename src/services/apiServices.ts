import { supabase } from './supabase';

export interface ApiServiceConfig {
  id: string;
  title: string;
  category: string;
  fee: number;
  serviceCode: string;
  inputLabel: string;
  inputPlaceholder: string;
  sampleQuery: string;
  subtitle: string;
  iconName: string;
  is_active: boolean;
  serviceType: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'vehicle' | 'email' | 'veh_owner_num';
}

export const DEFAULT_API_SERVICES: ApiServiceConfig[] = [
  {
    id: "phone",
    title: "Number Lookup",
    category: "Phone & Telecom",
    fee: 2,
    serviceCode: "phone",
    inputLabel: "MOBILE NUMBER",
    inputPlaceholder: "Enter 10-digit Mobile No (e.g. 9876543210)",
    sampleQuery: "9876543210",
    subtitle: "Carrier, Location & Telecom Record Lookup",
    iconName: "Phone",
    is_active: true,
    serviceType: "phone"
  },
  {
    id: "email",
    title: "Email Lookup",
    category: "Email & Digital ID",
    fee: 20,
    serviceCode: "email",
    inputLabel: "EMAIL ADDRESS",
    inputPlaceholder: "Enter Email (e.g. user@gmail.com)",
    sampleQuery: "user@gmail.com",
    subtitle: "Digital Footprint & Account Lookup",
    iconName: "Mail",
    is_active: true,
    serviceType: "email"
  },
  {
    id: "telegram",
    title: "Telegram To Number Lookup",
    category: "Telegram & Social",
    fee: 5,
    serviceCode: "telegram",
    inputLabel: "TELEGRAM USERNAME / ID",
    inputPlaceholder: "Enter Telegram Username (e.g. @username)",
    sampleQuery: "@username",
    subtitle: "Identify Linked Phone Number from Telegram Handle",
    iconName: "Send",
    is_active: true,
    serviceType: "telegram"
  },
  {
    id: "adhr",
    title: "Aadhar Lookup",
    category: "Aadhaar Services",
    fee: 20,
    serviceCode: "adhr",
    inputLabel: "AADHAAR NUMBER",
    inputPlaceholder: "Enter 12-digit Aadhaar No (e.g. 998877665544)",
    sampleQuery: "998877665544",
    subtitle: "Aadhaar Verification & Identity Info",
    iconName: "ShieldCheck",
    is_active: true,
    serviceType: "adhr"
  },
  {
    id: "bnk",
    title: "IFSC Lookup",
    category: "Banking & Financial",
    fee: 5,
    serviceCode: "bnk",
    inputLabel: "IFSC CODE",
    inputPlaceholder: "Enter 11-character IFSC Code (e.g. SBIN0001234)",
    sampleQuery: "SBIN0001234",
    subtitle: "Bank Branch Name, Address & MICR Details",
    iconName: "Building2",
    is_active: true,
    serviceType: "bnk"
  },
  {
    id: "vehicle",
    title: "Vehicle Lookup",
    category: "Vehicle & Transport",
    fee: 10,
    serviceCode: "vehicle",
    inputLabel: "VEHICLE NUMBER",
    inputPlaceholder: "Enter Vehicle Reg No (e.g. DL01AB1234)",
    sampleQuery: "DL01AB1234",
    subtitle: "Vehicle RC Details, Registration & RTO Specifications",
    iconName: "Car",
    is_active: true,
    serviceType: "vehicle"
  },
  {
    id: "veh_owner_num",
    title: "Vehicle To Owner Number",
    category: "Vehicle & Transport",
    fee: 20,
    serviceCode: "veh_owner_num",
    inputLabel: "VEHICLE NUMBER",
    inputPlaceholder: "Enter Vehicle Reg No (e.g. DL01AB1234)",
    sampleQuery: "DL01AB1234",
    subtitle: "Fetch Owner Mobile Phone Number from Vehicle No",
    iconName: "UserCheck",
    is_active: true,
    serviceType: "veh_owner_num"
  }
];

const LOCAL_STORAGE_KEY = 'tracex_api_services_config';

/**
 * Fetch services from Supabase table `api_services` or fallback to default config
 */
export async function getApiServices(): Promise<ApiServiceConfig[]> {
  try {
    const { data, error } = await supabase
      .from('api_services')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      // Map database rows to ApiServiceConfig
      return data.map((item: any) => ({
        id: item.id || item.service_code,
        title: item.title || item.name,
        category: item.category || 'General Services',
        fee: Number(item.fee ?? item.price ?? 10),
        serviceCode: item.service_code || item.id,
        inputLabel: item.input_label || 'QUERY INPUT',
        inputPlaceholder: item.input_placeholder || 'Enter search query',
        sampleQuery: item.sample_query || '9876543210',
        subtitle: item.subtitle || item.description || '',
        iconName: item.icon_name || 'Zap',
        is_active: item.is_active !== false,
        serviceType: (item.service_type || item.service_code || item.id) as any
      }));
    }
  } catch (err) {
    console.warn('Could not query api_services table from Supabase:', err);
  }

  // Fallback to LocalStorage or Default
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore local storage parse error
  }

  return DEFAULT_API_SERVICES;
}

/**
 * Save or update a service config in Supabase table `api_services` and localStorage
 */
export async function updateApiServiceConfig(service: ApiServiceConfig): Promise<boolean> {
  // Always update local cache
  try {
    const current = await getApiServices();
    const updated = current.map(s => s.id === service.id ? service : s);
    if (!current.some(s => s.id === service.id)) {
      updated.push(service);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving to localStorage', e);
  }

  // Attempt Supabase upsert
  try {
    const payload = {
      id: service.id,
      title: service.title,
      category: service.category,
      fee: service.fee,
      service_code: service.serviceCode,
      input_label: service.inputLabel,
      input_placeholder: service.inputPlaceholder,
      sample_query: service.sampleQuery,
      subtitle: service.subtitle,
      icon_name: service.iconName,
      is_active: service.is_active,
      service_type: service.serviceType,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('api_services')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert api_services notice:', error.message);
    }
    return true;
  } catch (err) {
    console.warn('Supabase api_services error:', err);
    return true; // LocalStorage backup succeeded
  }
}
