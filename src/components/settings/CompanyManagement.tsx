import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useCompanyStore } from "@/lib/companies";
import { PlusCircle, Pencil, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInternalPermissions } from "@/hooks/useInternalPermissions";
import type { Company } from "@/lib/companies";

// Define the company form schema
const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  currency: z.enum(["USD", "SGD", "LKR"], {
    required_error: "Please select a currency",
  }),
  emailTo: z.array(z.string().email("Please enter a valid email")).min(1, "At least one Email To is required"),
  emailCC: z.array(z.string().email("Please enter a valid email")).optional(),
  address: z.string().optional(),
  attention: z.string().optional(),
  terms: z.array(z.object({
    id: z.number(),
    content: z.string().min(1, "Term content is required")
  })).min(1, "At least one term is required")
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompanyManagement() {
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanyStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [terms, setTerms] = useState<{ id: number; content: string }[]>([{ id: 1, content: "" }]);
  const [emailToInput, setEmailToInput] = useState("");
  const [emailCCInput, setEmailCCInput] = useState("");
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const { hasPermission } = useInternalPermissions();
  const canManageCompanies = hasPermission('manage_companies');

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      currency: "USD",
      emailTo: [],
      emailCC: [],
      address: "",
      attention: "",
      terms: [{ id: 1, content: "" }]
    },
  });

  const addTerm = () => {
    const newTerm = { id: terms.length + 1, content: "" };
    setTerms([...terms, newTerm]);
    const currentTerms = form.getValues("terms");
    form.setValue("terms", [...currentTerms, newTerm]);
  };

  const removeTerm = (id: number) => {
    if (terms.length === 1) {
      toast.error("At least one term is required");
      return;
    }
    const newTerms = terms.filter(term => term.id !== id);
    setTerms(newTerms);
    form.setValue("terms", newTerms);
  };

  const onSubmit = (values: CompanyFormValues) => {
    if (editingCompany) {
      updateCompany(editingCompany, values);
      toast.success("Company updated successfully!");
    } else {
      addCompany(values);
      toast.success("Company added successfully!");
    }
    setIsDialogOpen(false);
    setEditingCompany(null);
    form.reset();
    setTerms([{ id: 1, content: "" }]);
    setEmailToInput("");
    setEmailCCInput("");
  };

  // Add a handler for dialog close to reset email inputs
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEmailToInput("");
      setEmailCCInput("");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company.id);
    setTerms(company.terms || [{ id: 1, content: "" }]);
    form.reset({
      name: company.name,
      currency: company.currency,
      emailTo: Array.isArray(company.emailTo) ? company.emailTo : [company.emailTo],
      emailCC: Array.isArray(company.emailCC) ? company.emailCC : (company.emailCC ? [company.emailCC] : []),
      address: company.address || '',
      attention: company.attention || '',
      terms: company.terms || [{ id: 1, content: "" }]
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCompanyToDelete(id);
    setIsDeleteCompanyDialogOpen(true);
  };

  const confirmDeleteCompany = () => {
    if (companyToDelete) {
      deleteCompany(companyToDelete);
      toast.success("Company deleted successfully!");
      setIsDeleteCompanyDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingCompany(null);
    setTerms([{ id: 1, content: "" }]);
    form.reset({
      name: "",
      currency: "USD",
      emailTo: [],
      emailCC: [],
      address: "",
      attention: "",
      terms: [{ id: 1, content: "" }]
    });
    setIsDialogOpen(true);
  };

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Management</CardTitle>
            <CardDescription>
              Manage company information and settings
            </CardDescription>
          </div>
          {canManageCompanies && (
            <Button onClick={handleAddNew}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No companies found.
            </p>
          ) : (
            <div className="grid gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Currency: {company.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Email To: {Array.isArray(company.emailTo) ? company.emailTo.join(", ") : company.emailTo}
                    </p>
                    {company.emailCC && (
                      <p className="text-sm text-muted-foreground">
                        Email CC: {Array.isArray(company.emailCC) ? company.emailCC.join(", ") : company.emailCC}
                      </p>
                    )}
                  </div>
                  {canManageCompanies && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(company)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(company.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Add Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {editingCompany ? 'Edit company details' : 'Add a new company to the system'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="SGD">SGD</SelectItem>
                        <SelectItem value="LKR">LKR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Email CC (Optional)</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input 
                          value={emailCCInput}
                          onChange={(e) => setEmailCCInput(e.target.value)}
                          placeholder="Enter CC email address"
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
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter company address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attention (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter attention" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms</label>
                <div className="space-y-4">
                  {terms.map((term, index) => (
                    <div key={term.id} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`terms.${index}.content`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder={`Term ${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {terms.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeTerm(term.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTerm}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </div>
              <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
                <Button type="submit">
                  {editingCompany ? 'Save Changes' : 'Add Company'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Company Dialog */}
      <Dialog open={isDeleteCompanyDialogOpen} onOpenChange={setIsDeleteCompanyDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteCompanyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCompany}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 