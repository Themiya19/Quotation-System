import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type QuotationRequest } from "@/types/quotationRequest";
import { useCompanyStore } from "@/lib/companies";
import { useEffect, useCallback } from "react";
import uiConfig from '../../data/ui-config.json' assert { type: 'json' };
import { format as formatDate, parseISO } from 'date-fns';

interface QuotationsTableProps {
  quotations: QuotationRequest[];
  onViewDocument?: (pdfUrl: string) => void;
  showActions?: boolean;
  renderActionButtons?: (quotation: QuotationRequest) => React.ReactNode;
}

export function QuotationsTable({
  quotations,
  showActions = false,
  renderActionButtons,
}: QuotationsTableProps) {
  const { companies, loadCompanies } = useCompanyStore();
  
  // Load companies data when component mounts
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);
  
  // Function to get company name from ID
  const getCompanyName = useCallback((companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  }, [companies]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quotation No</TableHead>
            {showActions && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => (
            <TableRow key={quotation.id}>
              <TableCell>{quotation.id}</TableCell>
              <TableCell>{quotation.date ? formatDate(parseISO(quotation.date), uiConfig.dateFormat) : ""}</TableCell>
              <TableCell>{quotation.customerName}</TableCell>
              <TableCell>{getCompanyName(quotation.company)}</TableCell>
              <TableCell>{quotation.project}</TableCell>
              <TableCell>{quotation.title}</TableCell>
              <TableCell>
                <span className={
                  quotation.status === 'created' ? 'text-green-600' :
                  quotation.status === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }>
                  {quotation.status === 'created' ? 'Created' :
                   quotation.status === 'rejected' ? 'Rejected' :
                   'Pending Review'}
                </span>
              </TableCell>
              <TableCell>
                {quotation.status === 'created' && quotation.actionHistory.some(action => action.includes('Created quotation')) ? (
                  quotation.actionHistory
                    .find(action => action.includes('Created quotation'))
                    ?.match(/Created quotation (.*?) on/)?.[1] || '-'
                ) : '-'}
              </TableCell>
              {showActions && (
                <TableCell>
                  {renderActionButtons && renderActionButtons(quotation)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 