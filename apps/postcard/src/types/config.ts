export type LayoutId = "classic" | "organic" | "swiss" | "ethereal";

export interface PostcardStyle {
  fontHeading: string;
  fontBody: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  padding: number; // stored as rem or px unitless multiplier
  gap: number; // stored as rem or px unitless multiplier
  textureOpacity: number; // 0 to 1
}

export interface PostcardConfig {
  layout: LayoutId;
  dimensions: {
    width: number;
    height: number;
  };
  style: PostcardStyle;
}

export interface PostcardContent {
  title: string;
  subtitle: string;
  services: string[];
  contact: {
    address: string[]; // array allows for multi-line formatting
    phone: string;
    website?: string;
    hours: {
      weekdays: string;
      weekend: string;
    };
  };
}
