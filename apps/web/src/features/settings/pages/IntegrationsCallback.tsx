import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function IntegrationsCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const functions = getFunctions();
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const sent = useRef(false);

    useEffect(() => {
        if (sent.current) return;
        sent.current = true;

        if (error) {
            toast.error("Connection declined.");
            navigate("/settings/integrations");
            return;
        }

        if (code) {
            const exchange = async () => {
                try {
                    const connectGMB = httpsCallable(functions, 'connectGMB');
                    await connectGMB({ code });
                    toast.success("Successfully connected!");
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to swap code. Check console.");
                } finally {
                    navigate("/settings/integrations");
                }
            };
            exchange();
        } else {
            navigate("/settings/integrations");
        }
    }, [code, error, navigate, functions]);

    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Finishing connection...</p>
        </div>
    );
}
