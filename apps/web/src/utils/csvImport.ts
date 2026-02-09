import Papa from "papaparse";
// import type { Lead } from "@/features/leads/types"; // Unused

export interface ImportedLead {
    name: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    status: string;
}

export const parseCSV = (file: File): Promise<ImportedLead[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const leads: ImportedLead[] = results.data.map((row: any) => ({
                    name: row.Name || row.name || row.Business || row.business || "",
                    phone: row.Phone || row.phone || row.Mobile || row.mobile || "",
                    email: row.Email || row.email || "",
                    address: row.Address || row.address || row.Location || row.location || "",
                    website: row.Website || row.website || "",
                    status: 'new'
                })).filter((l: ImportedLead) => l.name || l.phone); // Must have at least name or phone
                resolve(leads);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
