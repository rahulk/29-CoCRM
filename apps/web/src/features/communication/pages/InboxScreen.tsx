import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function InboxScreen() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-heading">Messages</h1>
                <Button>New Application</Button>
            </div>
            <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Your conversations with leads will appear here."
                action={{ label: "Send Message", onClick: () => { } }}
            />
        </div>
    );
}
