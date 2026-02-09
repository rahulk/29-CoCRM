import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function TaskListScreen() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-heading">Tasks</h1>
                <Button>New Task</Button>
            </div>
            <EmptyState
                icon={ListChecks}
                title="All caught up!"
                description="You have no pending tasks for today."
                action={{ label: "Create Task", onClick: () => { } }}
            />
        </div>
    );
}
