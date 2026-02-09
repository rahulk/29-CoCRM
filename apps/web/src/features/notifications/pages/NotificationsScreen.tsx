import React from "react";
import { useFirestore } from "reactfire";
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Bell, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const NotificationsScreen = () => {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id as string;
    const firestore = useFirestore();
    const [notifications, setNotifications] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(firestore, `tenants/${tenantId}/notifications`),
            orderBy("created_at", "desc"),
            limit(50)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsub();
    }, [tenantId, firestore]);

    const handleRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await updateDoc(doc(firestore, `tenants/${tenantId}/notifications/${id}`), {
                is_read: true
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
            <h1 className="text-2xl font-bold">Notifications</h1>

            {notifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No new notifications</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                "flex gap-3 p-4 rounded-lg border bg-card transition-colors",
                                !notif.is_read && "bg-blue-50/50 border-blue-100"
                            )}
                            onClick={() => handleRead(notif.id, notif.is_read)}
                        >
                            <div className="mt-1">
                                {notif.type === "task_due" ? (
                                    <CheckCircle className="h-5 w-5 text-orange-500" />
                                ) : (
                                    <Bell className="h-5 w-5 text-blue-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={cn("text-sm font-medium", !notif.is_read && "text-blue-900")}>
                                    {notif.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">{notif.message}</p>
                                <span className="text-xs text-muted-foreground mt-1 block">
                                    {notif.created_at?.toDate ? formatDistanceToNow(notif.created_at.toDate(), { addSuffix: true }) : "Just now"}
                                </span>

                                {notif.link && (
                                    <Link to={notif.link} className="text-xs text-primary mt-2 inline-block font-medium hover:underline">
                                        View Details
                                    </Link>
                                )}
                            </div>
                            {!notif.is_read && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
