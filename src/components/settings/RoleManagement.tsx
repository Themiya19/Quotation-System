import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { checkFeaturePermission } from "@/lib/permissions";

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

interface FeaturePermission {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

export default function RoleManagement() {
  const [profileRoles, setProfileRoles] = useState<ProfileRole[]>([]);
  const [externalRoles, setExternalRoles] = useState<ExternalRole[]>([]);
  const [features, setFeatures] = useState<FeaturePermission[]>([]);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ProfileRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [newRoleData, setNewRoleData] = useState<ProfileRole>({
    id: '',
    name: '',
    description: '',
    permissions: []
  });
  const [isAddExternalRoleDialogOpen, setIsAddExternalRoleDialogOpen] = useState(false);
  const [newExternalRoleData, setNewExternalRoleData] = useState<ExternalRole>({
    id: '',
    name: '',
    description: '',
    permissions: []
  });
  const [isDeleteExternalRoleDialogOpen, setIsDeleteExternalRoleDialogOpen] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canViewRoles, setCanViewRoles] = useState(false);

  useEffect(() => {
    // Check permissions
    const checkPermissions = async () => {
      try {
        // Check for manage_roles permission
        const hasManagePermission = await checkFeaturePermission('manage_roles');
        setCanManageRoles(hasManagePermission);
        
        // Check for manage_features permission - if user has either permission, they should be able to view roles
        const hasFeaturesPermission = await checkFeaturePermission('manage_features');
        setCanViewRoles(hasManagePermission || hasFeaturesPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanManageRoles(false);
        setCanViewRoles(false);
      }
    };
    
    checkPermissions();
    
    // Load roles data (only if user can view roles)
    const loadRoles = async () => {
      try {
        // Load external roles
        const externalRolesResponse = await fetch('/api/external-roles');
        if (externalRolesResponse.ok) {
          const data = await externalRolesResponse.json();
          setExternalRoles(data.roles);
        } else {
          console.error('Failed to load external roles');
          setExternalRoles([]);
        }

        // Load internal roles
        const internalRolesResponse = await fetch('/api/roles');
        if (internalRolesResponse.ok) {
          const data = await internalRolesResponse.json();
          const roles = Array.isArray(data) ? data : data.roles || [];
          setProfileRoles(roles);
        } else {
          console.error('Failed to load internal roles');
          setProfileRoles([]);
        }

        // Load features
        const featuresResponse = await fetch('/api/features');
        if (featuresResponse.ok) {
          const data = await featuresResponse.json();
          setFeatures(data);
        } else {
          console.error('Failed to load features');
          setFeatures([]);
        }
      } catch (error) {
        console.error('Error loading role data:', error);
        toast.error('Failed to load role data');
      }
    };
    
    loadRoles();
  }, []);

  const handleAddRole = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoleData)
      });

      if (!response.ok) {
        throw new Error('Failed to create role');
      }

      const data = await response.json();
      setProfileRoles(data.roles);
      setIsAddRoleDialogOpen(false);
      setNewRoleData({
        id: '',
        name: '',
        description: '',
        permissions: []
      });
      toast.success('Role created successfully');
    } catch {
      toast.error('Failed to create role');
    }
  };

  const handleEditRole = async () => {
    if (!editingRole) return;

    try {
      const response = await fetch('/api/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRole)
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      const data = await response.json();
      setProfileRoles(data.roles);
      setIsEditRoleDialogOpen(false);
      setEditingRole(null);
      toast.success('Role updated successfully');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const response = await fetch('/api/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleToDelete })
      });

      if (!response.ok) {
        throw new Error('Failed to delete role');
      }

      const data = await response.json();
      setProfileRoles(data.roles);
      setIsDeleteRoleDialogOpen(false);
      setRoleToDelete(null);
      toast.success('Role deleted successfully');
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const handleAddExternalRole = async () => {
    try {
      const response = await fetch('/api/external-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExternalRoleData)
      });

      if (!response.ok) {
        throw new Error('Failed to create external role');
      }

      const data = await response.json();
      setExternalRoles(data.roles);
      setIsAddExternalRoleDialogOpen(false);
      setNewExternalRoleData({
        id: '',
        name: '',
        description: '',
        permissions: []
      });
      toast.success('External role created successfully');
    } catch {
      toast.error('Failed to create external role');
    }
  };

  const handleDeleteExternalRole = async () => {
    if (!roleToDelete) return;

    try {
      const response = await fetch('/api/external-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleToDelete })
      });

      if (!response.ok) {
        throw new Error('Failed to delete external role');
      }

      const data = await response.json();
      setExternalRoles(data.roles);
      setIsDeleteExternalRoleDialogOpen(false);
      setRoleToDelete(null);
      toast.success('External role deleted successfully');
    } catch {
      toast.error('Failed to delete external role');
    }
  };

  // If user can't view roles, show a message
  if (!canViewRoles) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Info className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold">No Permission</h2>
          <p className="text-muted-foreground">You don&apos;t have permission to view roles.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Internal Roles Management</CardTitle>
              <CardDescription>
                {canManageRoles 
                  ? "Manage internal user roles" 
                  : "View internal user roles"
                }
              </CardDescription>
            </div>
            {canManageRoles && (
              <Button onClick={() => setIsAddRoleDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Internal Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Role Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                  {canManageRoles && (
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {profileRoles.filter(role => !role.id.startsWith('ext_')).map((role) => (
                  <tr key={role.id} className="border-b">
                    <td className="p-4 align-middle font-medium">{role.name}</td>
                    <td className="p-4 align-middle text-muted-foreground">{role.description}</td>
                    {canManageRoles && role.id !== 'admin' && (
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoleToDelete(role.id);
                            setIsDeleteRoleDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                    {canManageRoles && role.id === 'admin' && (
                      <td className="p-4 align-middle"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>External Roles</CardTitle>
              <CardDescription>
                {canManageRoles 
                  ? "Manage external user roles" 
                  : "View external user roles"
                }
              </CardDescription>
            </div>
            {canManageRoles && (
              <Button onClick={() => setIsAddExternalRoleDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add External Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Role Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                  {canManageRoles && (
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {externalRoles.map((role) => (
                  <tr key={role.id} className="border-b">
                    <td className="p-4 align-middle font-medium">{role.name}</td>
                    <td className="p-4 align-middle text-muted-foreground">{role.description}</td>
                    {canManageRoles && role.id !== 'ext_client' && (
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoleToDelete(role.id);
                            setIsDeleteExternalRoleDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                    {canManageRoles && role.id === 'ext_client' && (
                      <td className="p-4 align-middle"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Create a new profile role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Name</label>
              <Input
                placeholder="Enter role name"
                value={newRoleData.name}
                onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Enter role description"
                value={newRoleData.description}
                onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button variant="outline" onClick={() => setIsAddRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Modify role details and permissions
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  placeholder="Enter role name"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Enter role description"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <div className="grid gap-2">
                  {features.map((feature) => (
                    <div key={feature.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={feature.id}
                        checked={editingRole.permissions.includes(feature.id)}
                        onChange={(e) => {
                          const newPermissions = e.target.checked
                            ? [...editingRole.permissions, feature.id]
                            : editingRole.permissions.filter(id => id !== feature.id);
                          setEditingRole({ ...editingRole, permissions: newPermissions });
                        }}
                      />
                      <label htmlFor={feature.id} className="text-sm">
                        {feature.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Role Dialog */}
      <Dialog open={isAddExternalRoleDialogOpen} onOpenChange={setIsAddExternalRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New External Role</DialogTitle>
            <DialogDescription>
              Create a new external role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Name</label>
              <Input
                placeholder="Enter role name"
                value={newExternalRoleData.name}
                onChange={(e) => setNewExternalRoleData({ ...newExternalRoleData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Enter role description"
                value={newExternalRoleData.description}
                onChange={(e) => setNewExternalRoleData({ ...newExternalRoleData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button variant="outline" onClick={() => setIsAddExternalRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExternalRole}>
              Create External Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete External Role Dialog */}
      <Dialog open={isDeleteExternalRoleDialogOpen} onOpenChange={setIsDeleteExternalRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete External Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this external role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sticky bottom-0 pt-2 bg-background border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteExternalRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExternalRole}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 