"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompanyStore } from "@/lib/companies";

interface QuotationRequest {
  id: string;
  date: string;
  customerName: string;
  company: string;
  project: string;
  title: string;
  status: string;
  actionHistory: string[];
  description?: string;
  [key: string]: any;
}

export default function RequestedQuotationPreviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { companies, loadCompanies } = useCompanyStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/quotation-requests/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch quotation request");
        return res.json();
      })
      .then((data) => {
        setQuotation(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setQuotation(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Function to get company name from ID
  const getCompanyName = useCallback(
    (companyId: string) => {
      if (!companyId) return "N/A";
      const company = companies.find((c) => c.id === companyId);
      return company ? (company.shortName ? company.shortName : company.name) : companyId;
    },
    [companies]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <p>Error: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Quotation request not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Button variant="outline" className="mb-4" onClick={() => router.back()}>
        Back
      </Button>
      <Card className="p-8 space-y-4">
        <h1 className="text-2xl font-bold mb-2">Requested Quotation Preview</h1>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-xs">ID</div>
            <div className="font-medium">{quotation.id}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Date</div>
            <div>{quotation.date}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Customer Name</div>
            <div>{quotation.customerName}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Company</div>
            <div>{getCompanyName(quotation.company)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Project</div>
            <div>{quotation.project}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Title</div>
            <div>{quotation.title}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Description</div>
            <div style={{ whiteSpace: 'pre-line' }}>{quotation.description || <span className="text-muted-foreground">No description</span>}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Status</div>
            <div>{quotation.status}</div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Action History</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {quotation.actionHistory && quotation.actionHistory.length > 0 ? (
              quotation.actionHistory.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))
            ) : (
              <li>No actions recorded.</li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  );
} 