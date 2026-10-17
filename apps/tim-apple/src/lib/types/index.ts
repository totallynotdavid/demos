export interface Artwork {
  url: string;
  width: number;
  height: number;
  bgColor?: string;
}

export interface NavigationTab {
  id: string;
  label: string;
  url: string;
  icon: string;
}

export interface ProductBadgeItem {
  type: "rating" | "award" | "age";
  heading: string;
  rating?: number;
  text?: string;
}

export interface ProductMediaItem {
  screenshot: Artwork;
}

export interface ProductDescriptionItem {
  text: string;
}

export interface ProductRatingItem {
  average: number;
  count: number;
  distribution: number[];
}

export interface ArticleTextItem {
  text: string;
}

export interface ArticleImageItem {
  artwork: Artwork;
}

export interface LockupItem {
  url: string;
  icon: Artwork;
  title: string;
  subtitle?: string;
}

export interface TodayCard {
  title: string;
  heading?: string;
  style: "dark" | "light";
  media: Artwork;
  url: string;
  isAppIcon?: boolean;
  lockup?: LockupItem;
}

export interface Shelf {
  title?: string;
  contentType?: string;
  seeAllUrl?: string;
  items: unknown[];
}
