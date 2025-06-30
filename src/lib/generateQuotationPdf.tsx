import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Quotation, QuotationItem } from '@/types/quotation';
import { Image as PdfImage } from '@react-pdf/renderer';
import type { Company } from './companies';


// Helper functions for calculations
const calculateSubtotal = (items: QuotationItem[]): number => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (parseFloat(item.amount || '0') * parseFloat(item.qty || '0')), 0);
};

const calculateDiscount = (quotation: Quotation): number => {
  const subtotal = calculateSubtotal(quotation.items);
  const discountValue = parseFloat(quotation.discountValue || '0');
  return quotation.discountType === 'percentage' ? 
    subtotal * (discountValue / 100) : 
    discountValue;
};

const calculateTax = (quotation: Quotation): number => {  
  const subtotal = calculateSubtotal(quotation.items);
  const discount = calculateDiscount(quotation);
  const afterDiscount = subtotal - discount;
  const taxRate = parseFloat(quotation.taxRate || '0');
  return afterDiscount * (taxRate / 100);
};

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#2D3748', // Modern dark gray for better readability
    paddingBottom: 80, // Add enough space for the footer
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #E2E8F0', // Subtle separator
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 200,
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A365D', 
    maxWidth: 220, 
  },
  companyDetails: {
    marginBottom: 3,
    color: '#4A5568', 
  },
  quotationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A365D',
  },
  quotationDetails: {
    marginBottom: 3,
    color: '#4A5568',
  },
  toSection: {
    marginTop: 10,
    marginBottom: 8,
  },
  attnSection: {
    marginBottom: 8,
  },
  projectSection: {
    marginBottom: 25,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2D3748',
  },
  infoTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 25,
    borderRadius: 4,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoCell: {
    width: '25%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
    minHeight: 30,
    justifyContent: 'center',
  },
  infoCellLast: {
    width: '25%',
    padding: 8,
    backgroundColor: '#F7FAFC',
    minHeight: 30,
    justifyContent: 'center',
  },
  infoDataCell: {
    width: '25%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    minHeight: 30,
    justifyContent: 'center',
  },
  infoDataCellLast: {
    width: '25%',
    padding: 8,
    minHeight: 30,
    justifyContent: 'center',
  },
  infoCellText: {
    fontWeight: 'bold',
    color: '#2D3748',
  },
  infoDataText: {
    color: '#4A5568',
  },
  itemsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 25,
    borderRadius: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  itemsHeaderCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    fontWeight: 'bold',
    color: '#2D3748',
  },
  itemsHeaderCellLast: {
    padding: 8,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  itemsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  snoCell: {
    width: '8%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  descriptionCell: {
    width: '42%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  qtyCell: {
    width: '12%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    textAlign: 'center',
  },
  untCell: {
    width: '10%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    textAlign: 'center',
  },
  rateCell: {
    width: '14%',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    textAlign: 'right',
  },
  amountCell: {
    width: '14%',
    padding: 8,
    textAlign: 'right',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    marginRight: 15,
    color: '#4A5568',
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#2D3748',
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #E2E8F0',
  },
  termsSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #E2E8F0',
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2D3748',
  },
  termText: {
    marginBottom: 6,
    color: '#4A5568',
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #E2E8F0',
  },
  signatureText: {
    marginBottom: 6,
    color: '#4A5568',
  },
  thankYou: {
    marginTop: 30,
    textAlign: 'right',
    color: '#2D3748',
    fontSize: 11,
    fontStyle: 'italic',
  },
  systemLabel: {
    color: '#4A5568',
    marginBottom: 2,
  },
  descriptionText: {
    color: '#2D3748',
  },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 20,
    borderTop: '1px solid #E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8, // smaller font
    color: '#4A5568',
    paddingTop: 4, // less padding
  },
  footerCompany: {
    flex: 1,
    textAlign: 'left',
    fontSize: 8, // smaller font
    color: '#4A5568',
    // Remove line breaks, keep as one line
  },
  footerPage: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
    color: '#4A5568',
  },
});

