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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Company {
  id: string;
  name: string;
  currency: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  project: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  company: z.string().min(1, "Company is required"),
});

export default function QuotationRequestPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

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

      if (!userEmail || accessType !== 'internal') {
        toast.error('Please log in as an internal user');
        router.push('/login');
        return;
      }
    };

    if (!isMounted) {
      checkAuth();
      loadCompanies();
    }
  }, [isMounted, router]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        throw new Error('Failed to load companies');
      }
      const data = await response.json();
      if (data.companies && Array.isArray(data.companies)) {
        setCompanies(data.companies);
      } else {
        console.error("Unexpected API response format:", data);
        toast.error("Invalid companies data format");
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Failed to load companies");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userName = Cookies.get('userName') || values.name;
      const userEmail = Cookies.get('userEmail');
      
      // Create a new quotation request
      const quotationData = {
        customerName: values.name,
        project: values.project,
        title: values.title,
        description: values.description,
        company: values.company,
        date: new Date().toISOString().split('T')[0],
        actionHistory: [`Requested by ${userName} (${userEmail}) on ${new Date().toISOString().split('T')[0]}`],
        status: 'pending' as const,
        userEmail: userEmail
      };

      await addQuotationRequest(quotationData);
      toast.success("Quotation request submitted successfully");
      router.push("/quotations/requested");
    } catch (error) {
      console.error("Error submitting quotation request:", error);
      toast.error("Failed to submit quotation request");
    }
  }

  if (!isMounted) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
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
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
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
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
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
                onClick={() => router.push("/quotations")}
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