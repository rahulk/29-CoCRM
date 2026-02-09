
export const convertLeadsToCSV = (leads: any[]) => {
    if (!leads || leads.length === 0) return "";

    const headers = [
        "Business Name",
        "Address",
        "Phone",
        "Website",
        "Status",
        "Enrichment Status",
        "Priority",
        "Score",
        "Tags",
        "Summary",
        "Created At"
    ];

    const rows = leads.map(lead => [
        `"${(lead.business_details?.name || "").replace(/"/g, '""')}"`,
        `"${(lead.business_details?.address || "").replace(/"/g, '""')}"`,
        `"${(lead.business_details?.phone || lead.contact_details?.phone || "").replace(/"/g, '""')}"`,
        `"${(lead.business_details?.website || "").replace(/"/g, '""')}"`,
        lead.status,
        lead.enrichment_status,
        lead.ai_analysis?.priority || "",
        lead.ai_analysis?.score || "",
        `"${(lead.ai_analysis?.tags?.join(", ") || "").replace(/"/g, '""')}"`,
        `"${(lead.ai_analysis?.summary || "").replace(/"/g, '""')}"`,
        lead.created_at?.toDate?.()?.toISOString() || ""
    ]);

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
};

export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
