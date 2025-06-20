// import { NextResponse } from 'next/server';
// import { writeFile } from 'fs/promises';
// import { join } from 'path';
// import { mkdir } from 'fs/promises';

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File;
    
//     if (!file) {
//       return NextResponse.json(
//         { error: 'No file provided' },
//         { status: 400 }
//       );
//     }

//     // Create uploads directory if it doesn't exist
//     const uploadDir = join(process.cwd(), 'public', 'uploads');
//     await mkdir(uploadDir, { recursive: true });

//     // Convert File to Buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Create unique filename
//     const filename = `quotation_${Date.now()}.pdf`;
//     const filepath = join(uploadDir, filename);

//     // Write file to disk
//     await writeFile(filepath, buffer);

//     // Return the URL that can be used to access the file
//     return NextResponse.json({
//       url: `/uploads/${filename}`,
//       message: 'File uploaded successfully'
//     });

//   } catch (error) {
//     console.error('Error saving PDF:', error);
//     return NextResponse.json(
//       { error: 'Failed to save PDF' },
//       { status: 500 }
//     );
//   }
// } 


import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/generateQuotationPdf";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Quotation } from "@/types/quotation";

// Define the Company type for type safety
interface Company {
  id?: string;
  name: string;
  shortName?: string;
  address: string;
  phoneNumber: string;
  logoUrl?: string;
  updatedAt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const quotation: Quotation = await req.json();

    // Fetch myCompany details if provided
    let companyDetails: Company | undefined = undefined;
    if (quotation.myCompany) {
      try {
        // Try to fetch from API route (server-side fetch)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/company-details/${quotation.myCompany}`);
        if (response.ok) {
          const data: Company = await response.json();
          companyDetails = {
            name: data.name,
            address: data.address,
            phoneNumber: data.phoneNumber,
            logoUrl: data.logoUrl,
          };
          // Ensure logoUrl is absolute
          if (companyDetails.logoUrl && companyDetails.logoUrl.startsWith('/')) {
            companyDetails.logoUrl = baseUrl + companyDetails.logoUrl;
          }
        } else {
          // Fallback: try to fetch all companies and find the match
          const allCompaniesResponse = await fetch(`${baseUrl}/api/company-details`);
          if (allCompaniesResponse.ok) {
            const allCompanies: Company[] = await allCompaniesResponse.json();
            const found = allCompanies.find((company) => company.id === quotation.myCompany);
            if (found) {
              companyDetails = {
                name: found.name,
                address: found.address,
                phoneNumber: found.phoneNumber,
                logoUrl: found.logoUrl,
              };
              if (companyDetails.logoUrl && companyDetails.logoUrl.startsWith('/')) {
                companyDetails.logoUrl = baseUrl + companyDetails.logoUrl;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        // Continue without company details
      }
    }

    // Generate the PDF document using QuotationPDF directly
    const doc = pdf(
  QuotationPDF({ quotation, companyDetails })
);
    const buffer = await doc.toBuffer();

    // Save the PDF to disk
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `quotation_${quotation.quotationNo || Date.now()}.pdf`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return the URL
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}