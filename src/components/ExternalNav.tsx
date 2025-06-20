"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, LayoutDashboard, ChevronDown } from "lucide-react";
import Cookies from "js-cookie";

// Define types for navigation and features
interface SubmenuItem {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  hasSubmenu: boolean;
  key: string;
  submenu?: SubmenuItem[];
}

interface ExternalFeature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

export function ExternalNav() {
  const pathname = usePathname();
  const initialLoadRef = useRef(true);
  const [initialized, setInitialized] = useState(false);
  const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [externalFeatures, setExternalFeatures] = useState<ExternalFeature[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Handle client-side hydration
  useEffect(() => {
    setInitialized(true);
    return () => {
      // This effect runs once
      initialLoadRef.current = false;
    };
  }, []);

  // Load features and determine permissions
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const response = await fetch('/api/external-features');
        const data = await response.json();
        setExternalFeatures(data.features);
      } catch (error) {
        console.error('Error loading external features:', error);
      }
    };

    // Get user role from cookie
    const externalType = Cookies.get('externalType');
    if (externalType) {
      // Check if externalType already has the ext_ prefix
      setUserRole(externalType.startsWith('ext_') ? externalType : `ext_${externalType}`);
    }

    loadFeatures();
  }, []);

  // Update nav items based on permissions
  useEffect(() => {
    // Skip if features aren't loaded yet
    if (!externalFeatures.length || !userRole) return;

    const hasViewOwnQuotationsOnly = externalFeatures.find(f => 
      f.id === 'view_own_quotations_only' && f.allowedRoles.includes(userRole)
    );

    // Determine which navigation items to show
    const updatedNavItems = [];

    // Quotations menu
    const quotationsMenu = {
      title: "Quotations",
      href: hasViewOwnQuotationsOnly ? "/quotations/external/my" : "/quotations/external",
      icon: <FileText size={18} strokeWidth={2.5} />,
      hasSubmenu: !hasViewOwnQuotationsOnly,
      key: "quotations-menu",
      submenu: hasViewOwnQuotationsOnly ? undefined : [
        {
          title: "All Quotations",
          href: "/quotations/external",
        },
        {
          title: "My Quotations",
          href: "/quotations/external/my",
        }
      ]
    };
    updatedNavItems.push(quotationsMenu);

    // Quotation Requests menu
    const requestsMenu = {
      title: "Quotation Requests",
      href: hasViewOwnQuotationsOnly ? "/quotations/external/requested/my" : "/quotations/external/requested",
      icon: <LayoutDashboard size={18} strokeWidth={2.5} />,
      hasSubmenu: !hasViewOwnQuotationsOnly,
      key: "requests-menu",
      submenu: hasViewOwnQuotationsOnly ? undefined : [
        {
          title: "All Quotation Requests",
          href: "/quotations/external/requested",
        },
        {
          title: "My Quotation Requests",
          href: "/quotations/external/requested/my",
        }
      ]
    };
    updatedNavItems.push(requestsMenu);

    setNavItems(updatedNavItems);
  }, [externalFeatures, userRole]);

  // Always return the same initial structure for both server and client rendering
  // This ensures hydration doesn't mismatch
  if (!initialized || navItems.length === 0) {
    return <div className="relative mb-6 h-12"></div>;
  }

  // After initialization, return the full nav component
  return (
    <nav className="relative mb-6">
      <div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {navItems.map((route) => (
          route.hasSubmenu ? (
            <div 
              key={route.key || route.href}
              className="relative group" 
              onMouseEnter={() => setHoveredDropdown(route.href)}
              onMouseLeave={() => setHoveredDropdown(null)}
            >
              <Link
                href={route.href}
                onClick={(e) => {
                  if (route.hasSubmenu) {
                    e.preventDefault();
                  }
                }}
                className={cn(
                  "relative cursor-pointer text-sm px-6 py-2 rounded-full transition-colors flex items-center",
                  "text-foreground/80 hover:text-primary",
                  (pathname === route.href || route.submenu?.some(item => item.href === pathname)) ? "bg-muted text-primary" : ""
                )}
              >
                <span className="hidden md:inline">{route.title}</span>
                <span className="md:hidden">{route.icon}</span>
                <ChevronDown className="h-4 w-4 ml-1" />
                {(pathname === route.href || route.submenu?.some(item => item.href === pathname)) && (
                  <motion.div
                    layoutId="external-active-pill"
                    className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                    initial={initialLoadRef.current ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: initialLoadRef.current ? 0.1 : 0
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                      <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </Link>
              <div 
                className={cn(
                  "absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150", 
                  hoveredDropdown === route.href ? "opacity-100 visible" : ""
                )}
                style={{ minWidth: '200px' }}
              >
                <div className="rounded-md bg-white dark:bg-gray-800 shadow-lg border border-border overflow-hidden">
                  {route.submenu?.map((submenuItem) => (
                    <Link
                      key={submenuItem.href}
                      href={submenuItem.href}
                      className={cn(
                        "block px-4 py-2 text-sm hover:bg-accent/50 transition-colors text-muted-foreground"
                      )}
                    >
                      {submenuItem.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "relative cursor-pointer text-sm px-6 py-2 rounded-full transition-colors",
                "text-foreground/80 hover:text-primary",
                pathname === route.href ? "bg-muted text-primary" : ""
              )}
            >
              <span className="hidden md:inline">{route.title}</span>
              <span className="md:hidden">{route.icon}</span>
              {pathname === route.href && (
                <motion.div
                  layoutId="external-active-pill"
                  className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                  initial={initialLoadRef.current ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: initialLoadRef.current ? 0.1 : 0
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                    <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        ))}
      </div>
    </nav>
  );
} 