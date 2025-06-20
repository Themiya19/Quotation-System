"use client";

import { useRouter, usePathname } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import Cookies from "js-cookie";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

export function UserMenu() {
	const router = useRouter();
	const pathname = usePathname();
	const [isClient, setIsClient] = useState(false);
	const [userData, setUserData] = useState<{
		email: string | undefined;
		name: string | undefined;
		type: string | undefined;
		internalType?: string;
		externalType?: string;
		phoneNumber?: string;
	}>({
		email: undefined,
		name: undefined,
		type: undefined,
	});

	const fetchUserData = useCallback(async () => {
		const email = Cookies.get("userEmail");
		if (email) {
			try {
				const response = await fetch(`/api/auth/users/${encodeURIComponent(email)}`);
				const data = await response.json();
				setUserData({
					email,
					name: data.name || email.split("@")[0], // Fallback to email username if name not set
					type: data.type,
					internalType: data.internalType,
					externalType: data.externalType,
					phoneNumber: data.phoneNumber,
				});
			} catch (error) {
				console.error("Failed to fetch user data:", error);
			}
		} else {
			router.push("/login");
		}
	}, [router]);

	useEffect(() => {
		setIsClient(true);
		fetchUserData();
	}, [fetchUserData]);

	useEffect(() => {
		fetchUserData();
	}, [pathname, fetchUserData]);

	const handleLogout = () => {
		// Clear all user-related cookies
		Cookies.remove("userEmail");
		Cookies.remove("accessType");
		Cookies.remove("internalType");
		Cookies.remove("externalType");
		Cookies.remove("department");
		Cookies.remove("company");

		setUserData({
			email: undefined,
			name: undefined,
			type: undefined,
		});

		// Use window.location.href to ensure full page reload
		window.location.href = "/login";
	};

	const getUserRole = () => {
		if (userData.type === "internal" && userData.internalType) {
			return userData.internalType.charAt(0).toUpperCase() + userData.internalType.slice(1);
		}
		if (userData.externalType) {
			const role = userData.externalType.replace("ext_", "");
			return role.charAt(0).toUpperCase() + role.slice(1);
		}
		return "";
	};

	const getAvatarUrl = (name: string) => {
		return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&format=png`;
	};

	if (!isClient || !userData.email) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Image
					className="relative h-8 w-8 rounded-full cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all duration-200"
					src={getAvatarUrl(userData.name || "John+Doe")}
					alt={userData.name || ""}
					width={32}
					height={32}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem className="flex-col items-start">
					<div className="font-medium">{userData.name}</div>
					<div className="text-xs text-muted-foreground">{userData.email}</div>
					<div className="text-xs mt-2">{getUserRole()}</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleLogout} className="text-red-600">
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
