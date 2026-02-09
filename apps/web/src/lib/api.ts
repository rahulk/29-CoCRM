import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface CreateTenantPayload {
    company_name: string;
    city: string;
    admin_name: string;
}

export interface DiscoverLeadsPayload {
    keyword: string;
    location: {
        lat: number;
        lng: number;
    };
    radius?: number;
    next_page_token?: string;
    preview_mode?: boolean;
}

export interface ActivateTrialPayload {
    lead_count?: number;
}

export const createTenantFn = httpsCallable<CreateTenantPayload, { success: true; tenant_id: string }>(functions, 'createTenant');
export const discoverLeadsFn = httpsCallable<DiscoverLeadsPayload, any>(functions, 'discoverLeads');
export const activateTrialFn = httpsCallable<ActivateTrialPayload, { success: true }>(functions, 'activateTrial');
