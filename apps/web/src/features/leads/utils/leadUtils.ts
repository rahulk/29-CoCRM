import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lead } from "../types";

// ─── Health Ring ───────────────────────────────────────────

export type HealthStatus = 'green' | 'yellow' | 'red' | 'grey';

export interface HealthThresholds {
    green_days: number;
    yellow_days: number;
}

const DEFAULT_THRESHOLDS: HealthThresholds = { green_days: 7, yellow_days: 30 };

export function getHealthStatus(
    lead: Lead,
    thresholds: HealthThresholds = DEFAULT_THRESHOLDS
): HealthStatus {
    if (['won', 'converted', 'lost'].includes(lead.status)) return 'grey';
    if (!lead.last_contacted_at) return 'red';

    const lastContact = lead.last_contacted_at?.toDate
        ? lead.last_contacted_at.toDate()
        : new Date(lead.last_contacted_at);

    const daysSince = Math.floor(
        (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince <= thresholds.green_days) return 'green';
    if (daysSince <= thresholds.yellow_days) return 'yellow';
    return 'red';
}

export function getHealthRingColor(status: HealthStatus): string {
    switch (status) {
        case 'green': return 'ring-emerald-400 bg-emerald-400';
        case 'yellow': return 'ring-amber-400 bg-amber-400';
        case 'red': return 'ring-red-400 bg-red-400';
        case 'grey': return 'ring-slate-300 bg-slate-300';
    }
}

// ─── Context Line ─────────────────────────────────────────

export function getContextLine(lead: Lead, lastInteraction?: any): string {
    // Priority 1: Last interaction content
    if (lastInteraction) {
        const type = lastInteraction.type;
        const content = lastInteraction.content;
        if (type === 'note' && content?.includes('replied')) {
            return `🔥 ${content}`;
        }
        if (type === 'whatsapp') {
            return content ? `📱 ${content}` : '📱 WhatsApp sent';
        }
        if (type === 'call') {
            return content ? `📞 ${content}` : '📞 Called';
        }
        if (type === 'note') {
            return `📝 ${content}`;
        }
    }

    // Priority 2: Status-based context
    if (lead.status === 'responded') {
        return '🔥 Interested! Follow up now';
    }

    // Priority 3: Health-based context
    const health = getHealthStatus(lead);
    if (health === 'red' && lead.last_contacted_at) {
        const lastContact = lead.last_contacted_at?.toDate
            ? lead.last_contacted_at.toDate()
            : new Date(lead.last_contacted_at);
        const days = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
        return `⚠️ No contact in ${days} days`;
    }

    if (lead.next_follow_up_at) {
        const followUp = lead.next_follow_up_at?.toDate
            ? lead.next_follow_up_at.toDate()
            : new Date(lead.next_follow_up_at);
        if (followUp <= new Date()) {
            return '📞 Follow-up due today';
        }
    }

    // Priority 4: New lead info
    if (lead.status === 'new') {
        const parts: string[] = ['New lead'];
        if (lead.business_details.rating) {
            parts.push(`⭐ ${lead.business_details.rating}`);
        }
        return parts.join(' · ');
    }

    return lead.business_details.address || 'No recent activity';
}

// ─── Time Ago ─────────────────────────────────────────────

export function getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// ─── Implicit Tracking ───────────────────────────────────

export async function logInteraction(
    leadId: string,
    tenantId: string,
    userId: string,
    type: 'whatsapp' | 'call' | 'email' | 'note',
    content?: string
): Promise<void> {
    // 1. Create interaction doc
    await addDoc(collection(db, "interactions"), {
        tenant_id: tenantId,
        lead_id: leadId,
        type,
        direction: 'outbound',
        content: content || `${type === 'whatsapp' ? 'WhatsApp message' : type === 'call' ? 'Phone call' : type === 'email' ? 'Email' : 'Note'}`,
        cost: 0,
        created_by: userId,
        created_at: serverTimestamp(),
    });

    // 2. Update lead's last_contacted_at + auto-transition new → contacted
    const leadRef = doc(db, "leads", leadId);
    const updates: Record<string, any> = {
        last_contacted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        updated_by: userId,
    };

    await updateDoc(leadRef, updates);
}

// ─── Status Labels ────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    new: { label: 'Fresh Lead', emoji: '🆕', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    contacted: { label: 'Reached Out', emoji: '📞', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    responded: { label: 'Interested!', emoji: '🔥', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    converted: { label: 'Customer', emoji: '🤝', color: 'bg-green-50 text-green-700 border-green-200' },
    won: { label: 'Customer', emoji: '🤝', color: 'bg-green-50 text-green-700 border-green-200' },
    lost: { label: 'Not Now', emoji: '❄️', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};
