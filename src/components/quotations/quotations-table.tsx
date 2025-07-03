"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileDown, FileText, Loader2 } from "lucide-react";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import { TableToolbar } from "./table-toolbar";
import { useState, useEffect, useCallback } from "react";
import { type Quotation, type QuotationStatus } from "@/types/quotation";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import uiConfig from '../../../data/ui-config.json';
import { format as formatDate, parseISO } from 'date-fns';

interface QuotationsTableProps {
	quotations: Quotation[];
	onApprove: (quotationId: string) => void;
	onReject: (quotationId: string) => void;
	onRequestRevise: (quotationId: string) => void;
	onRevise: (quotationId: string) => void;
	onEdit: (quotationId: string) => void;
	onDelete: (quotationId: string) => void;
	onClientApprove: (quotationId: string) => void;
	onClientReject: (quotationId: string) => void;
	isLoading: boolean;
	permissions: {
		canApproveQuotations: boolean;
		canRejectQuotations: boolean;
		canRequestRevision: boolean;
		canEditQuotations: boolean;
		canDeleteQuotations: boolean;
		canApproveClientActions: boolean;
	};
	hideDepartmentFilter?: boolean;
}

// Define MyCompany interface
interface MyCompany {
	id: string;
	name: string;
	address: string;
	phoneNumber: string;
	logoUrl: string;
	updatedAt: string;
	shortName?: string;
}

const ITEMS_PER_PAGE = 15;

const STATUS_COLORS: Record<QuotationStatus, string> = {
	pending: "text-yellow-800",
	approved: "text-green-800",
	rejected: "text-red-800",
	revised: "text-blue-800",
	"request-revise": "text-purple-800",
	cancelled: "text-gray-800",
};

const CLIENT_STATUS_COLORS: Record<string, string> = {
	sent: "text-blue-800",
	viewed: "text-purple-800",
	accepted: "text-green-800",
	approved: "text-green-800",
	rejected: "text-red-800",
	pending: "text-yellow-800",
};

