import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkFeaturePermission } from "@/lib/permissions";

interface FeaturePermission {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
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

export default function FeatureManagement() {
  const [features, setFeatures] = useState<FeaturePermission[]>([]);
  const [externalFeatures, setExternalFeatures] = useState<FeaturePermission[]>([]);
  const [editedFeatures, setEditedFeatures] = useState<FeaturePermission[]>([]);
  const [editedExternalFeatures, setEditedExternalFeatures] = useState<FeaturePermission[]>([]);
  const [isEditingFeatures, setIsEditingFeatures] = useState(false);
  const [isEditingExternalFeatures, setIsEditingExternalFeatures] = useState(false);
  const [profileRoles, setProfileRoles] = useState<ProfileRole[]>([]);
  const [externalRoles, setExternalRoles] = useState<ExternalRole[]>([]);
  const [canManageFeatures, setCanManageFeatures] = useState(false);

  useEffect(() => {
    // Check permission to manage features
    const checkPermission = async () => {
      try {
        const hasPermission = await checkFeaturePermission('manage_features');
        setCanManageFeatures(hasPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanManageFeatures(false);
      }
    };
    
    checkPermission();
    
    // Load features and roles
    fetch('/api/external-roles')
      .then(res => res.json())
      .then(data => {
        setExternalRoles(data.roles);
      })
      .catch(error => {
        console.error('Failed to load external roles:', error);
        setExternalRoles([]);
      });
    
    fetch('/api/external-features')
      .then(res => res.json())
      .then(data => {
        setExternalFeatures(data.features);
        setEditedExternalFeatures(data.features);
      })
      .catch(error => console.error('Failed to load external features:', error));

    fetch('/api/features')
      .then(res => res.json())
      .then(data => {
        setFeatures(data);
        setEditedFeatures(data);
      })
      .catch(error => console.error('Failed to load features:', error));

    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        const roles = Array.isArray(data) ? data : data.roles || [];
        setProfileRoles(roles);
      })
      .catch(error => {
        console.error('Failed to load roles:', error);
        setProfileRoles([]);
      });
  }, []);

  const handleFeatureToggle = (
    featureId: string,
    role: string
  ) => {
    if (!canManageFeatures) {
      toast.error("You don't have permission to modify features");
      return;
    }
    setEditedFeatures(prevFeatures => 
      prevFeatures.map(feature => {
        if (feature.id === featureId) {
          const newAllowedRoles = feature.allowedRoles.includes(role)
            ? feature.allowedRoles.filter(r => r !== role)
            : [...feature.allowedRoles, role];
          return { ...feature, allowedRoles: newAllowedRoles };
        }
        return feature;
      })
    );
  };

  const handleSaveFeatures = async () => {
    if (!canManageFeatures) {
      toast.error("You don't have permission to save features");
      return;
    }
    try {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedFeatures)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save features');
      }

      // Update the features state with the new values from the server
      setFeatures(data.features);
      setEditedFeatures(data.features);
      setIsEditingFeatures(false);
      toast.success('Features updated successfully');
      
      // Force a page reload to ensure all components pick up the new permissions
      window.location.reload();
    } catch (error) {
      console.error('Error saving features:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update features');
    }
  };

  const handleExternalFeatureToggle = (featureId: string, role: string) => {
    if (!canManageFeatures) {
      toast.error("You don't have permission to modify features");
      return;
    }
    setEditedExternalFeatures(prevFeatures => 
      prevFeatures.map(feature => {
        if (feature.id === featureId) {
          const newAllowedRoles = feature.allowedRoles.includes(role)
            ? feature.allowedRoles.filter(r => r !== role)
            : [...feature.allowedRoles, role];
          return { ...feature, allowedRoles: newAllowedRoles };
        }
        return feature;
      })
    );
  };

  const handleSaveExternalFeatures = async () => {
    if (!canManageFeatures) {
      toast.error("You don't have permission to save features");
      return;
    }
    try {
      const response = await fetch('/api/external-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedExternalFeatures)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save features');
      }

      setExternalFeatures(data.features);
      setEditedExternalFeatures(data.features);
      setIsEditingExternalFeatures(false);
      toast.success('External features updated successfully');
      
    } catch (error) {
      console.error('Error saving external features:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update external features');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Internal Features Management</CardTitle>
              <CardDescription>
                Manage feature permissions for internal users
              </CardDescription>
            </div>
            {canManageFeatures && (
              <div className="flex gap-2">
                {isEditingFeatures ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditedFeatures(features);
                        setIsEditingFeatures(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveFeatures}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingFeatures(true)}
                  >
                    Edit Features
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Feature</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                  {profileRoles.filter(role => !role.id.startsWith('ext_')).map((role) => (
                    <th key={role.id} className="h-12 px-4 text-center align-middle font-medium">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(isEditingFeatures ? editedFeatures : features).map((feature) => (
                  <tr key={feature.id} className="border-b">
                    <td className="p-4 align-middle font-medium">{feature.name}</td>
                    <td className="p-4 align-middle text-muted-foreground">{feature.description}</td>
                    {profileRoles.filter(role => !role.id.startsWith('ext_')).map((role) => (
                      <td key={role.id} className="p-4 align-middle text-center">
                        {isEditingFeatures && canManageFeatures ? (
                          <Button
                            variant={feature.allowedRoles.includes(role.id) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleFeatureToggle(feature.id, role.id)}
                            className="w-20"
                          >
                            {feature.allowedRoles.includes(role.id) ? 'Enabled' : 'Disabled'}
                          </Button>
                        ) : (
                          <div className={cn(
                            "mx-auto w-6 h-6 rounded-full flex items-center justify-center",
                            feature.allowedRoles.includes(role.id) 
                              ? "bg-primary/20 text-primary"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}>
                            {feature.allowedRoles.includes(role.id) ? (
                              <Plus className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </div>
                        )}
                      </td>
                    ))}
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
              <CardTitle>External Features Management</CardTitle>
              <CardDescription>
                Manage feature permissions for external users
              </CardDescription>
            </div>
            {canManageFeatures && (
              <div className="flex gap-2">
                {isEditingExternalFeatures ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditedExternalFeatures(externalFeatures);
                        setIsEditingExternalFeatures(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveExternalFeatures}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingExternalFeatures(true)}
                  >
                    Edit Features
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Feature</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                  {externalRoles.map((role) => (
                    <th key={role.id} className="h-12 px-4 text-center align-middle font-medium">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(isEditingExternalFeatures ? editedExternalFeatures : externalFeatures).map((feature) => (
                  <tr key={feature.id} className="border-b">
                    <td className="p-4 align-middle font-medium">{feature.name}</td>
                    <td className="p-4 align-middle text-muted-foreground">{feature.description}</td>
                    {externalRoles.map((role) => (
                      <td key={role.id} className="p-4 align-middle text-center">
                        {isEditingExternalFeatures && canManageFeatures ? (
                          <Button
                            variant={feature.allowedRoles.includes(role.id) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleExternalFeatureToggle(feature.id, role.id)}
                            className="w-20"
                          >
                            {feature.allowedRoles.includes(role.id) ? 'Enabled' : 'Disabled'}
                          </Button>
                        ) : (
                          <div className={cn(
                            "mx-auto w-6 h-6 rounded-full flex items-center justify-center",
                            feature.allowedRoles.includes(role.id) 
                              ? "bg-primary/20 text-primary"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}>
                            {feature.allowedRoles.includes(role.id) ? (
                              <Plus className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 