"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { X, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { type Quotation, type QuotationItem, type Term } from "@/types/quotation";
import { getQuotationById, updateQuotation } from "@/lib/quotations";
import { saveAnnexureFile } from '@/lib/annexureUpload';

const formSchema = z.object({
  company: z.string().min(1, "Company is required"),
  project: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string(),
  taxRate: z.string(),
  toAddress: z.string().min(1, "Address is required"),
  attn: z.string().min(1, "Attention is required"),
  currency: z.string().min(1, "Currency is required"),
  emailTo: z.array(z.string()).min(1, "At least one Email To is required"),
  emailCC: z.array(z.string()).optional(),
  salesperson: z.string().min(1, "Salesperson is required"),
  customerReferences: z.string(),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  dueDate: z.string().min(1, "Due date is required"),
  forDepartment: z.string(),
  myCompany: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const { companies, loadCompanies } = useCompanyStore();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuotationItem[]>([{ id: '1', system: "", description: "", unit: "", qty: "", amount: "" } as QuotationItem]);
  const [terms, setTerms] = useState<Term[]>([{ id: '1', content: "" } as Term]);
  const [annexureFile, setAnnexureFile] = useState<File[]>([]);
  const [existingAnnexureUrl, setExistingAnnexureUrl] = useState<string>("");
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });
  const [emailToInput, setEmailToInput] = useState("");
  const [emailCCInput, setEmailCCInput] = useState("");
  const [departments, setDepartments] = useState<{id: string, name: string, description: string}[]>([]);
  const [myCompanies, setMyCompanies] = useState<Array<{id: string, name: string, address: string, phoneNumber: string, logoUrl: string}>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
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
      forDepartment: "",
      myCompany: "",
    },
  });

  // Use useWatch to track discountType, discountValue, and taxRate
  const discountType = useWatch({ control: form.control, name: "discountType" });
  const discountValue = useWatch({ control: form.control, name: "discountValue" });
  const taxRate = useWatch({ control: form.control, name: "taxRate" });

  // Memoized reset function to avoid linter warning
  const resetForm = useCallback(
    (values: FormValues) => {
      form.reset(values);
    },
    [form]
  );

  // Load quotation data
  useEffect(() => {
    async function loadQuotation() {
      try {
        const data = await getQuotationById(params.id as string);
        if (!data) {
          toast.error("Quotation not found");
          router.push("/quotations");
          return;
        }
        setQuotation(data);
        
        // Convert email fields to arrays if they're strings
        let emailToArr: string[] = [];
        if (data.emailTo) {
          emailToArr = typeof data.emailTo === 'string' 
            ? data.emailTo.split(',').map(email => email.trim())
            : Array.isArray(data.emailTo) ? data.emailTo : [data.emailTo];
        }
        
        let emailCCArr: string[] = [];
        if (data.emailCC) {
          emailCCArr = typeof data.emailCC === 'string'
            ? data.emailCC.split(',').map(email => email.trim()) 
            : Array.isArray(data.emailCC) ? data.emailCC : [data.emailCC];
        }
        
        // Set form values
        const quotationData = data as (Quotation & { myCompany?: string });
        resetForm({
          company: quotationData.company,
          project: quotationData.project,
          title: quotationData.title,
          discountType: quotationData.discountType,
          discountValue: quotationData.discountValue,
          taxRate: quotationData.taxRate,
          toAddress: quotationData.toAddress,
          attn: quotationData.attn,
          currency: quotationData.currency,
          emailTo: emailToArr,
          emailCC: emailCCArr,
          salesperson: quotationData.salesperson || "",
          customerReferences: quotationData.customerReferences || "",
          paymentTerms: quotationData.paymentTerms || "",
          dueDate: quotationData.dueDate || "",
          forDepartment: quotationData.forDepartment || "",
          myCompany: quotationData.myCompany || "",
        });

        // Set items and terms
        if (data.items) setItems(data.items);
        if (data.terms) setTerms(data.terms);
        
        // Set existing annexure URL if available
        if (data.annexureUrl) {
          setExistingAnnexureUrl(data.annexureUrl);
        }
      } catch (error) {
        console.error('Error loading quotation:', error);
        toast.error("Failed to load quotation");
        router.push("/quotations");
      } finally {
        setLoading(false);
      }
    }

    loadQuotation();
    loadCompanies();
    
    // Load departments
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
  }, [params.id, router, resetForm, loadCompanies]);

  // Calculate totals whenever items, discount, or tax changes
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      const amount = parseFloat(item.amount ?? '') || 0;
      const qty = parseFloat(item.qty ?? '') || 0;
      return sum + (amount * qty);
    }, 0);

    const discountValueNum = parseFloat(discountValue) || 0;
    const taxRateNum = parseFloat(taxRate) || 0;

    let discountAmount = 0;
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
  }, [items, discountType, discountValue, taxRate]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), system: "", description: "", unit: "", qty: "", amount: "" } as QuotationItem]);
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
    setTerms([...terms, { id: Date.now().toString(), content: "" } as Term]);
  };

  const removeTerm = (id: string) => {
    setTerms(terms.filter(term => term.id !== id));
  };

  const updateTerm = (id: string, content: string) => {
    setTerms(terms.map(term => 
      term.id === id ? { ...term, content } : term
    ));
  };

  const handleRemoveAnnexure = async () => {
    if (quotation) {
      try {
        // Create a complete updated quotation object
        const updatedQuotation: Quotation = {
          ...quotation,
          annexureUrl: "",
          actionHistory: [
            ...quotation.actionHistory,
            `Annexure removed on ${new Date().toISOString().split('T')[0]}`
          ]
        };

        // Update the quotation
        await updateQuotation(quotation.id, updatedQuotation);
        
        // Update local state
        setExistingAnnexureUrl("");
        setQuotation(updatedQuotation);
        
        toast.success("Annexure removed successfully");
      } catch (error) {
        console.error('Error removing annexure:', error);
        toast.error("Failed to remove annexure");
      }
    }
  };

  // Add email management functions
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
      // Just set the selected company ID
      form.setValue("myCompany", companyId);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!quotation || !params.id) {
        toast.error("Quotation not found");
        return;
      }

      // Join email arrays to strings for storage
      const emailTo = Array.isArray(values.emailTo) ? values.emailTo.join(',') : values.emailTo;
      const emailCC = Array.isArray(values.emailCC) ? values.emailCC.join(',') : values.emailCC || '';

      // Calculate the final total amount
      const subtotal = items.reduce((sum, item) => {
        const amount = parseFloat(item.amount ?? '') || 0;
        const qty = parseFloat(item.qty ?? '') || 0;
        return sum + (amount * qty);
      }, 0);

      const discountValueNum = parseFloat(values.discountValue) || 0;
      const taxRateNum = parseFloat(values.taxRate) || 0;

      let discountAmount = 0;
      if (values.discountType === "percentage") {
        discountAmount = (subtotal * discountValueNum) / 100;
      } else {
        discountAmount = discountValueNum;
      }

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * taxRateNum) / 100;
      const finalTotal = afterDiscount + taxAmount;

      const updatedQuotation: Quotation = {
        ...quotation,
        ...values,
        emailTo,
        emailCC,
        items,
        terms,
        amount: finalTotal,
        actionHistory: [
          ...quotation.actionHistory,
          `Edited on ${new Date().toISOString().split("T")[0]}`,
        ],
      };

      try {
        // Generate new PDF
        const response = await fetch('/api/quotations/save-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedQuotation),
        });
        const { url: pdfUrl } = await response.json();
        updatedQuotation.pdfUrl = pdfUrl;

        // Save annexure file if provided
        if (annexureFile.length > 0) {
          const annexureUrl = await saveAnnexureFile(annexureFile[0], updatedQuotation.quotationNo);
          updatedQuotation.annexureUrl = annexureUrl;
        }
      } catch (error) {
        console.error('Error generating PDF or saving annexure:', error);
        // Continue with the process even if PDF generation fails
      }

      // Update the quotation using the API
      await updateQuotation(params.id as string, updatedQuotation);

      toast.success("Quotation updated successfully");
      router.push("/quotations");
    } catch (error) {
      toast.error("Failed to update quotation");
      console.error("Error updating quotation:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!quotation) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Quotation</h2>
        <p className="text-muted-foreground">Edit quotation details below.</p>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="forDepartment"
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
                        <Input placeholder="Enter attention to" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      value={item.system ?? ""}
                      onChange={(e) => updateItem(item.id, "system", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Textarea
                      placeholder="Description"
                      value={item.description ?? ""}
                      onChange={(e) => {
                        updateItem(item.id, "description", e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      rows={1}
                      style={{ resize: "none", minHeight: "38px" }}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Qty"
                      value={item.qty ?? ""}
                      onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="text"
                      placeholder="Unit"
                      value={item.unit ?? ""}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Amount"
                      value={item.amount ?? ""}
                      onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 py-2">
                    {((parseFloat(item.qty ?? '') || 0) * (parseFloat(item.amount ?? '') || 0)).toFixed(2)}
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
                      value={term.content ?? ""}
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
              {existingAnnexureUrl && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current annexure:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(existingAnnexureUrl)}
                  >
                    View Annexure
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAnnexure}
                    className="text-red-500 hover:text-red-600"
                  >
                    Remove
                  </Button>
                </div>
              )}
              <FileUpload
                accept={{
                  'application/pdf': ['.pdf']
                }}
                maxFiles={1}
                onFilesSelected={setAnnexureFile}
                value={annexureFile}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {existingAnnexureUrl ? "Upload a new file to replace the existing annexure" : "Upload an annexure PDF"}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" onClick={() => router.push("/quotations")}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 