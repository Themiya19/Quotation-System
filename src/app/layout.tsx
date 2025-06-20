"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Header from "@/components/header";
import ExternalHeader from "@/components/navigation/external-header";
import { usePathname } from "next/navigation";
import { InternalRoleListener } from "@/components/InternalRoleListener";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import SessionTimeout from "@/components/SessionTimeout";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const pathname = usePathname();
	const isExternalRoute = pathname?.startsWith("/quotations/external");
	const isAnalyticsPage = pathname === "/quotations/analytics";
	const [isInternal, setIsInternal] = useState(false);

	// Check if user is internal on client side to avoid hydration issues
	useEffect(() => {
		const userType = Cookies.get("accessType");
		setIsInternal(userType === "internal");
	}, []);

	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn("min-h-screen bg-background", inter.className)}
				suppressHydrationWarning={true}
			>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<div className="relative flex min-h-screen flex-col">
							{isExternalRoute ? <ExternalHeader /> : <Header />}
							{isInternal && <InternalRoleListener />}
							<main className="flex-1">
								<div
									className={`container mx-auto ${
										isAnalyticsPage ? "px-0 py-0" : "px-4 py-6 md:px-6 lg:px-8"
									}`}
								>
									{children}
								</div>
							</main>
						</div>
					</ThemeProvider>
				</QueryClientProvider>
				<Toaster />
				<SessionTimeout />
			</body>
		</html>
	);
}