// Create Document Component
  export const QuotationPDF = ({
    quotation,
    companyDetails,
  }: {
    quotation: Quotation,
    companyDetails?: { name: string, address: string, phoneNumber: string, logoUrl?: string }
  }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {companyDetails?.logoUrl && (
              <PdfImage
                src={companyDetails.logoUrl}
                style={{ width: 80, height: 80, marginRight: 16 }}
              />
            )}
            <View style={{ flexDirection: 'column', justifyContent: 'center', maxWidth: 220 }}>
              <Text style={styles.companyName}>{companyDetails?.name || "D S P Construction & Engineering Works (Pvt) Ltd."}</Text>
              <Text style={styles.companyDetails}>{companyDetails?.address || "No 15, Cross Street,"}</Text>
              <Text style={styles.companyDetails}>Telephone: {companyDetails?.phoneNumber || "094812062863"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.quotationTitle}>Quotation</Text>
          <Text style={styles.quotationDetails}>Quote No. {quotation.quotationNo}</Text>
          <Text style={styles.quotationDetails}>{quotation.date}</Text>
        </View>
      </View>

      <View style={styles.toSection}>
        <Text style={styles.label}>TO:</Text>
        <Text>{quotation.toAddress}</Text>
      </View>

      <View style={styles.attnSection}>
        <Text style={styles.label}>Attn:</Text>
        <Text>{quotation.attn}</Text>
      </View>

      <View style={styles.projectSection}>
        <Text style={styles.label}>PROJECT</Text>
        <Text>{quotation.project}</Text>
      </View>

      <View style={styles.infoTable}>
        <View style={styles.infoRow}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellText}>Salesperson</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellText}>Customer References</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellText}>Payment Terms</Text>
          </View>
          <View style={styles.infoCellLast}>
            <Text style={styles.infoCellText}>Due Date</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoDataCell}>
            <Text style={styles.infoDataText}>{quotation.salesperson}</Text>
          </View>
          <View style={styles.infoDataCell}>
            <Text style={styles.infoDataText}>{quotation.customerReferences}</Text>
          </View>
          <View style={styles.infoDataCell}>
            <Text style={styles.infoDataText}>{quotation.paymentTerms}</Text>
          </View>
          <View style={styles.infoDataCellLast}>
            <Text style={styles.infoDataText}>{quotation.dueDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.itemsTable}>
        <View style={styles.itemsHeader}>
          <View style={styles.snoCell}>
            <Text>SNo.</Text>
          </View>
          <View style={styles.descriptionCell}>
            <Text>Description</Text>
          </View>
          <View style={[styles.qtyCell, { width: '22%' }]}>
            <Text>Quantity</Text>
          </View>
          <View style={styles.rateCell}>
            <Text>Rate</Text>
          </View>
          <View style={styles.amountCell}>
            <Text>Amount</Text>
          </View>
        </View>
        {(quotation.items ?? []).map((item, index) => (
          <View key={item.id} style={styles.itemsRow}>
            <View style={styles.snoCell}>
              <Text>{index + 1}</Text>
            </View>
            <View style={styles.descriptionCell}>
              <Text style={styles.systemLabel}>System: {item.system}</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
            <View style={[styles.qtyCell, { width: '22%' }]}>
              <Text>{item.qty}{item.unit ? ` ${item.unit}` : ''}</Text>
            </View>
            <View style={styles.rateCell}>
              <Text>{parseFloat(item.amount || '0').toFixed(2)}</Text>
            </View>
            <View style={styles.amountCell}>
              <Text>{(parseFloat(item.amount || '0') * parseFloat(item.qty || '0')).toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>{quotation.currency} {(calculateSubtotal(quotation.items) || 0).toFixed(2)}</Text>
        </View>
        {quotation.discountValue && parseFloat(quotation.discountValue) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Discount {quotation.discountType === 'percentage' ? `(${quotation.discountValue}%)` : ''}:
            </Text>
            <Text style={styles.totalValue}>
              {quotation.currency} {(calculateDiscount(quotation) || 0).toFixed(2)}
            </Text>
          </View>
        )}
        {quotation.taxRate && parseFloat(quotation.taxRate) > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({quotation.taxRate}%):</Text>
            <Text style={styles.totalValue}>
              {quotation.currency} {(calculateTax(quotation) || 0).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.finalTotal]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{quotation.currency} {(quotation.amount || 0).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.termsSection}>
        <Text style={styles.termsTitle}>Terms and Condition:</Text>
        {(quotation.terms ?? []).map((term, index) => (
          <Text key={term.id} style={styles.termText}>{index + 1}. {term.content}</Text>
        ))}
      </View>

      <View style={styles.signatureSection}>
        <Text style={styles.signatureText}>To accept this quotation, please sign here and return:</Text>
        <Text style={styles.signatureText}>Authorized Signature and Stamp</Text>
      </View>

      <Text style={styles.thankYou}>Thank you!</Text>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerCompany}>
          {(companyDetails?.name || "D S P Construction & Engineering Works (Pvt) Ltd.")} | 
          Tel: {(companyDetails?.phoneNumber || "094812062863")} | 
          {(companyDetails?.address || "No 15, Cross Street, Kandy.")} | 
          Sri Lanka
          {/* Add registration number if available, or keep static if not in data */}
          {/* {companyDetails?.regNo ? ` | Company reg No. ${companyDetails.regNo}` : " | Company reg No. PV 79650"} */}
        </Text>
        <Text
          style={styles.footerPage}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </View>
    </Page>
  </Document>
);

export async function generateAndSavePDF(quotation: Quotation): Promise<string> {
  try {
    // Fetch company details if myCompany ID is provided
    let companyDetails;
    if (quotation.myCompany) {
      try {
        // Fetch company details from the API
        const response = await fetch('/api/company-details/' + quotation.myCompany);
        if (response.ok) {
          const data = await response.json();
          companyDetails = {
            name: data.name,
            address: data.address,
            phoneNumber: data.phoneNumber,
            logoUrl: data.logoUrl,
          };
        } else {
          // If API fails, try to fetch from local data
          const allCompaniesResponse = await fetch('/api/company-details');
          if (allCompaniesResponse.ok) {
            const allCompanies = await allCompaniesResponse.json();
            const found = allCompanies.find((company: Company) => company.id === quotation.myCompany);
            if (found) {
              companyDetails = {
                name: found.name,
                address: found.address,
                phoneNumber: found.phoneNumber,
                logoUrl: found.logoUrl,
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        // Continue without company details
      }
    }
    
    // Generate PDF blob in the browser
    const doc = pdf(
      <QuotationPDF 
        quotation={quotation} 
        companyDetails={companyDetails}
      />
    );
    const blob = await doc.toBlob();
    
    if (!blob) {
      throw new Error('Failed to generate PDF blob');
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', blob, `quotation_${quotation.quotationNo}.pdf`);
    
    // Save the PDF using the save-pdf endpoint
    const response = await fetch('/api/quotations/save-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save PDF: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.url) {
      throw new Error('No URL returned from server');
    }
    
    return data.url;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
} 