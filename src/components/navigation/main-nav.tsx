"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { checkFeaturePermission } from "@/lib/permissions";
import Cookies from "js-cookie";
import {
	ChevronDown,
	Settings,
	FileText,
	LayoutDashboard,
	PlusSquare,
	BarChart2,
} from "lucide-react";
import { motion } from "framer-motion";

export function MainNav() {
	const pathname = usePathname();
	const initialLoadRef = useRef(true);
	// Start with empty routes to match server-side rendering
	const [availableRoutes, setAvailableRoutes] = useState<
		Array<{
			href: string;
			key?: string;
			label: string;
			active: boolean;
			hasSubmenu?: boolean;
			submenu?: Array<{
				href: string;
				label: string;
				active: boolean;
			}>;
		}>
	>([]);

	// Track hover state for each dropdown
	const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);

	// Initialize routes only on client-side
	useEffect(() => {
		const loadRoutes = async () => {
			const userType = Cookies.get("accessType");

			if (userType === "external") {
				setAvailableRoutes([
					{
						href: "/quotations/external",
						label: "Quotations",
						active: pathname === "/quotations/external" || pathname === "/quotations/external/my",
						key: "external-quotations-menu",
						hasSubmenu: true,
						submenu: [
							{
								href: "/quotations/external",
								label: "All Quotations",
								active: pathname === "/quotations/external",
							},
							{
								href: "/quotations/external/my",
								label: "My Quotations",
								active: pathname === "/quotations/external/my",
							},
						],
					},
					{
						href: "/quotations/external/requested",
						label: "Quotation Requests",
						active: pathname === "/quotations/external/requested",
					},
					{
						href: "#",
						key: "reports-menu",
						label: "Reports",
						active: false,
						hasSubmenu: false,
					},
				]);
				setInitialized(true);
				return;
			}

			try {
				const [
					canCreateQuotations,
					canManageUsers,
					canManageCompanies,
					canManageRoles,
					canManageFeatures,
					canManageMyCompany,
					canViewOwnQuotationsOnly,
				] = await Promise.all([
					checkFeaturePermission("create_quotations"),
					checkFeaturePermission("manage_users"),
					checkFeaturePermission("manage_companies"),
					checkFeaturePermission("manage_roles"),
					checkFeaturePermission("manage_features"),
					checkFeaturePermission("manage_my_company"),
					checkFeaturePermission("view_own_quotations_only"),
				]);

				const routes = [];

				// If 'view_own_quotations_only' is enabled, show 'My Quotations', 'My Quotation Requests', 'Reports', and 'Settings' (if allowed)
				if (canViewOwnQuotationsOnly) {
					routes.push({
						href: "/quotations/my",
						label: "My Quotations",
						active: pathname === "/quotations/my",
					});
					routes.push({
						href: "/quotations/request",
						label: "My Quotation Requests",
						active: pathname === "/quotations/request",
					});
					routes.push({
						href: "#",
						key: "reports-menu",
						label: "Reports",
						active: false,
						hasSubmenu: false,
					});

					const hasAnySettingsPermission =
						canManageUsers ||
						canManageCompanies ||
						canManageRoles ||
						canManageFeatures ||
						canManageMyCompany;

					if (hasAnySettingsPermission) {
						const settingsSubmenu = [];

						if (canManageMyCompany) {
							settingsSubmenu.push({
								href: "/settings?tab=my-companies",
								label: "DSP",
								active: pathname === "/settings" && pathname.includes("?tab=my-companies"),
							});
						}

						if (canManageUsers) {
							settingsSubmenu.push({
								href: "/settings?tab=users",
								label: "User Management",
								active: pathname === "/settings" && pathname.includes("?tab=users"),
							});
						}

						if (canManageCompanies) {
							settingsSubmenu.push({
								href: "/settings?tab=companies",
								label: "Company Management",
								active: pathname === "/settings" && pathname.includes("?tab=companies"),
							});
						}

						if (canManageFeatures) {
							settingsSubmenu.push({
								href: "/settings?tab=features",
								label: "Features Management",
								active: pathname === "/settings" && pathname.includes("?tab=features"),
							});
						}

						if (canManageRoles) {
							settingsSubmenu.push({
								href: "/settings?tab=roles",
								label: "Roles Management",
								active: pathname === "/settings" && pathname.includes("?tab=roles"),
							});
						}

						if (settingsSubmenu.length > 0) {
							routes.push({
								href: "/settings",
								label: "Settings",
								active: pathname.startsWith("/settings"),
								hasSubmenu: true,
								submenu: settingsSubmenu,
							});
						}
					}

					setAvailableRoutes(routes);
					setInitialized(true);
					return;
				}

				// Add All Quotations if user can create quotations (broad access)
				if (canCreateQuotations) {
					routes.push({
						href: "/quotations",
						key: "quotations-menu",
						label: "Quotations",
						active: pathname === "/quotations" || pathname === "/quotations/my",
						hasSubmenu: true,
						submenu: [
							{
								href: "/quotations",
								label: "All Quotations",
								active: pathname === "/quotations",
							},
							{
								href: "/quotations/my",
								label: "My Quotations",
								active: pathname === "/quotations/my",
							},
						],
					});
				}

				// Add Quotation Requests
				if (canCreateQuotations) {
					routes.push({
						href: "/quotations/requested",
						key: "quotation-requests-menu",
						label: "Quotation Requests",
						active: pathname === "/quotations/requested" || pathname === "/quotations/request",
						hasSubmenu: true,
						submenu: [
							{
								href: "/quotations/requested",
								label: "All Quotation Requests",
								active: pathname === "/quotations/requested",
							},
							{
								href: "/quotations/request",
								label: "My Quotation Requests",
								active: pathname === "/quotations/request",
							},
						],
					});
				}

				routes.push({
					href: "#",
					key: "reports-menu",
					label: "Reports",
					active: false,
					hasSubmenu: false,
				});

				const hasAnySettingsPermission =
					canManageUsers ||
					canManageCompanies ||
					canManageRoles ||
					canManageFeatures ||
					canManageMyCompany;

				if (hasAnySettingsPermission) {
					const settingsSubmenu = [];

					if (canManageMyCompany) {
						settingsSubmenu.push({
							href: "/settings?tab=my-companies",
							label: "DSP",
							active: pathname === "/settings" && pathname.includes("?tab=my-companies"),
						});
					}

					if (canManageUsers) {
						settingsSubmenu.push({
							href: "/settings?tab=users",
							label: "User Management",
							active: pathname === "/settings" && pathname.includes("?tab=users"),
						});
					}

					if (canManageCompanies) {
						settingsSubmenu.push({
							href: "/settings?tab=companies",
							label: "Company Management",
							active: pathname === "/settings" && pathname.includes("?tab=companies"),
						});
					}

					if (canManageFeatures) {
						settingsSubmenu.push({
							href: "/settings?tab=features",
							label: "Features Management",
							active: pathname === "/settings" && pathname.includes("?tab=features"),
						});
					}

					if (canManageRoles) {
						settingsSubmenu.push({
							href: "/settings?tab=roles",
							label: "Roles Management",
							active: pathname === "/settings" && pathname.includes("?tab=roles"),
						});
					}

					if (settingsSubmenu.length > 0) {
						routes.push({
							href: "/settings",
							label: "Settings",
							active: pathname.startsWith("/settings"),
							hasSubmenu: true,
							submenu: settingsSubmenu,
						});
					}
				}

				setAvailableRoutes(routes);
				setInitialized(true);
			} catch (error) {
				console.error("Error loading navigation routes:", error);
				setAvailableRoutes([
					{
						href: "/",
						label: "Home",
						active: pathname === "/",
					},
				]);
				setInitialized(true);
			}
		};

		loadRoutes();
	}, [pathname]);

	useEffect(() => {
		if (initialLoadRef.current && initialized && availableRoutes.length > 0) {
			initialLoadRef.current = false;
		}
	}, [initialized, availableRoutes]);

	if (!initialized || availableRoutes.length === 0) {
		return <nav className="flex items-center space-x-6" suppressHydrationWarning />;
	}

	const getRouteIcon = (label: string) => {
		switch (label) {
			case "View Quotations":
				return <FileText size={18} strokeWidth={2.5} />;
			case "Requested Quotations":
				return <LayoutDashboard size={18} strokeWidth={2.5} />;
			case "Add Quotation":
				return <PlusSquare size={18} strokeWidth={2.5} />;
			case "Reports":
				return <BarChart2 size={18} strokeWidth={2.5} />;
			case "Settings":
				return <Settings size={18} strokeWidth={2.5} />;
			default:
				return <FileText size={18} strokeWidth={2.5} />;
		}
	};

	return (
		<nav className="relative z-40">
			<div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
				{availableRoutes.map((route) =>
					route.hasSubmenu ? (
						<div
							key={route.key || route.href}
							className="relative group"
							onMouseEnter={() => setHoveredDropdown(route.href)}
							onMouseLeave={() => setHoveredDropdown(null)}
						>
							<Link
								href={route.hasSubmenu ? route.href : route.href}
								onClick={(e) => {
									if (route.hasSubmenu) {
										e.preventDefault();
									}
								}}
								className={cn(
									"relative cursor-pointer text-sm px-6 py-2 rounded-full transition-colors flex items-center",
									"text-foreground/80 hover:text-primary",
									route.active ? "bg-muted text-primary" : ""
								)}
							>
								<span className="hidden md:inline">{route.label}</span>
								<span className="md:hidden">{getRouteIcon(route.label)}</span>
								<ChevronDown className="h-4 w-4 ml-1" />
								{route.active && (
									<motion.div
										layoutId="active-pill"
										className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
										initial={initialLoadRef.current ? { opacity: 0 } : false}
										animate={{ opacity: 1 }}
										transition={{
											type: "spring",
											stiffness: 300,
											damping: 30,
											delay: initialLoadRef.current ? 0.1 : 0,
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
									"absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 min-w-48",
									hoveredDropdown === route.href ? "opacity-100 visible" : ""
								)}
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
											{submenuItem.label}
										</Link>
									))}
								</div>
							</div>
						</div>
					) : (
						<Link
							key={route.key || route.href}
							href={route.href}
							className={cn(
								"relative cursor-pointer text-sm px-6 py-2 rounded-full transition-colors",
								"text-foreground/80 hover:text-primary",
								route.active ? "bg-muted text-primary" : ""
							)}
						>
							<span className="hidden md:inline">{route.label}</span>
							<span className="md:hidden">{getRouteIcon(route.label)}</span>
							{route.active && (
								<motion.div
									layoutId="active-pill"
									className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
									initial={initialLoadRef.current ? { opacity: 0 } : false}
									animate={{ opacity: 1 }}
									transition={{
										type: "spring",
										stiffness: 300,
										damping: 30,
										delay: initialLoadRef.current ? 0.1 : 0,
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
				)}
			</div>
		</nav>
	);
}
