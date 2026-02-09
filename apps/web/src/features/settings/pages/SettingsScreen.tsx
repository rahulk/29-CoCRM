
import { useState } from "react";
import { useCurrentTenant } from "@/features/auth/hooks/useCurrentTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

export default function SettingsScreen() {
    const { data: tenant } = useCurrentTenant();
    const { claims } = useAuth();

    // Local state for editing quick replies
    const [isEditing, setIsEditing] = useState(false);
    const [quickReplies, setQuickReplies] = useState<Array<{ label: string, message: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize local state from tenant data when not editing
    if (!isEditing && tenant && tenant.config?.quick_replies && quickReplies.length === 0) {
        setQuickReplies(tenant.config.quick_replies);
    }

    const handleEditToggle = () => {
        if (!isEditing && tenant?.config?.quick_replies) {
            setQuickReplies([...tenant.config.quick_replies]);
        }
        setIsEditing(!isEditing);
    };

    const handleAddReply = () => {
        setQuickReplies([...quickReplies, { label: "New Reply", message: "Hi! ..." }]);
    };

    const handleRemoveReply = (index: number) => {
        const newReplies = [...quickReplies];
        newReplies.splice(index, 1);
        setQuickReplies(newReplies);
    };

    const handleUpdateReply = (index: number, field: 'label' | 'message', value: string) => {
        const newReplies = [...quickReplies];
        newReplies[index] = { ...newReplies[index], [field]: value };
        setQuickReplies(newReplies);
    };

    const handleSave = async () => {
        if (!tenant?.id || !claims?.tenant_id) return;
        setIsLoading(true);

        try {
            const tenantRef = doc(db, "tenants", tenant.id);
            await updateDoc(tenantRef, {
                "config.quick_replies": quickReplies,
                updated_at: serverTimestamp(),
                updated_by: auth.currentUser?.uid
            });
            toast.success("Quick replies saved!");
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to save settings.");
        } finally {
            setIsLoading(false);
        }
    };

    // Placeholder function until we have a real auth export
    const auth = { currentUser: { uid: claims?.user_id || 'unknown' } }; // Simplified for now

    if (!tenant) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="pb-24 pt-4 px-4 space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Send className="h-5 w-5 text-indigo-600" />
                                Quick Replies
                            </CardTitle>
                            <CardDescription>
                                Manage the templates available in your Send Info drawer.
                            </CardDescription>
                        </div>
                        <Button variant={isEditing ? "ghost" : "outline"} onClick={handleEditToggle} disabled={isLoading}>
                            {isEditing ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        // EDIT MODE
                        <div className="space-y-6">
                            {quickReplies.map((reply, index) => (
                                <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-200 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={() => handleRemoveReply(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>

                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Label</Label>
                                            <Input
                                                value={reply.label}
                                                onChange={(e) => handleUpdateReply(index, 'label', e.target.value)}
                                                className="bg-white h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Message Content</Label>
                                            <Textarea
                                                value={reply.message}
                                                onChange={(e) => handleUpdateReply(index, 'message', e.target.value)}
                                                className="bg-white text-sm"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={handleAddReply} className="w-full border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Template
                            </Button>

                            <Button onClick={handleSave} className="w-full" disabled={isLoading}>
                                {isLoading ? <Save className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    ) : (
                        // VIEW MODE
                        <div className="space-y-3">
                            {tenant.config?.quick_replies?.map((reply: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 bg-white">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-medium text-slate-900 text-sm">{reply.label}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{reply.message}</p>
                                    </div>
                                </div>
                            ))}
                            {(!tenant.config?.quick_replies || tenant.config.quick_replies.length === 0) && (
                                <p className="text-sm text-slate-500 italic text-center py-4">
                                    No quick replies set. Click Edit to add some!
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="text-center">
                <p className="text-xs text-slate-400">
                    Business Type: <span className="font-medium text-slate-600 capitalize">{tenant.config?.business_type?.replace('_', ' ') || 'Not Set'}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    Health Thresholds: 🟢 {tenant.config?.health_thresholds?.green_days || 7}d · 🟡 {tenant.config?.health_thresholds?.yellow_days || 30}d
                </p>
            </div>

            {/* Archived Leads Section */}
            <ArchivedLeadsCard tenantId={tenant.id} />
        </div>
    );
}

function ArchivedLeadsCard({ tenantId }: { tenantId: string }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: archivedLeads, isLoading } = useQuery({
        queryKey: ['archived-leads', tenantId],
        queryFn: async () => {
            const q = query(
                collection(db, 'leads'),
                where('tenant_id', '==', tenantId),
                where('is_archived', '==', true),
                orderBy('archived_at', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    });

    const restoreMutation = useMutation({
        mutationFn: async (leadId: string) => {
            if (!user) return;
            const leadRef = doc(db, 'leads', leadId);
            await updateDoc(leadRef, {
                is_archived: false,
                updated_at: serverTimestamp(),
                updated_by: user.uid
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['archived-leads'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success("Lead restored successfully");
        },
        onError: () => toast.error("Failed to restore lead")
    });

    if (isLoading) return null;
    if (!archivedLeads || archivedLeads.length === 0) return null;

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                    <Trash2 className="h-5 w-5" />
                    Archived Leads
                </CardTitle>
                <CardDescription>
                    Restore leads that were previously archived.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {archivedLeads.map((lead: any) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                            <div>
                                <p className="font-medium text-slate-900 text-sm">{lead.business_details?.name}</p>
                                <p className="text-xs text-slate-500">
                                    Archived {lead.archived_at?.toDate().toLocaleDateString()}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreMutation.mutate(lead.id)}
                                disabled={restoreMutation.isPending}
                            >
                                {restoreMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                Restore
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