export function QuotationsTable({
	quotations: allQuotations,
	onApprove,
	onReject,
	onRequestRevise,
	onRevise,
	onEdit,
	onDelete,
	onClientApprove,
	onClientReject,
	isLoading = false,
	permissions,
	hideDepartmentFilter = false,
}: QuotationsTableProps & { isLoading?: boolean }) {
	const [currentPage, setCurrentPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");
	const [companyFilter, setCompanyFilter] = useState<string>("all");
	const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
	const [departmentFilter, setDepartmentFilter] = useState<string>("all");
	const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
	const [showTooltip, setShowTooltip] = useState(false);
	const [myCompanies, setMyCompanies] = useState<MyCompany[]>([]);
	const router = useRouter();
	const { companies, loadCompanies } = useCompanyStore();

	// Load all company data on component mount
	useEffect(() => {
		// Load client companies
		loadCompanies();

		// Load my companies from company_details.json
		const loadMyCompanies = async () => {
			try {
				const response = await fetch("/api/company-details");
				if (response.ok) {
					const data = await response.json();
					setMyCompanies(Array.isArray(data) ? data : []);
				} else {
					console.error("Failed to load my companies");
				}
			} catch (error) {
				console.error("Error loading my companies:", error);
			}
		};

		loadMyCompanies();
	}, [loadCompanies]);

	const filteredQuotations = allQuotations
		.filter((quotation) => {
			const matchesSearch =
				searchQuery === "" ||
				Object.values(quotation).some(
					(value) =>
						typeof value === "string" && value.toLowerCase().includes(searchQuery.toLowerCase())
				);

			const matchesStatus = statusFilter === "all" || quotation.internalStatus === statusFilter;

			const matchesCompany =
				companyFilter === "all" || quotation.company.toLowerCase() === companyFilter.toLowerCase();

			const matchesYear = yearFilter === "all" || quotation.date.split("-")[0] === yearFilter;

			const matchesDepartment =
				departmentFilter === "all" || quotation.forDepartment === departmentFilter;

			return matchesSearch && matchesStatus && matchesCompany && matchesYear && matchesDepartment;
		})
		.reverse();

	const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const paginatedQuotations = filteredQuotations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	const getStatusColor = (status: QuotationStatus) => STATUS_COLORS[status];

	const getClientStatusColor = (status: string) => {
		return CLIENT_STATUS_COLORS[status.toLowerCase()] || "text-gray-800";
	};

	const resetFilters = () => {
		setSearchQuery("");
		setStatusFilter("all");
		setCompanyFilter("all");
		setYearFilter(new Date().getFullYear().toString());
		setDepartmentFilter("all");
		setCurrentPage(1);
	};

	// Function to handle row click
	const handleRowClick = (quotationId: string) => {
		router.push(`/quotations/preview/${quotationId}`);
	};

	// Handle mouse move to track cursor position
	const handleMouseMove = (e: React.MouseEvent) => {
		setCursorPosition({ x: e.clientX, y: e.clientY });
	};

	// Handle mouse enter/leave for tooltip visibility
	const handleMouseEnter = () => setShowTooltip(true);
	const handleMouseLeave = () => setShowTooltip(false);

	// Function to get company name from ID
	const getCompanyName = useCallback(
		(companyId: string, isMyCompany = false) => {
			if (!companyId) return "N/A";

			if (isMyCompany) {
				const myCompany = myCompanies.find((c) => c.id === companyId);
				return myCompany
					? myCompany.shortName
						? `${myCompany.shortName}`
						: myCompany.name
					: companyId;
			} else {
				const company = companies.find((c) => c.id === companyId);
				return company ? (company.shortName ? `${company.shortName}` : company.name) : companyId;
			}
		},
		[companies, myCompanies]
	);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (filteredQuotations.length === 0) {
		return (
			<div className="space-y-4">
				<TableToolbar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					companyFilter={companyFilter}
					onCompanyFilterChange={setCompanyFilter}
					yearFilter={yearFilter}
					onYearFilterChange={setYearFilter}
					departmentFilter={departmentFilter}
					onDepartmentFilterChange={setDepartmentFilter}
					onResetFilters={resetFilters}
					hideDepartmentFilter={hideDepartmentFilter}
				/>
				<div className="text-center p-8 text-muted-foreground border rounded-md">
					No quotations found for the selected filters.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<TableToolbar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				companyFilter={companyFilter}
				onCompanyFilterChange={setCompanyFilter}
				yearFilter={yearFilter}
				onYearFilterChange={setYearFilter}
				departmentFilter={departmentFilter}
				onDepartmentFilterChange={setDepartmentFilter}
				onResetFilters={resetFilters}
				hideDepartmentFilter={hideDepartmentFilter}
			/>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Quotation No</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Internal Company</TableHead>
							<TableHead>Client Company</TableHead>
							<TableHead>Project</TableHead>
							<TableHead>Title</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead>Documents</TableHead>
							<TableHead>Internal Status</TableHead>
							<TableHead>Quotation Type</TableHead>
							<TableHead>Client Status</TableHead>
							<TableHead>PO Details</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedQuotations.map((quotation) => (
							<TableRow
								key={quotation.id}
								className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
								onClick={(e) => {
									// Only navigate if the click is not on an interactive element
									if (!(e.target as HTMLElement).closest('button, a, [role="button"]')) {
										handleRowClick(quotation.id);
									}
								}}
								onMouseMove={handleMouseMove}
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
							>
								<TableCell className="font-medium">{quotation.quotationNo}</TableCell>
								<TableCell>{quotation.date ? formatDate(parseISO(quotation.date), uiConfig.dateFormat) : ""}</TableCell>
								<TableCell>{getCompanyName(quotation.myCompany || "", true)}</TableCell>
								<TableCell>{getCompanyName(quotation.company)}</TableCell>
								<TableCell>{quotation.project}</TableCell>
								<TableCell>{quotation.title}</TableCell>
								<TableCell className="text-right">
									{quotation.amount.toLocaleString("en-US", {
										style: "currency",
										currency: quotation.currency || "USD",
									})}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											window.open(quotation.pdfUrl);
										}}
									>
										<FileDown className="h-4 w-4 mr-2" />
										PDF
									</Button>
								</TableCell>
								<TableCell>
									<span
										className={getStatusColor(
											(quotation.internalStatus as QuotationStatus) ?? "pending"
										)}
									>
										{quotation.internalStatus}
									</span>
								</TableCell>
								<TableCell>
									{quotation.isRequested ||
									(quotation.actionHistory &&
										quotation.actionHistory.some(
											(action) =>
												action.toLowerCase().includes("requested by") ||
												action.toLowerCase().includes("quotation requested") ||
												action.toLowerCase().includes("created as") ||
												action.toLowerCase().includes("from request")
										))
										? "Requested Quotation"
										: "Direct Quotation"}
								</TableCell>
								<TableCell>
									<span className={getClientStatusColor(quotation.externalStatus || "")}>
										{quotation.externalStatus}
									</span>
								</TableCell>
								<TableCell>
									{quotation.poNo && (
										<div className="flex items-center space-x-2">
											<span>{quotation.poNo}</span>
											{quotation.poFileUrl && (
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														window.open(quotation.poFileUrl);
													}}
												>
													<FileText className="h-4 w-4" />
												</Button>
											)}
										</div>
									)}
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{quotation.internalStatus === "pending" &&
												permissions.canApproveQuotations && (
													<>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																onApprove(quotation.id);
															}}
															className="text-green-800"
														>
															Approve
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																onReject(quotation.id);
															}}
															className="text-red-800"
														>
															Reject
														</DropdownMenuItem>
													</>
												)}
											{quotation.internalStatus === "approved" &&
												permissions.canRequestRevision && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															onRequestRevise(quotation.id);
														}}
														className="text-purple-800"
													>
														Request Revise
													</DropdownMenuItem>
												)}
											{quotation.internalStatus === "request-revise" &&
												permissions.canApproveQuotations && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															onRevise(quotation.id);
														}}
														className="text-blue-800"
													>
														Revise
													</DropdownMenuItem>
												)}
											{quotation.internalStatus === "pending" && permissions.canEditQuotations && (
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														onEdit(quotation.id);
													}}
												>
													Edit
												</DropdownMenuItem>
											)}
											{permissions.canDeleteQuotations && (
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														onDelete(quotation.id);
													}}
													className="text-red-600 focus:text-red-600"
												>
													Delete
												</DropdownMenuItem>
											)}
											{quotation.internalStatus === "approved" &&
												(!quotation.externalStatus ||
													quotation.externalStatus.toLowerCase() === "pending") &&
												permissions.canApproveClientActions && (
													<>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																onClientApprove(quotation.id);
															}}
															className="text-emerald-600"
														>
															Client Approve
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={(e) => {
																e.stopPropagation();
																onClientReject(quotation.id);
															}}
															className="text-rose-600"
														>
															Client Reject
														</DropdownMenuItem>
													</>
												)}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{showTooltip && (
				<div
					className="fixed bg-white text-slate-700 text-xs rounded-md px-3 py-2 whitespace-nowrap pointer-events-none z-50 shadow-md border border-slate-200 font-medium animate-in fade-in duration-200"
					style={{
						left: `${cursorPosition.x + 10}px`,
						top: `${cursorPosition.y - 40}px`,
						transform: "translateZ(0)",
					}}
				>
					Click to view the Preview
					<div className="absolute h-2 w-2 bg-white border-b border-r border-slate-200 rotate-45 left-2 -bottom-1"></div>
				</div>
			)}

			{!isLoading && totalPages > 1 && (
				<div className="flex items-center justify-between px-2">
					<div className="text-sm text-muted-foreground">
						Showing {startIndex + 1} to{" "}
						{Math.min(startIndex + ITEMS_PER_PAGE, filteredQuotations.length)} of{" "}
						{filteredQuotations.length} entries
					</div>
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
								>
									Previous
								</Button>
							</PaginationItem>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
								<PaginationItem key={page}>
									<PaginationLink
										onClick={() => setCurrentPage(page)}
										isActive={currentPage === page}
									>
										{page}
									</PaginationLink>
								</PaginationItem>
							))}
							<PaginationItem>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
								>
									Next
								</Button>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}
