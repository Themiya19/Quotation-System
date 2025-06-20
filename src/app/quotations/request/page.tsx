"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestedQuotationsTable } from "@/components/quotations/requested-quotations-table";
import { getQuotationRequests } from "@/lib/quotations";
import { type QuotationRequest } from "@/types/quotationRequest";
import Cookies from 'js-cookie';
import { motion } from "framer-motion";
import Link from "next/link";
import type { Variants } from "framer-motion";

export default function MyQuotationRequestsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  } as const;

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      }
    }
  } as const;

  useEffect(() => {
    const checkAuth = async () => {
      const userEmail = Cookies.get('userEmail');
      const accessType = Cookies.get('accessType');

      if (!userEmail || accessType !== 'internal') {
        toast.error('Please log in as an internal user');
        router.push('/login');
        return;
      }

      loadQuotations();
    };

    checkAuth();
    setIsMounted(true);
  }, [router]);

  const loadQuotations = async () => {
    try {
      setIsLoading(true);
      const data = await getQuotationRequests();
      
      // Get user info from cookies
      const userEmail = Cookies.get('userEmail');
      const userName = Cookies.get('userName');
      
      // Filter quotation requests to show only those requested by the current user
      // Handle both formats: "Requested by [name] ([company]) on [date]" and "Requested by [name] on [date]"
      const filteredData = data.filter(quotation => 
        quotation.actionHistory.some(action => {
          const actionLower = action.toLowerCase();
          
          // Check if userName is in the action history entry
          if (userName && actionLower.includes(`requested by ${userName.toLowerCase()}`)) {
            return true;
          }
          
          // Check if email is in the action history entry (in case email is included)
          if (userEmail && actionLower.includes(userEmail.toLowerCase())) {
            return true;
          }
          
          return false;
        })
      );
      
      setQuotations(filteredData);
    } catch (error) {
      console.error('Error loading quotation requests:', error);
      toast.error("Failed to load quotation requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuotation = async (quotation: QuotationRequest) => {
    try {
      // Navigate to create quotation page with the request data and action history
      const encodedHistory = encodeURIComponent(JSON.stringify(quotation.actionHistory));
      router.push(`/quotations/new?requestId=${quotation.id}&actionHistory=${encodedHistory}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error("Failed to create quotation");
    }
  };

  const handleReject = async (quotation: QuotationRequest) => {
    try {
      // Call API to reject the quotation request
      const response = await fetch(`/api/quotation-requests/${quotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          actionHistory: [
            ...quotation.actionHistory,
            `Rejected on ${new Date().toISOString().split('T')[0]}`
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject quotation request');
      }

      // Update the quotation in the local state
      setQuotations(prevQuotations =>
        prevQuotations.map(q =>
          q.id === quotation.id
            ? { 
                ...q, 
                status: 'rejected',
                actionHistory: [
                  ...q.actionHistory,
                  `Rejected on ${new Date().toISOString().split('T')[0]}`
                ]
              }
            : q
        )
      );

      toast.success("Quotation request rejected successfully");
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast.error("Failed to reject quotation request");
    }
  };

  // During SSR and initial hydration, render without motion components
  if (!isMounted) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Quotation Requests</h1>
          <Button asChild>
            <Link href="/quotations/my-requests">Request New Quotation</Link>
          </Button>
        </div>
        
        <Card>
          <CardContent>
            <RequestedQuotationsTable
              quotations={quotations}
              isLoading={isLoading}
              onCreateQuotation={handleCreateQuotation}
              onReject={handleReject}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // After hydration, render with animations
  return (
    <motion.div 
      className="container mx-auto py-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex justify-between items-center mb-6" 
        variants={itemVariants}
      >
        <h1 className="text-2xl font-bold">My Quotation Requests</h1>
        <Button asChild>
          <Link href="/quotations/my-requests">Request New Quotation</Link>
        </Button>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <RequestedQuotationsTable
              quotations={quotations}
              isLoading={isLoading}
              onCreateQuotation={handleCreateQuotation}
              onReject={handleReject}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 