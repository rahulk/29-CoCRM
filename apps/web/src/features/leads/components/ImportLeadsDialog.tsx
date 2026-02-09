import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";
import { parseCSV, type ImportedLead } from "@/utils/csvImport";
import { useAuth } from "@/features/auth/context/AuthContext";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function ImportLeadsDialog({ children }: { children: React.ReactNode }) {
    const { user, claims } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    // const [file, setFile] = useState<File | null>(null); // Unused
    const [leads, setLeads] = useState<ImportedLead[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    // const [isImporting, setIsImporting] = useState(false); // Unused
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setIsParsing(true);
            try {
                const parsedLeads = await parseCSV(selectedFile);
                setLeads(parsedLeads);
                setStep('preview');
                toast.success(`Found ${parsedLeads.length} leads`);
            } catch (error) {
                console.error(error);
                toast.error("Failed to parse CSV");
            } finally {
                setIsParsing(false);
            }
        }
    };

    const handleImport = async () => {
        if (!user || !claims?.tenant_id || leads.length === 0) return;

        // setIsImporting(true); // Unused
        setStep('importing');

        try {
            // Batch writes (limit 500 per batch)
            const batchSize = 450;
            const chunks = [];
            for (let i = 0; i < leads.length; i += batchSize) {
                chunks.push(leads.slice(i, i + batchSize));
            }

            let loadedCount = 0;

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(lead => {
                    const ref = doc(collection(db, "leads"));
                    batch.set(ref, {
                        tenant_id: claims.tenant_id,
                        business_details: {
                            name: lead.name,
                            phone: lead.phone,
                            address: lead.address,
                            website: lead.website
                        },
                        contact_details: {
                            email: lead.email,
                            phone: lead.phone,
                            name: ''
                        },
                        status: 'new',
                        source: 'manual_import',
                        enrichment_status: 'pending',
                        created_at: serverTimestamp(),
                        updated_at: serverTimestamp(),
                        created_by: user.uid,
                        updated_by: user.uid,
                        health_score: 100,
                        last_contacted_at: null
                    });
                });
                await batch.commit();
                loadedCount += chunk.length;
            }

            setStep('success');
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["all-leads"] }); // Refresh smart feed logic
            toast.success(`Successfully imported ${loadedCount} leads`);

            // Reset after 2s
            setTimeout(() => {
                setIsOpen(false);
                setStep('upload');
                // setFile(null);
                setLeads([]);
            }, 2000);

        } catch (error) {
            console.error(error);
            toast.error("Import failed");
            setStep('preview'); // Go back to preview
        } finally {
            // setIsImporting(false); // Unused
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Leads from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: Name, Phone, Email, Address, Website.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="grid w-full max-w-sm items-center gap-1.5 py-4">
                        <Label htmlFor="csv">CSV File</Label>
                        <Input id="csv" type="file" accept=".csv" onChange={handleFileChange} disabled={isParsing} />
                        {isParsing && <p className="text-xs text-muted-foreground">Parsing...</p>}
                    </div>
                )}

                {step === 'preview' && (
                    <div className="py-4 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md border text-sm max-h-60 overflow-y-auto">
                            <p className="font-medium mb-2">Preview ({leads.length} leads found):</p>
                            <div className="space-y-2">
                                {leads.slice(0, 5).map((l, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-2 border-b pb-2 last:border-0">
                                        <span className="font-semibold">{l.name}</span>
                                        <span className="text-slate-500 text-right">{l.phone}</span>
                                    </div>
                                ))}
                                {leads.length > 5 && <p className="text-xs text-center text-slate-400 mt-2">...and {leads.length - 5} more</p>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setStep('upload'); /* setFile(null); */ }}>Back</Button>
                            <Button onClick={handleImport}>Import {leads.length} Leads</Button>
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <p className="text-sm text-slate-600">Importing your leads...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3 text-emerald-600">
                        <CheckCircle className="h-10 w-10" />
                        <p className="font-medium">Import Complete!</p>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    );
}
