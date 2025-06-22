"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useCallback, Suspense } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { addQuotation, updateQuotation, getQuotationRequestById, getQuotationById } from "@/lib/quotations";
import { useCompanyStore } from "@/lib/companies";
import { saveAnnexureFile } from '@/lib/annexureUpload';
import PreviewQuotation from './PreviewQuotation';
import Cookies from 'js-cookie';
import type { Company } from "@/lib/companies";
import type { QuotationFormData, QuotationItem, Term } from "@/types/quotation";

// Interface for department data
interface Department {
  id: string;
  name: string;
  description: string;
}


const formSchema = z.object({
  company: z.string().min(1, "Company is required"),
  project: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string(),
  taxRate: z.string(),
  toAddress: z.string(),
  attn: z.string(),
  currency: z.string(),
  emailTo: z.array(z.string()).min(1, "At least one Email To is required"),
  emailCC: z.array(z.string()).optional(),
  salesperson: z.string(),
  customerReferences: z.string(),
  paymentTerms: z.string(),
  dueDate: z.string(),
  department: z.string(),
  myCompany: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type PreviewData = QuotationFormData & {
  items: QuotationItem[];
  terms: Term[];
  amount: number;
  actionHistory: string[];
  pdfUrl: string;
  forDepartment: string;
  isRequested: boolean;
  requestId?: string;
  quotationNo?: string;
};

function QuotationForm() {
  const router = useRouter();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [encodedActionHistory, setEncodedActionHistory] = useState<string | null>(null);
  const [items, setItems] = useState([{ id: "1", system: "", description: "", unit: "", qty: "", amount: "" }]);
  const [terms, setTerms] = useState([{ id: "1", content: "" }]);
  const [annexureFile, setAnnexureFile] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });
  const { companies, loadCompanies } = useCompanyStore();
  const [emailToInput, setEmailToInput] = useState("");
  const [emailCCInput, setEmailCCInput] = useState("");
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      project: "",
      title: "",
      discountType: "percentage",
      discountValue: "",
      taxRate: "",
      toAddress: "",
      attn: "",
      currency: "",
      emailTo: [],
      emailCC: [],
      salesperson: "",
      customerReferences: "",
      paymentTerms: "",
      dueDate: "",
      department: "",
    },
  });

  const handleCompanyChange = useCallback((companyId: string) => {
    const selectedCompany = companies.find(c => c.id === companyId);
    if (selectedCompany) {
      form.setValue("company", companyId);
      form.setValue("currency", selectedCompany.currency);
      // Auto-fill or clear email-to
      if (selectedCompany.emailTo) {
        if (Array.isArray(selectedCompany.emailTo)) {
          form.setValue("emailTo", selectedCompany.emailTo);
        } else {
          form.setValue("emailTo", [selectedCompany.emailTo]);
        }
      } else {
        form.setValue("emailTo", []);
      }
      // Auto-fill or clear email-cc
      if (selectedCompany.emailCC) {
        if (Array.isArray(selectedCompany.emailCC)) {
          form.setValue("emailCC", selectedCompany.emailCC);
        } else {
          form.setValue("emailCC", [selectedCompany.emailCC]);
        }
      } else {
        form.setValue("emailCC", []);
      }
      // Auto-fill or clear address
      if (selectedCompany.address) {
        form.setValue("toAddress", selectedCompany.address);
      } else {
        form.setValue("toAddress", "");
      }
      // Auto-fill or clear attention to
      if (selectedCompany.attention) {
        form.setValue("attn", selectedCompany.attention);
      } else {
        form.setValue("attn", "");
      }
      // Set terms if company has default terms
      if (selectedCompany.terms && selectedCompany.terms.length > 0) {
        setTerms(selectedCompany.terms.map((term) => ({
          id: (term.id ? String(term.id) : Date.now().toString()),
          content: typeof term === 'string' ? term : term.content
        })));
      } else {
        setTerms([{ id: Date.now().toString(), content: "" }]);
      }
    }
  }, [companies, form, setTerms]);

  useEffect(() => {
    loadCompanies();
    
    // Load departments from the API endpoint
    const loadDepartments = async () => {
      try {
        const response = await fetch('/api/departments');
        if (!response.ok) {
          throw new Error('Failed to load departments');
        }
        const departmentsData = await response.json();
        setDepartments(departmentsData);
      } catch (error) {
        console.error('Error loading departments:', error);
        toast.error('Failed to load departments');
      }
    };
    
    loadDepartments();

    // Load my companies
    const loadMyCompanies = async () => {
      try {
        const response = await fetch('/api/company-details');
        if (!response.ok) {
          throw new Error('Failed to load my companies');
        }
        const data = await response.json();
        setMyCompanies(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading my companies:', error);
      }
    };
    
    loadMyCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setRequestId(params.get("requestId"));
      setEncodedActionHistory(params.get("actionHistory"));
    }
  }, []);

  useEffect(() => {
    // Load request data if requestId is present
    const loadRequestData = async () => {
      if (!requestId || !companies.length) return; // Exit if no requestId or companies not loaded yet

      try {
        const requestData = await getQuotationRequestById(requestId);
        
        // Exit if requestData is null
        if (!requestData) {
          toast.error('Request data not found');
          return;
        }
        
        // Find the company directly by ID since requestData.company is already the company ID
        if (!requestData.company) {
          toast.error('Company ID is missing in the request data');
          return;
        }
        
        const companyObj = companies.find(c => c.id === requestData.company);
        if (!companyObj) {
          toast.error(`Company not found with ID: ${requestData.company}. Please ensure companies are loaded.`);
          // Try to load companies again
          await loadCompanies();
          return;
        }

        // Set form values with available data
        const formValues: FormValues = {
          company: companyObj.id,
          project: requestData.project,
          title: requestData.title,
          discountType: "percentage",
          discountValue: "0",
          taxRate: "0",
          toAddress: "",
          attn: "",
          currency: companyObj.currency || "USD",
          emailTo: [],
          emailCC: [],
          salesperson: "",
          customerReferences: "",
          paymentTerms: "",
          dueDate: new Date().toISOString().split('T')[0],
          department: "",
        };

        // Reset form with all values at once
        form.reset(formValues);

        // Apply company change to auto-fill all company-related fields
        handleCompanyChange(companyObj.id);

        // Auto-fill salesperson with customer name from the requested quotation
        form.setValue("salesperson", requestData.customerName);
        
        // Auto-fill customer references with requested quotation ID
        if (requestData.id) {
          form.setValue("customerReferences", requestData.id);
        }

        // Set default items and terms
        setItems([{ id: "1", system: "", description: "", unit: "", qty: "", amount: "" }]);
        
        // Set company's default terms if available
        if (companyObj.terms && companyObj.terms.length > 0) {
          setTerms(companyObj.terms.map((term) => ({
            id: (term.id ? String(term.id) : Date.now().toString()),
            content: typeof term === 'string' ? term : term.content
          })));
        } else {
          setTerms([{ id: "1", content: "" }]);
        }

        // Trigger calculations
        form.trigger();
      } catch (error) {
        console.error('Error loading request data:', error);
        toast.error('Failed to load request data');
      }
    };

    loadRequestData();
  }, [requestId, companies, form, handleCompanyChange, loadCompanies]);

  const discountType = form.watch("discountType");
  const discountValue = form.watch("discountValue");
  const taxRate = form.watch("taxRate");

  useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      const qty = parseFloat(item.qty) || 0;
      return sum + (amount * qty);
    }, 0);

    let discountAmount = 0;
    const discountValueNum = parseFloat(discountValue) || 0;
    const taxRateNum = parseFloat(taxRate) || 0;
    if (discountType === "percentage") {
      discountAmount = (subtotal * discountValueNum) / 100;
    } else {
      discountAmount = discountValueNum;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRateNum) / 100;
    const total = afterDiscount + taxAmount;

    setTotals({
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
    });
  }, [items, discountType, discountValue, taxRate, form]);

  async function onSubmit(values: FormValues) {
    const userEmail = Cookies.get('userEmail');
    
    // Instead of submitting directly, show preview
    let actionHistory = [`Created by ${userEmail} on ${new Date().toISOString().split('T')[0]}`];
    
    // If we have action history from a request, include it
    if (encodedActionHistory) {
      try {
        const requestActionHistory = JSON.parse(decodeURIComponent(encodedActionHistory));
        actionHistory = [...requestActionHistory, ...actionHistory];
      } catch (error) {
        console.error('Error parsing action history:', error);
      }
    }

    const discountType = values.discountType === 'fixed' ? 'fixed' : values.discountType;
    const quotationData: PreviewData = {
      ...values,
      emailCC: values.emailCC ?? [],
      discountType: discountType as 'percentage' | 'amount',
      items,
      terms,
      amount: totals.total,
      actionHistory,
      pdfUrl: "#",
      forDepartment: values.department,
      isRequested: !!requestId,
      requestId: requestId || undefined,
    };
    setPreviewData(quotationData);
    setShowPreview(true);
  }

  async function handleConfirmSubmit() {
    try {
      if (!previewData) return;
      // Add the quotation using the new file-based storage (get real quotationNo)
      const addResult = await addQuotation({
        ...previewData,
        discountType: previewData.discountType === 'amount' ? 'fixed' : previewData.discountType,
        date: new Date().toISOString().split('T')[0],
        internalStatus: 'pending',
        externalStatus: 'pending',
      });
      const newQuotation = await getQuotationById(addResult.id); // Fetch full data

      if (!newQuotation) {
        toast.error("Failed to fetch full quotation data after creation.");
        return;
      }

      // Map items for PDF compatibility
      const mappedItems = (newQuotation.items || []).map((item: QuotationItem) => ({
        ...item,
        qty: item.qty || (item.quantity !== undefined ? String(item.quantity) : ''),
        amount: item.amount || (item.unitPrice !== undefined ? String(item.unitPrice) : ''),
      }));

      // Prepare the quotation object for PDF with the real quotationNo
      const pdfQuotation = {
        ...newQuotation,
        id: newQuotation.id!,
        quotationNo: newQuotation.quotationNo!,
        date: newQuotation.date!,
        company: newQuotation.company!,
        project: newQuotation.project!,
        title: newQuotation.title!,
        amount: newQuotation.amount!,
        pdfUrl: newQuotation.pdfUrl!,
        toAddress: newQuotation.toAddress!,
        attn: newQuotation.attn!,
        currency: newQuotation.currency!,
        discountType: newQuotation.discountType!,
        discountValue: newQuotation.discountValue!,
        taxRate: newQuotation.taxRate!,
        internalStatus: newQuotation.internalStatus!,
        externalStatus: newQuotation.externalStatus!,
        actionHistory: newQuotation.actionHistory!,
        items: mappedItems,
        myCompany: newQuotation.myCompany,
      };

      console.log('Quotation for PDF:', pdfQuotation);

      try {
        // Generate the PDF with the real quotation number and all values
        // const pdfUrl = await generateAndSavePDF(pdfQuotation);
        const response = await fetch('/api/quotations/save-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pdfQuotation),
        });
        const { url: pdfUrl } = await response.json();

        // Save annexure file if provided
        let annexureUrl = "";
        if (annexureFile.length > 0) {
          annexureUrl = await saveAnnexureFile(annexureFile[0], newQuotation.quotationNo);
        }

        // Update the quotation with the PDF URL
        await updateQuotation(newQuotation.id, { 
          ...newQuotation, 
          pdfUrl,
          annexureUrl
        });

        // If this quotation was created from a request, update the request status
        if (requestId) {
          try {
            const response = await fetch(`/api/quotation-requests/${requestId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                status: 'created',
                actionHistory: [
                  ...previewData.actionHistory,
                  `Created quotation ${newQuotation.quotationNo} on ${new Date().toISOString().split('T')[0]}`
                ]
              }),
            });

            if (!response.ok) {
              console.error('Failed to update request status');
            }
          } catch (error) {
            console.error('Error updating request status:', error);
          }
        }
      } catch (error) {
        console.error('Error generating PDF or saving annexure:', error);
        // Continue with the process even if PDF generation fails
      }

      toast.success("Quotation created successfully");
      router.push("/quotations");
    } catch (error) {
      toast.error("Failed to create quotation");
      console.error("Error creating quotation:", error);
    }
  }

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), system: "", description: "", unit: "", qty: "", amount: "" }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addTerm = () => {
    setTerms([...terms, { id: Date.now().toString(), content: "" }]);
  };

  const removeTerm = (id: string) => {
    setTerms(terms.filter(term => term.id !== id));
  };

  const updateTerm = (id: string, content: string) => {
    setTerms(terms.map(term => 
      term.id === id ? { ...term, content } : term
    ));
  };

  // Add functions for email management
  const addEmailTo = () => {
    if (!emailToInput || !emailToInput.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    const currentEmails = form.getValues("emailTo");
    if (currentEmails.includes(emailToInput)) {
      toast.error("This email is already added");
      return;
    }
    form.setValue("emailTo", [...currentEmails, emailToInput]);
    setEmailToInput("");
  };

  const removeEmailTo = (email: string) => {
    const currentEmails = form.getValues("emailTo");
    if (currentEmails.length === 1) {
      toast.error("At least one Email To is required");
      return;
    }
    form.setValue("emailTo", currentEmails.filter(e => e !== email));
  };

  const addEmailCC = () => {
    if (!emailCCInput || !emailCCInput.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    const currentEmails = form.getValues("emailCC") || [];
    if (currentEmails.includes(emailCCInput)) {
      toast.error("This email is already added");
      return;
    }
    form.setValue("emailCC", [...currentEmails, emailCCInput]);
    setEmailCCInput("");
  };

  const removeEmailCC = (email: string) => {
    const currentEmails = form.getValues("emailCC") || [];
    form.setValue("emailCC", currentEmails.filter(e => e !== email));
  };

  // Add a handler for My Company selection
  const handleMyCompanyChange = (companyId: string) => {
    const selectedCompany = myCompanies.find(c => c.id === companyId);
    if (selectedCompany) {
      // Don't change the form fields, just set the selected company
      form.setValue("myCompany", companyId);
    }
  };

  if (showPreview && previewData) {
    return (
      <PreviewQuotation
        previewData={previewData}
        companies={companies}
        items={items}
        terms={terms}
        totals={totals}
        annexureFile={annexureFile}
        onBack={() => setShowPreview(false)}
        onConfirm={handleConfirmSubmit}
        updateItem={updateItem}
        myCompanies={myCompanies}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Quotation</h2>
        <p className="text-muted-foreground">Create a new quotation with the form below.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="myCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Company</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleMyCompanyChange(value);
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your company" />
                        </SelectTrigger>
                        <SelectContent>
                          {myCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Company</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          handleCompanyChange(value);
                        }} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>For Department</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter quotation title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="toAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="attn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attention To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter attention" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                            <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emailTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email To</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            value={emailToInput}
                            onChange={(e) => setEmailToInput(e.target.value)}
                            placeholder="Enter email address"
                            type="email"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addEmailTo();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addEmailTo}
                            variant="outline"
                            size="icon"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {field.value.map((email, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-accent/50 rounded">
                              <span className="text-sm flex-1">{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeEmailTo(email)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailCC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email CC</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            value={emailCCInput}
                            onChange={(e) => setEmailCCInput(e.target.value)}
                            placeholder="Enter CC email address"
                            type="email"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addEmailCC();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addEmailCC}
                            variant="outline"
                            size="icon"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {field.value && field.value.map((email, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-accent/50 rounded">
                              <span className="text-sm flex-1">{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeEmailCC(email)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="salesperson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salesperson</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter salesperson name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerReferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer References</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer references" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter payment terms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Discounts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="Enter discount value"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="Enter tax rate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-2">
                    <Input
                      placeholder="System"
                      value={item.system}
                      onChange={(e) => updateItem(item.id, "system", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                  <Textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      updateItem(item.id, "description", e.target.value);
                      // Auto-resize logic
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    rows={1}
                    style={{ resize: "none", minHeight: "38px" }} // match Input height
                  />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="text"
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 py-2">
                    {((parseFloat(item.qty) || 0) * (parseFloat(item.amount) || 0)).toFixed(2)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem}>
                Add Item
              </Button>
              <div className="mt-4 flex justify-end">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{form.watch("currency")} {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>{form.watch("currency")} {totals.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{form.watch("currency")} {totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{form.watch("currency")} {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {terms.map((term) => (
                <div key={term.id} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter term"
                      value={term.content}
                      onChange={(e) => updateTerm(term.id, e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTerm(term.id)}
                    disabled={terms.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addTerm}>
                Add Term
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept={{
                  'application/pdf': ['.pdf']
                }}
                maxFiles={1}
                onFilesSelected={setAnnexureFile}
                value={annexureFile}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload an annexure PDF
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" onClick={() => router.push("/quotations")}>
              Cancel
            </Button>
            <Button type="submit">Preview Quotation</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuotationForm />
    </Suspense>
  );
} 