import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Pencil, Trash2, ImageIcon, Info } from "lucide-react";
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
import { FileUpload } from "@/components/ui/file-upload";
import Image from "next/image";
import { checkFeaturePermission } from "@/lib/permissions";

// Define the company details schema
const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  shortName: z.string().optional(), // Optional short name
  address: z.string().min(1, "Company address is required"),
  phoneNumber: z.string().min(1, "Company phone number is required"),
  logo: z.any().optional(), // For file upload
});

export interface CompanyDetails {
  id?: string;
  name: string;
  shortName?: string; // Optional short name
  address: string;
  phoneNumber: string;
  logoUrl: string;
  updatedAt: string;
}

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function MyCompanies() {
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyDetails[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canManageMyCompany, setCanManageMyCompany] = useState(false);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      shortName: "",
      address: "",
      phoneNumber: "",
    },
  });

  // Check permission to manage my company
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasPermission = await checkFeaturePermission('manage_my_company');
        setCanManageMyCompany(hasPermission);
      } catch (error) {
        console.error('Error checking manage_my_company permission:', error);
        setCanManageMyCompany(false);
      }
    };
    
    checkPermissions();
  }, []);

  // Load companies from JSON file
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/company-details');
        if (response.ok) {
          const data = await response.json();
          setCompanies(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to load companies');
        }
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Update form when a company is selected for editing
  useEffect(() => {
    if (selectedCompany) {
      form.reset({
        name: selectedCompany.name,
        shortName: selectedCompany.shortName || "",
        address: selectedCompany.address,
        phoneNumber: selectedCompany.phoneNumber,
      });

      if (selectedCompany.logoUrl) {
        setLogoPreview(selectedCompany.logoUrl);
      } else {
        setLogoPreview(null);
      }
    }
  }, [selectedCompany, form]);

  const onSubmit = async (values: CompanyFormValues) => {
    if (!canManageMyCompany) {
      toast.error("You don't have permission to manage company profiles");
      return;
    }

    try {
      let logoUrl = selectedCompany?.logoUrl || "";
      
      // Handle logo upload if file is selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', 'logo');
        
        const response = await fetch('/api/company-upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload logo');
        }
        
        const data = await response.json();
        logoUrl = data.fileUrl;
      }
      
      // Create new company details object
      const companyData: CompanyDetails = {
        id: selectedCompany?.id || Date.now().toString(),
        name: values.name,
        shortName: values.shortName || undefined,
        address: values.address,
        phoneNumber: values.phoneNumber,
        logoUrl: logoUrl,
        updatedAt: new Date().toISOString()
      };
      
      let updatedCompanies: CompanyDetails[];
      
      if (isEditing && selectedCompany) {
        // Update existing company
        updatedCompanies = companies.map(company => 
          company.id === selectedCompany.id ? companyData : company
        );
      } else {
        // Add new company
        updatedCompanies = [...companies, companyData];
      }
      
      // Save updated companies list
      const saveResponse = await fetch('/api/company-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCompanies),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save company details');
      }
      
      const savedData = await saveResponse.json();
      setCompanies(savedData);
      toast.success(isEditing ? "Company updated successfully!" : "Company added successfully!");
      
      setIsDialogOpen(false);
      setIsEditing(false);
      setSelectedCompany(null);
      setSelectedFile(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Error saving company details:", error);
      toast.error("Failed to save company details");
    }
  };

  const handleEdit = (company: CompanyDetails) => {
    if (!canManageMyCompany) {
      toast.error("You don't have permission to edit company profiles");
      return;
    }
    setIsEditing(true);
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canManageMyCompany) {
      toast.error("You don't have permission to add company profiles");
      return;
    }
    setIsEditing(false);
    setSelectedCompany(null);
    form.reset({
      name: "",
      shortName: "",
      address: "",
      phoneNumber: "",
    });
    setSelectedFile(null);
    setLogoPreview(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (company: CompanyDetails) => {
    if (!canManageMyCompany) {
      toast.error("You don't have permission to delete company profiles");
      return;
    }
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCompany || !canManageMyCompany) return;
    
    try {
      // Filter out the selected company
      const updatedCompanies = companies.filter(company => 
        company.id !== selectedCompany.id
      );
      
      // Save updated companies list
      const saveResponse = await fetch('/api/company-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCompanies),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to delete company');
      }
      
      const savedData = await saveResponse.json();
      setCompanies(savedData);
      toast.success("Company deleted successfully!");
      
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company");
    }
  };

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      
      // Create a preview URL for the selected file
      const filePreviewUrl = URL.createObjectURL(files[0]);
      setLogoPreview(filePreviewUrl);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Companies</CardTitle>
            <CardDescription>
              {canManageMyCompany 
                ? "Manage your company information"
                : "View your company information"}
            </CardDescription>
          </div>
          {canManageMyCompany && (
            <Button onClick={handleAdd}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company, index) => (
              <div 
                key={company.id || index}
                className="flex flex-col p-4 border rounded-lg hover:bg-accent/10 transition-colors"
              >
                <div className="flex justify-center mb-4">
                  {company.logoUrl ? (
                    <div className="relative w-24 h-24">
                      <Image 
                        src={company.logoUrl} 
                        alt={`${company.name} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-24 h-24 bg-muted rounded-md">
                      <ImageIcon size={32} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                  {company.shortName && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Short Name:</span> {company.shortName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Address:</span> {company.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Phone:</span> {company.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(company.updatedAt).toLocaleString()}
                  </p>
                </div>
                {canManageMyCompany && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(company)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(company)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : canManageMyCompany ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">No companies added yet</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleAdd}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Company
            </Button>
          </div>
        ) : (
          <div className="text-center p-8 flex flex-col items-center">
            <Info className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No companies have been added yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your administrator to set up your company profiles.
            </p>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* <DialogContent className="sm:max-w-[500px]"> */}
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Company" : "Add Company"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update your company information below" 
                : "Add your company details below"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Short Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter short name or acronym" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter company address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel>Company Logo</FormLabel>
                <div className="flex flex-col space-y-4">
                  {logoPreview && (
                    <div className="relative w-full h-40 mx-auto">
                      <Image 
                        src={logoPreview} 
                        alt="Logo preview" 
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  
                  <FileUpload
                    accept={{ 
                      'image/jpeg': ['.jpg', '.jpeg'],
                      'image/png': ['.png'],
                      'image/svg+xml': ['.svg']
                    }}
                    maxSize={2 * 1024 * 1024} // 2MB
                    onFilesSelected={handleFileSelected}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: JPG, PNG, SVG. Max file size: 2MB
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit">
                  {isEditing ? "Update Company" : "Add Company"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 