import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Users2 } from "lucide-react";

export default function LeadListScreen() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-heading">Leads</h1>
                <Button>Add Lead</Button>
            </div>
            <EmptyState
                icon={Users2}
                title="No leads yet"
                description="Get started by adding your first lead or importing from a file."
                action={{ label: "Add Lead", onClick: () => { } }}
            />
        </div>
    );
}
