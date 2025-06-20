import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
	PlusCircle,
	Pencil,
	User,
	Building2,
	AtSign,
	Phone,
	Building,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Company } from "@/lib/companies";
import { useInternalPermissions } from "@/hooks/useInternalPermissions";

interface RegisteredUser {
	email: string;
	name: string;
	phoneNumber?: string;
	type: "internal" | "external";
	internalType?: string;
	externalType?: string;
	company?: string;
	department?: string;
}

interface ProfileRole {
	id: string;
	name: string;
	description: string;
	permissions: string[];
}

interface ExternalRole {
	id: string;
	name: string;
	description: string;
	permissions: string[];
}

interface UserManagementProps {
	companies: Company[];
	profileRoles: ProfileRole[];
	externalRoles: ExternalRole[];
	departments: Array<{ id: string; name: string; description: string }>;
}

export default function UserManagement({
	companies,
	profileRoles,
	externalRoles,
	departments,
}: UserManagementProps) {
	const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
	const [selectedUserType, setSelectedUserType] = useState<"internal" | "external">("internal");
	const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
	const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
	const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
	const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const [newUserData, setNewUserData] = useState({
		email: "",
		name: "",
		phoneNumber: "",
		password: "",
		type: "internal" as "internal" | "external",
		internalType: "sales" as string,
		externalType: "ext_client" as string,
		company: "",
		department: "",
	});

	const [editUserData, setEditUserData] = useState({
		email: "",
		name: "",
		phoneNumber: "",
		password: "",
		type: "internal" as "internal" | "external",
		internalType: "sales" as string,
		externalType: "ext_client" as string,
		company: "",
		department: "",
	});

	const { hasPermission } = useInternalPermissions();
	const canManageUsers = hasPermission("manage_users");

	useEffect(() => {
		fetch("/api/auth/users")
			.then((res) => res.json())
			.then((data) => setRegisteredUsers(data.users))
			.catch((error) => console.error("Failed to load users:", error));
	}, []);

	const handleAddUser = async () => {
		if (!canManageUsers) {
			toast.error("Only administrators can add users");
			return;
		}
		try {
			const response = await fetch("/api/auth/create-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUserData),
			});

			if (!response.ok) {
				throw new Error("Failed to create user");
			}

			const data = await response.json();
			setRegisteredUsers(data.users);
			setIsAddUserDialogOpen(false);
			setNewUserData({
				email: "",
				name: "",
				phoneNumber: "",
				password: "",
				type: "internal",
				internalType: "sales",
				externalType: "ext_client",
				company: "",
				department: "",
			});
			toast.success("User created successfully");
		} catch {
			toast.error("Failed to create user");
		}
	};

	const handleDeleteUser = async (email: string) => {
		if (!canManageUsers) {
			toast.error("Only administrators can delete users");
			return;
		}
		setUserToDelete(email);
		setIsDeleteUserDialogOpen(true);
	};

	const confirmDeleteUser = async () => {
		if (!userToDelete) return;

		try {
			const response = await fetch("/api/auth/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: userToDelete }),
			});

			if (!response.ok) {
				throw new Error("Failed to delete user");
			}

			// Update the local state by removing the deleted user
			setRegisteredUsers((prevUsers) => prevUsers.filter((user) => user.email !== userToDelete));

			toast.success("User deleted successfully");
			setIsDeleteUserDialogOpen(false);
			setUserToDelete(null);
		} catch {
			toast.error("Failed to delete user");
		}
	};

	const handleEditUser = async (user: RegisteredUser) => {
		setEditingUser(user);
		setEditUserData({
			email: user.email,
			name: user.name || "",
			phoneNumber: user.phoneNumber || "",
			password: "", // Password will be empty initially
			type: user.type,
			internalType: user.internalType || "sales",
			externalType: user.externalType || "ext_client",
			company: user.company || "",
			department: user.department || "",
		});
		setIsEditUserDialogOpen(true);
	};

	const handleSaveUserEdit = async () => {
		if (!editingUser) return;

		try {
			const response = await fetch("/api/auth/update-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					originalEmail: editingUser.email,
					...editUserData,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to update user");
			}

			const data = await response.json();
			setRegisteredUsers(data.users);
			setIsEditUserDialogOpen(false);
			setEditingUser(null);
			toast.success("User updated successfully");
		} catch {
			toast.error("Failed to update user");
		}
	};

	// Filter users based on selected type and company
	const filteredUsers = registeredUsers.filter((user) => {
		// First filter by user type
		if (user.type !== selectedUserType) return false;

		// For external users, filter by company if a specific company is selected
		if (user.type === "external" && selectedCompanyFilter !== "all") {
			return user.company === selectedCompanyFilter;
		}

		return true;
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>User Management</CardTitle>
						<CardDescription>Manage system users</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button
							variant={selectedUserType === "internal" ? "default" : "outline"}
							onClick={() => setSelectedUserType("internal")}
							className="flex items-center gap-2"
						>
							<User className="h-4 w-4" />
							Internal Users
						</Button>
						<Button
							variant={selectedUserType === "external" ? "default" : "outline"}
							onClick={() => setSelectedUserType("external")}
							className="flex items-center gap-2"
						>
							<Building2 className="h-4 w-4" />
							External Users
						</Button>
						{canManageUsers && (
							<Button onClick={() => setIsAddUserDialogOpen(true)}>
								<PlusCircle className="h-4 w-4 mr-2" />
								Add User
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{selectedUserType === "external" && (
					<div className="mb-4">
						<h3 className="text-sm font-medium mb-2">Filter by Company</h3>
						<div className="flex flex-wrap gap-2">
							<Button
								key="all"
								variant={selectedCompanyFilter === "all" ? "default" : "outline"}
								onClick={() => setSelectedCompanyFilter("all")}
								size="sm"
							>
								All Companies
							</Button>
							{companies.map((company) => (
								<Button
									key={company.id}
									variant={selectedCompanyFilter === company.name ? "default" : "outline"}
									onClick={() => setSelectedCompanyFilter(company.name)}
									size="sm"
								>
									{company.name}
								</Button>
							))}
						</div>
					</div>
				)}
				<div className="space-y-4">
					{filteredUsers.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							No {selectedUserType} users found.
						</p>
					) : (
						<div className="grid gap-4">
							{filteredUsers.map((user) => (
								<div
									key={user.email}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<User className="h-4 w-4" />
											<p className="font-medium text-lg">
												{user.name}
												{user.internalType && (
													<span className="text-sm text-muted-foreground ml-2">
														(
														{user.internalType.charAt(0).toUpperCase() + user.internalType.slice(1)}
														)
													</span>
												)}
												{user.externalType && (
													<span className="text-sm text-muted-foreground ml-2">
														(
														{user.externalType.charAt(0).toUpperCase() + user.externalType.slice(1)}
														)
													</span>
												)}
											</p>
										</div>
										<div className="space-y-1 text-sm text-muted-foreground">
											{user.email && (
												<div className="flex items-center gap-2">
													<AtSign className="h-4 w-4" />
													<p>{user.email}</p>
												</div>
											)}
											{user.phoneNumber && (
												<div className="flex items-center gap-2">
													<Phone className="h-4 w-4" />
													<p>{user.phoneNumber}</p>
												</div>
											)}
											{user.type === "internal" && user.department && (
												<div className="flex items-center gap-2">
													<Building className="h-4 w-4" />
													<p>
														From{" "}
														{user.department.charAt(0).toUpperCase() + user.department.slice(1)}
													</p>
												</div>
											)}
											{user.type === "external" && user.company && (
												<div className="flex items-center gap-2">
													<Building2 className="h-4 w-4" />
													<p>Works at {user.company}</p>
												</div>
											)}
										</div>
									</div>
									{canManageUsers && (
										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
												<Pencil className="h-4 w-4 mr-2" />
												Edit
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDeleteUser(user.email)}
												className="text-red-600 hover:text-red-700"
											>
												Delete
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>

			{/* Add User Dialog */}
			<Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add New User</DialogTitle>
						<DialogDescription>Create a new user account</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">User Type</label>
							<div className="grid grid-cols-2 gap-4">
								<div
									className={cn(
										"cursor-pointer rounded-lg border-2 p-4 text-center transition-colors hover:bg-accent",
										newUserData.type === "internal" ? "border-primary bg-accent" : "border-muted"
									)}
									onClick={() => setNewUserData({ ...newUserData, type: "internal" })}
								>
									<User className="mx-auto h-8 w-8 mb-2" />
									<div className="font-medium">Internal User</div>
									<div className="text-xs text-muted-foreground">Staff member</div>
								</div>
								<div
									className={cn(
										"cursor-pointer rounded-lg border-2 p-4 text-center transition-colors hover:bg-accent",
										newUserData.type === "external" ? "border-primary bg-accent" : "border-muted"
									)}
									onClick={() => setNewUserData({ ...newUserData, type: "external" })}
								>
									<Building2 className="mx-auto h-8 w-8 mb-2" />
									<div className="font-medium">External User</div>
									<div className="text-xs text-muted-foreground">Company client</div>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<Input
								type="text"
								placeholder="Full Name"
								value={newUserData.name}
								onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
							/>
							<Input
								type="email"
								placeholder="Email"
								value={newUserData.email}
								onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
							/>
							<Input
								type="tel"
								placeholder="Phone Number (Optional)"
								value={newUserData.phoneNumber}
								onChange={(e) => setNewUserData({ ...newUserData, phoneNumber: e.target.value })}
							/>
							<Input
								type="password"
								placeholder="Password"
								value={newUserData.password}
								onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
							/>

							{newUserData.type === "internal" && (
								<>
									<div className="flex gap-4">
										<div className="flex-1 space-y-2">
											<label className="text-sm font-medium">Role</label>
											<Select
												value={newUserData.internalType}
												onValueChange={(value) =>
													setNewUserData({ ...newUserData, internalType: value })
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
												<SelectContent>
													{profileRoles
														.filter((role) => !role.id.startsWith("ext_"))
														.map((role) => (
															<SelectItem key={role.id} value={role.id}>
																{role.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="flex-1 space-y-2">
											<label className="text-sm font-medium">Department</label>
											<Select
												value={newUserData.department}
												onValueChange={(value) =>
													setNewUserData({ ...newUserData, department: value })
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select department" />
												</SelectTrigger>
												<SelectContent>
													{departments.map((department) => (
														<SelectItem key={department.id} value={department.id}>
															{department.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</>
							)}

							{newUserData.type === "external" && (
								<div className="flex gap-4">
									<div className="flex-1 space-y-2">
										<label className="text-sm font-medium">Role</label>
										<Select
											value={newUserData.externalType}
											onValueChange={(value) =>
												setNewUserData({ ...newUserData, externalType: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select role" />
											</SelectTrigger>
											<SelectContent>
												{externalRoles.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="flex-1 space-y-2">
										<label className="text-sm font-medium">Company</label>
										<Select
											value={newUserData.company}
											onValueChange={(value) => setNewUserData({ ...newUserData, company: value })}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select company" />
											</SelectTrigger>
											<SelectContent>
												{companies.map((company) => (
													<SelectItem key={company.id} value={company.name}>
														{company.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							)}
						</div>
					</div>
					<DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
						<Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAddUser}>Create User</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit User</DialogTitle>
						<DialogDescription>Modify user account details</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">User Type</label>
							<div className="grid grid-cols-2 gap-4">
								<div
									className={cn(
										"cursor-pointer rounded-lg border-2 p-4 text-center transition-colors hover:bg-accent",
										editUserData.type === "internal" ? "border-primary bg-accent" : "border-muted"
									)}
									onClick={() => setEditUserData({ ...editUserData, type: "internal" })}
								>
									<User className="mx-auto h-8 w-8 mb-2" />
									<div className="font-medium">Internal User</div>
									<div className="text-xs text-muted-foreground">Staff member</div>
								</div>
								<div
									className={cn(
										"cursor-pointer rounded-lg border-2 p-4 text-center transition-colors hover:bg-accent",
										editUserData.type === "external" ? "border-primary bg-accent" : "border-muted"
									)}
									onClick={() => setEditUserData({ ...editUserData, type: "external" })}
								>
									<Building2 className="mx-auto h-8 w-8 mb-2" />
									<div className="font-medium">External User</div>
									<div className="text-xs text-muted-foreground">Company client</div>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<Input
								type="text"
								placeholder="Full Name"
								value={editUserData.name}
								onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
							/>
							<Input
								type="email"
								placeholder="Email"
								value={editUserData.email}
								onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
							/>
							<Input
								type="tel"
								placeholder="Phone Number (Optional)"
								value={editUserData.phoneNumber}
								onChange={(e) => setEditUserData({ ...editUserData, phoneNumber: e.target.value })}
							/>
							<div className="space-y-2">
								<label className="text-sm font-medium">Password</label>
								<div className="space-y-2">
									<p className="text-sm text-muted-foreground mb-2">
										For security reasons, existing passwords cannot be viewed. You can set a new
										password below.
									</p>
									<Input
										type={showPassword ? "text" : "password"}
										placeholder="Enter new password"
										value={editUserData.password}
										onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
									/>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setShowPassword(!showPassword)}
										>
											{showPassword ? "Hide" : "Show"} Password
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										Leave empty to keep the current password unchanged
									</p>
								</div>
							</div>

							{editUserData.type === "internal" && (
								<>
									<div className="flex gap-4">
										<div className="flex-1 space-y-2">
											<label className="text-sm font-medium">Role</label>
											<Select
												value={editUserData.internalType}
												onValueChange={(value) =>
													setEditUserData({ ...editUserData, internalType: value })
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
												<SelectContent>
													{profileRoles
														.filter((role) => !role.id.startsWith("ext_"))
														.map((role) => (
															<SelectItem key={role.id} value={role.id}>
																{role.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="flex-1 space-y-2">
											<label className="text-sm font-medium">Department</label>
											<Select
												value={editUserData.department}
												onValueChange={(value) =>
													setEditUserData({ ...editUserData, department: value })
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select department" />
												</SelectTrigger>
												<SelectContent>
													{departments.map((department) => (
														<SelectItem key={department.id} value={department.id}>
															{department.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</>
							)}

							{editUserData.type === "external" && (
								<div className="flex gap-4">
									<div className="flex-1 space-y-2">
										<label className="text-sm font-medium">Role</label>
										<Select
											value={editUserData.externalType}
											onValueChange={(value) =>
												setEditUserData({ ...editUserData, externalType: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select role" />
											</SelectTrigger>
											<SelectContent>
												{externalRoles.map((role) => (
													<SelectItem key={role.id} value={role.id}>
														{role.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="flex-1 space-y-2">
										<label className="text-sm font-medium">Company</label>
										<Select
											value={editUserData.company}
											onValueChange={(value) =>
												setEditUserData({ ...editUserData, company: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select company" />
											</SelectTrigger>
											<SelectContent>
												{companies.map((company) => (
													<SelectItem key={company.id} value={company.name}>
														{company.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							)}
						</div>
					</div>
					<DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
						<Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveUserEdit}>Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete User Dialog */}
			<Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Delete User</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this user? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
						<Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDeleteUser}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
