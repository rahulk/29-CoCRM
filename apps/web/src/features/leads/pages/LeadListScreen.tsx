
import { useState } from "react";
import { useLeads } from "../hooks/useLeads";
import { useAllLeads } from "../hooks/useAllLeads";
import { LeadCard } from "../components/LeadCard";
import { MorningBriefingCard } from "../components/MorningBriefingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convertLeadsToCSV, downloadCSV } from "@/utils/csvExport";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Loader2, MapPin, Edit, Download, Zap, List } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Users2 } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { Lead } from "../types";
import { getHealthStatus } from "../utils/leadUtils";

// ─── Urgency Grouping Logic ────────────────────────────────

interface LeadGroup {
    key: string;
    emoji: string;
    title: string;
    leads: Lead[];
    color: string;
}

function groupLeadsByUrgency(leads: Lead[]): LeadGroup[] {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const replied: Lead[] = [];
    const followUp: Lead[] = [];
    const needsAttention: Lead[] = [];
    const newLeads: Lead[] = [];
    const allGood: Lead[] = [];

    for (const lead of leads) {
        if (lead.is_archived) continue;

        // 1. Replied / Responded
        if (lead.status === 'responded') {
            replied.push(lead);
            continue;
        }

        // 2. Follow up today
        if (lead.next_follow_up_at) {
            const followUpDate = lead.next_follow_up_at?.toDate
                ? lead.next_follow_up_at.toDate()
                : new Date(lead.next_follow_up_at);
            if (followUpDate <= todayEnd && !['won', 'converted', 'lost'].includes(lead.status)) {
                followUp.push(lead);
                continue;
            }
        }

        // 3. Needs attention (red health)
        const health = getHealthStatus(lead);
        if (health === 'red' && !['won', 'converted', 'lost'].includes(lead.status)) {
            needsAttention.push(lead);
            continue;
        }

        // 4. New leads
        if (lead.status === 'new') {
            newLeads.push(lead);
            continue;
        }

        // 5. All good
        if (!['won', 'converted', 'lost'].includes(lead.status)) {
            allGood.push(lead);
        }
    }

    const groups: LeadGroup[] = [];
    if (replied.length > 0) groups.push({ key: 'replied', emoji: '🔥', title: 'REPLIED', leads: replied, color: 'text-orange-600' });
    if (followUp.length > 0) groups.push({ key: 'followup', emoji: '📞', title: 'FOLLOW UP TODAY', leads: followUp, color: 'text-blue-600' });
    if (needsAttention.length > 0) groups.push({ key: 'attention', emoji: '🔴', title: 'NEEDS ATTENTION', leads: needsAttention, color: 'text-red-600' });
    if (newLeads.length > 0) groups.push({ key: 'new', emoji: '🆕', title: 'NEW LEADS', leads: newLeads, color: 'text-blue-500' });
    if (allGood.length > 0) groups.push({ key: 'good', emoji: '✅', title: 'ALL GOOD', leads: allGood, color: 'text-emerald-600' });
    return groups;
}

// ─── Main Component ────────────────────────────────────────

