"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';
import { hasAnalyticsPermission } from "@/lib/permissions";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const accessType = Cookies.get('accessType');
      
      if (accessType === 'external') {
        router.push('/quotations/external');
      } else if (accessType === 'internal') {
        try {
          // Check if internal user has analytics permission
          const canViewAnalytics = await hasAnalyticsPermission();
          if (canViewAnalytics) {
            router.push('/quotations/analytics');
          } else {
            router.push('/quotations');
          }
        } catch (error) {
          console.error('Error checking permissions:', error);
          router.push('/quotations');
        }
      } else {
        router.push('/login');
      }
    };

    redirectUser();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse">Redirecting...</div>
    </div>
  );
} 