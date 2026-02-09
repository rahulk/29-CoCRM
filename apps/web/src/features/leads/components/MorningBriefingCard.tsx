import type { Lead } from "../types";
import { getHealthStatus } from "../utils/leadUtils";

interface BriefingCounts {
    replied: number;
    needsAttention: number;
    followUpsDue: number;
    newLeads: number;
}

function computeCounts(leads: Lead[]): BriefingCounts {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let replied = 0;
    let needsAttention = 0;
    let followUpsDue = 0;
    let newLeads = 0;

    for (const lead of leads) {
        if (lead.is_archived) continue;

        if (lead.status === 'responded') {
            replied++;
        }

        const health = getHealthStatus(lead);
        if (health === 'red' && !['won', 'converted', 'lost'].includes(lead.status)) {
            needsAttention++;
        }

        if (lead.next_follow_up_at) {
            const followUp = lead.next_follow_up_at?.toDate
                ? lead.next_follow_up_at.toDate()
                : new Date(lead.next_follow_up_at);
            if (followUp <= todayEnd && !['won', 'converted', 'lost'].includes(lead.status)) {
                followUpsDue++;
            }
        }

        if (lead.status === 'new') {
            newLeads++;
        }
    }

    return { replied, needsAttention, followUpsDue, newLeads };
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

interface MorningBriefingCardProps {
    leads: Lead[];
    userName?: string;
    onStartDay?: () => void;
}

export function MorningBriefingCard({ leads, userName, onStartDay }: MorningBriefingCardProps) {
    const counts = computeCounts(leads);
    const greeting = getGreeting();
    const totalActionable = counts.replied + counts.needsAttention + counts.followUpsDue;

    if (totalActionable === 0 && counts.newLeads === 0) {
        return (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
                <h2 className="text-lg font-bold">
                    {greeting}{userName ? `, ${userName}` : ''}! 🎉
                </h2>
                <p className="text-emerald-100 text-sm mt-1">All caught up! No leads need attention right now.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50">
            <h2 className="text-lg font-bold">
                {greeting}{userName ? `, ${userName}` : ''}! ☀️
            </h2>

            <div className="mt-3 space-y-1.5">
                {counts.replied > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-base">🔥</span>
                        <span className="text-white/90">
                            <strong className="text-white">{counts.replied}</strong> lead{counts.replied > 1 ? 's' : ''} replied
                        </span>
                    </div>
                )}
                {counts.needsAttention > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-base">🔴</span>
                        <span className="text-white/90">
                            <strong className="text-white">{counts.needsAttention}</strong> lead{counts.needsAttention > 1 ? 's' : ''} slipping away
                        </span>
                    </div>
                )}
                {counts.followUpsDue > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-base">📞</span>
                        <span className="text-white/90">
                            <strong className="text-white">{counts.followUpsDue}</strong> follow-up{counts.followUpsDue > 1 ? 's' : ''} due today
                        </span>
                    </div>
                )}
                {counts.newLeads > 0 && counts.replied === 0 && counts.needsAttention === 0 && counts.followUpsDue === 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-base">🆕</span>
                        <span className="text-white/90">
                            <strong className="text-white">{counts.newLeads}</strong> new lead{counts.newLeads > 1 ? 's' : ''} to reach out to
                        </span>
                    </div>
                )}
            </div>

            {totalActionable > 0 && onStartDay && (
                <button
                    onClick={onStartDay}
                    className="mt-4 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm border border-white/20"
                >
                    ▶️ Start My Day ({totalActionable} to action)
                </button>
            )}
        </div>
    );
}
