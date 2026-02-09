import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Star, Reply, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/feedback/EmptyState";

interface Review {
    id: string;
    reviewer: {
        displayName: string;
        profilePhotoUrl?: string;
    };
    starRating: string; // "FIVE", "FOUR", etc.
    comment: string;
    createTime: string;
    reviewReply?: {
        comment: string;
        updateTime: string;
    } | null;
    locationName: string;
}

export default function ReviewsScreen() {
    const { claims } = useAuth();
    const queryClient = useQueryClient();
    const functions = getFunctions();
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

    // Fetch Reviews
    const { data: reviews, isLoading } = useQuery({
        queryKey: ["reviews"],
        queryFn: async () => {
            if (!claims?.tenant_id) return [];
            const reviewsRef = collection(db, `tenants/${claims.tenant_id}/reviews`);
            // Order by createTime desc (requires index, or client sort for small Lists)
            // Assuming string ISO date sorts okay or we create index.
            const q = query(reviewsRef, orderBy("createTime", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
        },
        enabled: !!claims?.tenant_id
    });

    // Sync Mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const sync = httpsCallable(functions, 'syncReviews');
            await sync();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reviews"] });
            toast.success("Reviews synced successfully!");
        },
        onError: () => toast.error("Failed to sync reviews.")
    });

    // Reply Mutation
    const replyMutation = useMutation({
        mutationFn: async ({ reviewId, text, locationName }: { reviewId: string; text: string; locationName: string }) => {
            const reply = httpsCallable(functions, 'replyToReview');
            await reply({ reviewId, replyText: text, locationName });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reviews"] });
            toast.success("Reply posted!");
            setReplyingTo(null);
            setReplyText("");
        },
        onError: () => toast.error("Failed to post reply.")
    });

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncMutation.mutateAsync();
        } finally {
            setIsSyncing(false);
        }
    };

    const getStarCount = (rating: string) => {
        switch (rating) {
            case "FIVE": return 5;
            case "FOUR": return 4;
            case "THREE": return 3;
            case "TWO": return 2;
            case "ONE": return 1;
            default: return 0;
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">Reputation</h1>
                    <p className="text-slate-500">Manage your Google Reviews</p>
                </div>
                <Button onClick={handleSync} disabled={isSyncing} variant="outline">
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Loader2 className="mr-2 h-4 w-4" />}
                    Sync Reviews
                </Button>
            </div>

            {reviews?.length === 0 ? (
                <EmptyState
                    icon={Star}
                    title="No reviews yet"
                    description="Connect your Google Business Profile in Settings to verify and sync reviews."
                    action={{ label: "Go to Integrations", onClick: () => window.location.href = "/settings/integrations" }}
                />
            ) : (
                <div className="grid gap-4">
                    {reviews?.map((review) => (
                        <Card key={review.id} className="overflow-hidden">
                            <CardHeader className="bg-slate-50/50 pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {review.reviewer.displayName[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{review.reviewer.displayName}</p>
                                            <div className="flex text-amber-400">
                                                {Array.from({ length: getStarCount(review.starRating) }).map((_, i) => (
                                                    <Star key={i} className="h-3 w-3 fill-current" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {formatDistanceToNow(new Date(review.createTime), { addSuffix: true })}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <p className="text-sm text-slate-700">{review.comment || "(No comment text)"}</p>

                                {review.reviewReply ? (
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm">
                                        <p className="font-semibold text-indigo-900 flex items-center gap-2 mb-1">
                                            <Reply className="h-3 w-3" /> You replied:
                                        </p>
                                        <p className="text-indigo-800">{review.reviewReply.comment}</p>
                                    </div>
                                ) : (
                                    <>
                                        {replyingTo === review.id ? (
                                            <div className="space-y-2 mt-2">
                                                <Textarea
                                                    placeholder="Write your reply..."
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    className="min-h-[80px]"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => replyMutation.mutate({ reviewId: review.id, text: replyText, locationName: review.locationName })}
                                                        disabled={replyMutation.isPending || !replyText}
                                                    >
                                                        {replyMutation.isPending ? "Posting..." : "Post Reply"}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setReplyingTo(review.id)}>
                                                <Reply className="h-3 w-3" /> Reply
                                            </Button>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