export default function LeadListScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'smart' | 'all'>('smart');
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Smart Feed uses all leads
    const { data: allLeads, isLoading: allLoading, isError: allError } = useAllLeads();

    // All Leads (paginated) mode
    const {
        data: paginatedData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: pageLoading,
        isError: pageError
    } = useLeads({ status: statusFilter });

    const isLoading = viewMode === 'smart' ? allLoading : pageLoading;
    const isError = viewMode === 'smart' ? allError : pageError;

    // Search filtering
    const smartLeads = (allLeads || []).filter(lead =>
        !searchQuery || lead.business_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const paginatedLeads = paginatedData?.pages.flatMap(page => page.leads) || [];
    const filteredPaginatedLeads = paginatedLeads.filter(lead =>
        lead.business_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const urgencyGroups = groupLeadsByUrgency(smartLeads);

    const handleExport = () => {
        const allExport = viewMode === 'smart' ? (allLeads || []) : paginatedLeads;
        if (allExport.length === 0) {
            toast.error("No leads to export");
            return;
        }
        const csv = convertLeadsToCSV(allExport);
        const dateStr = new Date().toISOString().split('T')[0];
        downloadCSV(csv, `leads_export_${dateStr}.csv`);
        toast.success(`Exported ${allExport.length} leads`);
    };

    const userName = user?.displayName?.split(' ')[0] || '';

    return (
        <div className="flex flex-col h-[calc(100vh-64px-56px)] bg-slate-50">
            {/* Header Area */}
            <div className="bg-white border-b sticky top-0 z-20 w-full shadow-sm">
                <div className="px-4 py-3 space-y-3">
                    {/* Search & Actions */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search leads..."
                                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 h-10 transition-all hover:bg-slate-100 focus:bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={handleExport} className="hidden md:flex shrink-0 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-primary h-10 w-10" title="Export CSV">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            className="hidden md:flex bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 h-10 px-4"
                            onClick={() => navigate("/leads/search")}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Lead
                        </Button>
                    </div>

                    {/* View Toggle + Status Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                        {/* Smart / All toggle */}
                        <div className="flex bg-slate-100 rounded-full p-0.5 shrink-0 mr-1">
                            <button
                                onClick={() => setViewMode('smart')}
                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${viewMode === 'smart'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Zap className="w-3 h-3" />
                                Smart
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${viewMode === 'all'
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <List className="w-3 h-3" />
                                All
                            </button>
                        </div>

                        {/* Status pills — only visible in "All" mode */}
                        {viewMode === 'all' && (
                            <>
                                {['all', 'new', 'contacted', 'responded', 'converted', 'lost'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`
                                            whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                                            ${statusFilter === status
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                        `}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <p className="text-sm text-slate-500">Loading your leads...</p>
                    </div>
                ) : isError ? (
                    <div className="text-center py-20 text-red-500 bg-red-50 rounded-lg mx-4 border border-red-100">
                        <p className="font-semibold">Unable to load leads</p>
                        <Button variant="link" onClick={() => window.location.reload()} className="text-red-700">Retry</Button>
                    </div>
                ) : viewMode === 'smart' ? (
                    /* ── Smart Feed ── */
                    <div className="space-y-4 pb-24">
                        {/* Morning Briefing */}
                        <MorningBriefingCard
                            leads={allLeads || []}
                            userName={userName}
                        />

                        {urgencyGroups.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center pb-20 pt-10">
                                <EmptyState
                                    icon={Users2}
                                    title="No leads yet"
                                    description="Your list is empty. Start by finding fresh leads!"
                                    action={{ label: "Find Leads on Maps", onClick: () => navigate("/leads/search") }}
                                />
                            </div>
                        ) : (
                            urgencyGroups.map(group => (
                                <div key={group.key}>
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <span className="text-base">{group.emoji}</span>
                                        <h3 className={`text-xs font-bold tracking-wider ${group.color}`}>
                                            {group.title} ({group.leads.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {group.leads.map(lead => (
                                            <LeadCard key={lead.id} lead={lead} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* ── All Leads (paginated) ── */
                    filteredPaginatedLeads.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center pb-20">
                            <EmptyState
                                icon={Users2}
                                title={searchQuery ? "No matches found" : "No leads yet"}
                                description={searchQuery ? `We couldn't find "${searchQuery}"` : "Your list is empty. Start by finding fresh leads!"}
                                action={!searchQuery ? { label: "Find Leads on Maps", onClick: () => navigate("/leads/search") } : undefined}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2 pb-24">
                            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                <span>Showing {filteredPaginatedLeads.length} leads</span>
                            </div>

                            {filteredPaginatedLeads.map(lead => (
                                <LeadCard key={lead.id} lead={lead} />
                            ))}

                            {hasNextPage && (
                                <div className="flex justify-center pt-6 pb-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="w-full max-w-xs"
                                    >
                                        {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isFetchingNextPage ? "Loading..." : "Load More Leads"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Mobile FAB */}
            <div className="fixed bottom-20 right-5 md:hidden z-30">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="rounded-full h-14 w-14 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-transform active:scale-95">
                            <Plus className="h-7 w-7" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="mb-2 w-56 p-2 rounded-xl shadow-2xl border-indigo-100">
                        <DropdownMenuItem onClick={() => navigate("/leads/search")} className="p-3 gap-3 rounded-lg focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer text-base">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Find on Maps</span>
                                <span className="text-xs text-muted-foreground">Search Google automatically</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/leads/add")} className="p-3 gap-3 rounded-lg focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer text-base">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Edit className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Add Manually</span>
                                <span className="text-xs text-muted-foreground">Type details yourself</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
