import type { PostcardConfig, PostcardContent } from "@/types/config";
import { LAYOUT_PRESETS } from "./layout-presets";

export const DEFAULT_CONTENT: PostcardContent = {
  title: "Serenity",
  subtitle: "SPA & WELLNESS",
  services: [
    "Swedish massage",
    "Deep Tissue Therapy",
    "Hot Stone Massage",
    "Aromatherapy",
    "Facial Treatments",
    "Body Scrubs & Wraps",
  ],
  contact: {
    address: ["123 Wellness Boulevard", "Harmony Springs, CA 90210"],
    phone: "(555) 123-4567",
    hours: {
      weekdays: "Mon-Sat: 9AM - 8PM",
      weekend: "Sun: 10AM - 6PM",
    },
  },
};

export const DEFAULT_CONFIG: PostcardConfig = {
  layout: "classic",
  dimensions: {
    width: 600,
    height: 400,
  },
  style: LAYOUT_PRESETS["classic"],
};
