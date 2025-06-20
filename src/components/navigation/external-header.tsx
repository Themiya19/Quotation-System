"use client";

import { UserMenu } from "@/components/navigation/user-menu";
import { ExternalNav } from "@/components/ExternalNav";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { motion, Variants } from "framer-motion";


export default function ExternalHeader() {
	// Add client-side only state to control when animations should start
	const [isMounted, setIsMounted] = useState(false);

	// Only run animations after client-side hydration is complete
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const headerVariants: Variants = {
		hidden: { opacity: 0, y: -20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring", // string literal, not generic string
				stiffness: 100,
				duration: 0.5,
				staggerChildren: 0.2,
			},
		},
	};

	// Shared header content structure
	const headerContent = (
		<div className="container mx-auto px-4 py-4">
			<div className="flex items-center justify-between">
				<div className="flex-shrink-0">
					<Link href="/quotations/external" className="text-xl font-bold">
						External Portal
					</Link>
				</div>
				<div className="flex-grow flex justify-center px-4">
					<ExternalNav />
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
