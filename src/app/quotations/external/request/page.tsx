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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addQuotationRequest } from "@/lib/quotations";
import Cookies from 'js-cookie';
import { useCompanyStore } from "@/lib/companies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  project: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  company: z.string().min(1, "Company is required"),
});

export default function ExternalQuotationRequestPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { companies, loadCompanies } = useCompanyStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      project: "",
      title: "",
      description: "",
      company: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      setIsMounted(true);
      const userEmail = Cookies.get('userEmail');
      const accessType = Cookies.get('accessType');

      if (!userEmail || accessType !== 'external') {
        toast.error('Please log in as an external user');
        router.push('/login');
        return;
      }

      // Load companies for the dropdown
      await loadCompanies();
    };

    if (!isMounted) {
      checkAuth();
    }
  }, [isMounted, router, loadCompanies]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Get company name from selected company ID
      const selectedCompany = companies.find(c => c.id === values.company);
      const userEmail = Cookies.get('userEmail');
      
      if (!selectedCompany) {
        toast.error('Selected company not found');
        return;
      }

      // Create a new quotation request with the selected company
      const quotationData = {
        customerName: values.name,
        project: values.project,
        title: values.title,
        description: values.description,
        company: values.company,
        date: new Date().toLocaleString(),
        actionHistory: [`Requested by ${values.name} (${userEmail}) on ${new Date().toLocaleString()}`],
        status: 'pending' as const,
        userEmail: userEmail // Add user's email to the quotation request
      };

      await addQuotationRequest(quotationData);
      toast.success("Quotation request submitted successfully");
      router.push("/quotations/external/requested");
    } catch (error) {
      console.error("Error submitting quotation request:", error);
      toast.error("Failed to submit quotation request");
    }
  }

  if (!isMounted) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Request New Quotation</h2>
          <p className="text-muted-foreground">Create a new quotation request with the form below.</p>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.push("/quotations/external")}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
} 