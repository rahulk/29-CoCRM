import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";
// import { Button } from "@/components/ui/button"; // Unused
import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge"; // Unused
import { ListChecks, Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { format, isToday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TaskListScreen() {
    const { claims, user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch Leads with Follow-ups
    const { data: tasks, isLoading } = useQuery({
        queryKey: ["tasks"],
        queryFn: async () => {
            if (!claims?.tenant_id) return [];

            // Note: Firestore requires an index for this compound query
            // tenant_id == X AND next_follow_up_at > 0
            // For now, we'll fetch leads with follow-ups. 
            // In a real large app, we'd want a dedicated 'tasks' collection or better indexing.
            // A simple way for MVP: fetch all leads for tenant, then filter in memory (if < 1000 leads).
            // BETTER MVP: Query leads where 'next_follow_up_at' is not null. 
            // Firestore limitation: cannot filter by != null directly easily with other fields without index.
            // Let's rely on client-side filtering of the main leads list if available, OR
            // standard query: order by next_follow_up_at.

            const q = query(
                collection(db, "leads"),
                where("tenant_id", "==", claims.tenant_id),
                orderBy("next_follow_up_at", "asc")
            );

            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(l => l.next_follow_up_at && !l.is_archived && !['won', 'lost', 'converted'].includes(l.status));
        },
        enabled: !!claims?.tenant_id
    });

    // Complete Task Mutation
    const completeTaskMutation = useMutation({
        mutationFn: async (leadId: string) => {
            if (!user) return;
            await updateDoc(doc(db, "leads", leadId), {
                next_follow_up_at: null, // Clear the follow-up
                updated_at: serverTimestamp(),
                updated_by: user.uid
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success("Task completed!");
        }
    });

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    }

    // Grouping Logic
    const overdue: any[] = [];
    const today: any[] = [];
    const upcoming: any[] = [];

    tasks?.forEach(task => {
        const date = task.next_follow_up_at?.toDate ? task.next_follow_up_at.toDate() : new Date(task.next_follow_up_at);
        // Reset time to start of day for comparison to keep 'today' bucket accurate
        const dateStr = format(date, "yyyy-MM-dd");
        const todayStr = format(new Date(), "yyyy-MM-dd");

        if (dateStr === todayStr) {
            today.push({ ...task, date });
        } else if (date < new Date() && dateStr !== todayStr) {
            overdue.push({ ...task, date });
        } else {
            upcoming.push({ ...task, date });
        }
    });

    const hasTasks = tasks && tasks.length > 0;

    return (
        <div className="space-y-6 pb-20 p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">Tasks & Follow-ups</h1>
                    <p className="text-slate-500 text-sm">Manage your scheduled calls and actions.</p>
                </div>
                {/* <Button onClick={() => navigate("/leads")}>Schedule New</Button> */}
            </div>

            {!hasTasks ? (
                <div className="py-12">
                    <EmptyState
                        icon={ListChecks}
                        title="All caught up!"
                        description="You have no pending tasks. Go to a lead to schedule a follow-up."
                        action={{ label: "View Leads", onClick: () => navigate("/leads") }}
                    />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Overdue Section */}
                    {overdue.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> Overdue ({overdue.length})
                            </h2>
                            <div className="grid gap-3">
                                {overdue.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        type="overdue"
                                        onComplete={() => completeTaskMutation.mutate(task.id)}
                                        onClick={() => navigate(`/leads/${task.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Today Section */}
                    {today.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Due Today ({today.length})
                            </h2>
                            <div className="grid gap-3">
                                {today.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        type="today"
                                        onComplete={() => completeTaskMutation.mutate(task.id)}
                                        onClick={() => navigate(`/leads/${task.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Section */}
                    {upcoming.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Upcoming ({upcoming.length})
                            </h2>
                            <div className="grid gap-3">
                                {upcoming.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        type="upcoming"
                                        onComplete={() => completeTaskMutation.mutate(task.id)}
                                        onClick={() => navigate(`/leads/${task.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

function TaskCard({ task, type, onComplete, onClick }: { task: any, type: 'overdue' | 'today' | 'upcoming', onComplete: () => void, onClick: () => void }) {
    return (
        <Card className={`group relative overflow-hidden transition-all hover:shadow-md border-l-4 ${type === 'overdue' ? 'border-l-red-500 bg-red-50/10' :
            type === 'today' ? 'border-l-blue-500 bg-blue-50/10' :
                'border-l-slate-300 bg-white'
            }`}>
            <CardContent className="p-4 flex items-center gap-4">

                {/* Checkbox Action */}
                <button
                    onClick={(e) => { e.stopPropagation(); onComplete(); }}
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${type === 'overdue' ? 'border-red-200 hover:bg-red-100 text-red-600' :
                        type === 'today' ? 'border-blue-200 hover:bg-blue-100 text-blue-600' :
                            'border-slate-200 hover:bg-slate-100 text-slate-400'
                        }`}
                    title="Mark Complete"
                >
                    <CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                </button>

                {/* Content */}
                <div className="flex-1 cursor-pointer" onClick={onClick}>
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-slate-900">{task.business_details.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${type === 'overdue' ? 'bg-red-100 text-red-700' :
                            type === 'today' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            {isToday(task.date) ? 'Today' :
                                isTomorrow(task.date) ? 'Tomorrow' :
                                    format(task.date, 'MMM d')}
                        </span>
                    </div>

                    {/* Notes snippet or Phone */}
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        {task.business_details.phone ? task.business_details.phone : 'No phone'}
                        {task.last_interaction && (
                            <span className="text-xs text-slate-400">• Last: {task.last_interaction.type}</span>
                        )}
                    </p>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
            </CardContent>
        </Card>
    );
}
