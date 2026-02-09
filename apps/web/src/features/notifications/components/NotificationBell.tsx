import React from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useFirestore } from "reactfire";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/features/auth/context/AuthContext";

export const NotificationBell = () => {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id as string;
    const firestore = useFirestore();
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(firestore, `tenants/${tenantId}/notifications`),
            where("is_read", "==", false)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsub();
    }, [tenantId, firestore]);

    return (
        <Link to="/notifications" className="relative p-2 text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
        </Link>
    );
};
