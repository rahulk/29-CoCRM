
export interface Lead {
    id: string;
    tenant_id: string;
    business_details: {
        name: string;
        address: string;
        phone: string;
        website: string;
        rating?: number;
        review_count?: number;
        google_place_id?: string;
        opening_hours?: {
            open_now?: boolean;
        };
    };
    contact_details: {
        email?: string;
        phone?: string;
        social?: any;
        name?: string;
    };
    status: 'new' | 'contacted' | 'responded' | 'converted' | 'won' | 'lost';
    enrichment_status: 'pending' | 'processing' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high';
    source?: 'google_places' | 'manual' | 'referral' | 'website';
    ai_analysis?: {
        score?: number;
        summary?: string;
        tags?: string[];
        priority?: string;
    };
    last_contacted_at?: any;
    next_follow_up_at?: any;
    is_archived?: boolean;
    created_at: any;
    updated_at: any;
}
