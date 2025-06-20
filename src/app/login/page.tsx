"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { hasAnalyticsPermission } from "@/lib/permissions";

// Define the ExternalFeature type locally since the .d.ts file is not a module
type ExternalFeature = {
	id: string;
	name: string;
	description: string;
	allowedRoles: string[];
};

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Check if user is already logged in
	useEffect(() => {
		const checkUserAndRedirect = async () => {
			const userEmail = Cookies.get("userEmail");
			const accessType = Cookies.get("accessType");

			if (userEmail && accessType) {
				// If already logged in, redirect to appropriate page
				if (accessType === "external") {
					try {
						// Get user external role from cookie
						const externalType = Cookies.get("externalType") || "ext_client";

						// Fetch external features to check permissions
						const featuresResponse = await fetch("/api/external-features");
						if (featuresResponse.ok) {
							const features = await featuresResponse.json();

							// Check if user can only view their own quotations
							const viewOwnQuotationsFeature = (features.features as ExternalFeature[]).find(
								(f) => f.id === "view_own_quotations_only"
							);
							const canViewOnlyOwnQuotations =
								viewOwnQuotationsFeature?.allowedRoles.includes(externalType) || false;

							// Redirect based on permissions
							if (canViewOnlyOwnQuotations) {
								window.location.replace("/quotations/external/my");
							} else {
								window.location.replace("/quotations/external");
							}
						} else {
							// Default redirect if can't fetch features
							window.location.replace("/quotations/external");
						}
					} catch (error) {
						console.error("Error checking external permissions:", error);
						window.location.replace("/quotations/external");
					}
				} else {
					// Check if internal user has analytics permission
					try {
						const canViewAnalytics = await hasAnalyticsPermission();
						if (canViewAnalytics) {
							window.location.replace("/quotations/analytics");
						} else {
							window.location.replace("/quotations");
						}
					} catch (error) {
						console.error("Error checking permissions:", error);
						window.location.replace("/quotations");
					}
				}
			}
		};

		checkUserAndRedirect();
	}, []);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: email.toLowerCase(),
					password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.message || "Login failed");
				setIsLoading(false);
				return;
			}

			// Store user info in cookies
			Cookies.set("userEmail", email.toLowerCase(), { expires: 7 });
			Cookies.set("accessType", data.type, { expires: 7 });
			if (data.type === "internal") {
				Cookies.set("internalType", data.internalType, { expires: 7 });
				Cookies.set("department", data.department || "", { expires: 7 });
			} else if (data.type === "external") {
				Cookies.set("company", data.company.toLowerCase(), { expires: 7 });
				// Make sure externalType cookie always has ext_ prefix to match permission checks
				const externalType = data.externalType || "client";
				Cookies.set(
					"externalType",
					externalType.startsWith("ext_") ? externalType : `ext_${externalType}`,
					{ expires: 7 }
				);
			}

			toast.success("Login successful!");

			// Delay the redirect slightly to ensure cookies are set
			setTimeout(async () => {
				// Redirect based on user type
				if (data.type === "internal") {
					try {
						// We need to do this manually after login since the helper function reads from cookies that we just set
						const response = await fetch("/api/features");
						if (response.ok) {
							const features = await response.json();
							const analyticsFeature = (features as ExternalFeature[]).find(
								(f) => f.id === "view_quotation_analytics"
							);
							const canViewAnalytics =
								analyticsFeature?.allowedRoles.includes(data.internalType) || false;

							if (canViewAnalytics) {
								window.location.replace("/quotations/analytics");
							} else {
								window.location.replace("/quotations");
							}
						} else {
							window.location.replace("/quotations");
						}
					} catch (error) {
						console.error("Error checking permissions:", error);
						window.location.replace("/quotations");
					}
				} else {
					// For external users, check permissions before redirecting
					try {
						const externalType = data.externalType || "client";
						const formattedType = externalType.startsWith("ext_")
							? externalType
							: `ext_${externalType}`;

						// Fetch external features to check permissions
						const featuresResponse = await fetch("/api/external-features");
						if (featuresResponse.ok) {
							const features = await featuresResponse.json();

							// Check if user can only view their own quotations
							const viewOwnQuotationsFeature = (features.features as ExternalFeature[]).find(
								(f) => f.id === "view_own_quotations_only"
							);
							const canViewOnlyOwnQuotations =
								viewOwnQuotationsFeature?.allowedRoles.includes(formattedType) || false;

							// Check if user can only view company data
							// const viewCompanyDataFeature = (features.features as ExternalFeature[]).find(
							// 	(f) => f.id === "view_company_data_only"
							// );
							// const canViewOnlyCompanyData =
							// 	viewCompanyDataFeature?.allowedRoles.includes(formattedType) || false;

							// Redirect based on permissions
							if (canViewOnlyOwnQuotations) {
								window.location.replace("/quotations/external/my");
							} else {
								window.location.replace("/quotations/external");
							}
						} else {
							// Default redirect if can't fetch features
							window.location.replace("/quotations/external");
						}
					} catch (error) {
						console.error("Error checking external permissions:", error);
						window.location.replace("/quotations/external");
					}
				}
				setIsLoading(false);
			}, 500);
		} catch (error) {
			console.error("Login failed:", error);
			toast.error("Login failed. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<main className="fixed inset-0 flex items-center justify-center bg-background">
			<Card className="w-[90%] max-w-md mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
					<CardDescription className="text-center">
						Please enter your credentials to continue
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin} className="space-y-4">
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="w-full"
							/>
							<Input
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full"
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Signing in..." : "Sign in"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
