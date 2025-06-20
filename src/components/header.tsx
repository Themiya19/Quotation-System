import Link from "next/link";
import { MainNav } from "@/components/navigation/main-nav";
import { UserMenu } from "@/components/navigation/user-menu";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { ModeToggle } from "@/components/mode-toggle";
import type { Variants } from "framer-motion";

export default function Header() {
	const [isMounted, setIsMounted] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		const checkAuth = () => {
			const userEmail = Cookies.get("userEmail");
			const accessType = Cookies.get("accessType");
			setIsAuthenticated(!!userEmail && !!accessType);
		};

		setIsMounted(true);
		checkAuth();

		// Create a MutationObserver to watch for cookie changes
		const cookieObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === "childList" || mutation.type === "characterData") {
					checkAuth();
				}
			});
		});

		// Observe changes to document.cookie
		cookieObserver.observe(document, {
			subtree: true,
			childList: true,
			characterData: true,
		});

		// Clean up observer on unmount
		return () => {
			cookieObserver.disconnect();
		};
	}, []);

	const headerVariants: Variants = {
		hidden: { opacity: 0, y: -20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring",
				stiffness: 100,
				duration: 0.5,
				staggerChildren: 0.2,
			},
		},
	} as const;

	// Shared header content structure
	const headerContent = (
		<div className="container mx-auto px-4 py-4">
			<div className="flex items-center justify-between">
				<div className="flex-shrink-0">
					<Link href="/" className="text-xl font-bold">
						Quotation System
					</Link>
				</div>
				<div className="flex-grow flex justify-center px-4">
					{isMounted && isAuthenticated && <MainNav />}
				</div>
				<div className="flex-shrink-0 flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</div>
	);

	if (!isMounted) {
		return <header className="bg-transparent">{headerContent}</header>;
	}

	return (
		<motion.header
			className="bg-transparent"
			initial="hidden"
			animate="visible"
			variants={headerVariants}
		>
			{headerContent}
		</motion.header>
	);
}
