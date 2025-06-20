export interface ExternalFeature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

export interface ExternalFeaturesData {
  features: ExternalFeature[];
}

declare module '*/external_features.json' {
  const data: ExternalFeaturesData;
  export default data;
} 