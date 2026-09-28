import type {
	ArticleImageItem,
	ArticleTextItem,
	LockupItem,
	ProductBadgeItem,
	ProductDescriptionItem,
	ProductMediaItem,
	ProductRatingItem,
	Shelf,
	TodayCard,
} from "$lib/types";

const artwork = (w: number, h: number, color = "4A90E2", text = "") => ({
	url: `https://placehold.co/${w}x${h}/${color}/FFFFFF?text=${encodeURIComponent(text)}`,
	width: w,
	height: h,
	bgColor: `#${color}`,
});

// Basketball player image
const nbaImage = artwork(800, 1200, "E94B3C", "NBA+2K26");
// Golf course image
const golfImage = artwork(1600, 900, "2D5016", "PGA+TOUR");
// Subway Surfers
const subwayImage = artwork(800, 1200, "FF6B35", "Subway+Surfers");
// Apple Pencil article
const pencilImage = artwork(800, 1200, "F0F0F0", "Apple+Pencil");
// Notion icon
const notionIcon = artwork(200, 200, "FFFFFF", "N");

export const mockData = {
	navigation: {
		tabs: [
			{ id: "today", label: "Today", url: "/", icon: "📱" },
			{ id: "games", label: "Games", url: "/games", icon: "🎮" },
			{ id: "apps", label: "Apps", url: "/apps", icon: "📦" },
			{ id: "search", label: "Search", url: "/search", icon: "🔍" },
		],
	},

	todayPage: {
		title: "Today",
		shelves: [
			{
				id: "featured",
				contentType: "todayCard",
				items: [
					{
						title: "Play your favourite NBA era",
						heading: "APPLE ARCADE",
						style: "dark",
						media: nbaImage,
						url: "/article/1",
						lockup: {
							title: "NBA 2K26 Arcade Edition",
							subtitle: "Make History in Every Era",
							icon: artwork(100, 100, "1C1C1E", "2K26"),
							url: "/product/1",
						} as LockupItem,
					} as TodayCard,
					{
						title: "Become a PGA TOUR legend",
						heading: "APPLE ARCADE",
						style: "dark",
						media: golfImage,
						url: "/product/2",
						lockup: {
							title: "PGA TOUR Pro Golf",
							subtitle: "Play world-famous golf courses",
							icon: artwork(100, 100, "2D5016", "PGA"),
							url: "/product/2",
						} as LockupItem,
					} as TodayCard,
				],
			},
			{
				id: "more-featured",
				title: "The Biggest Apps and Games",
				contentType: "todayCard",
				items: [
					{
						title: "Subway Surfers",
						heading: "FEATURED GAME",
						style: "dark",
						media: subwayImage,
						url: "/product/3",
					} as TodayCard,
					{
						title: "Best Apple Pencil Apps",
						heading: "GET CREATIVE",
						style: "light",
						media: pencilImage,
						url: "/article/2",
					} as TodayCard,
					{
						title: "Notion",
						heading: "APP OF THE DAY",
						style: "light",
						media: notionIcon,
						url: "/product/4",
						isAppIcon: true,
					} as TodayCard,
				],
			},
			{
				id: "must-haves",
				title: "Social media must-haves",
				seeAllUrl: "/collection/social",
				heading: "ESSENTIALS",
				contentType: "lockup",
				items: [
					{
						title: "BeReal: Photos & Friends Daily",
						subtitle: "Share real moments, no filters",
						icon: artwork(100, 100, "000000", "BeReal"),
						url: "/product/5",
					} as LockupItem,
					{
						title: "Microsoft Teams",
						subtitle: "Call. Chat. Collaborate",
						icon: artwork(100, 100, "5558AF", "Teams"),
						url: "/product/6",
					} as LockupItem,
					{
						title: "Snapchat",
						subtitle: "Share the moment",
						icon: artwork(100, 100, "FFFC00", "👻"),
						url: "/product/7",
					} as LockupItem,
				],
			},
			{
				id: "streaming",
				title: "Stream solo or with company",
				seeAllUrl: "/collection/streaming",
				heading: "THE LIST",
				contentType: "lockup",
				items: [
					{
						title: "Viki: Asian Dramas, Movies, TV",
						subtitle: "Watch KDramas, CDramas & more",
						icon: artwork(100, 100, "17C4BB", "Viki"),
						url: "/product/8",
					} as LockupItem,
					{
						title: "Apple TV",
						subtitle: "Originals, Live Sports & More",
						icon: artwork(100, 100, "000000", "tv"),
						url: "/product/9",
					} as LockupItem,
				],
			},
		],
	},

	articlePage: {
		card: {
			title: "Procreate Dreams: Animation for Everyone",
			heading: "Now Available",
			style: "dark",
			media: artwork(800, 600, "000000", "Procreate"),
			url: "/product/1",
		} as TodayCard,
		shelves: [
			{
				contentType: "text",
				items: [
					{
						text: "Create captivating animations, faster than ever. Procreate Dreams is an all-new animation app packed with powerful tools that anyone can use.",
					} as ArticleTextItem,
				],
			},
			{
				contentType: "image",
				items: [
					{
						artwork: artwork(1200, 675, "5B5B5F", "Feature"),
					} as ArticleImageItem,
				],
			},
		],
		footerApp: {
			title: "Procreate",
			subtitle: "Sketch, Paint, Create.",
			icon: artwork(200, 200, "FFFFFF", "Icon"),
			url: "/product/1",
		},
	},

	productPage: {
		title: "Procreate",
		icon: artwork(200, 200, "FFFFFF", "Procreate"),
		subtitle: "Sketch, Paint, Create.",
		price: "$12.99",
		shelves: [
			{
				contentType: "badge",
				items: [
					{
						type: "rating",
						heading: "Rating",
						rating: 4.5,
						text: "4.5",
					} as ProductBadgeItem,
					{ type: "award", heading: "Editor's Choice" } as ProductBadgeItem,
					{ type: "age", heading: "Age", text: "4+" } as ProductBadgeItem,
				],
			},
			{
				contentType: "media",
				items: [
					{
						screenshot: artwork(1600, 900, "8B8B8F", "SS1"),
					} as ProductMediaItem,
					{
						screenshot: artwork(1600, 900, "8B8B8F", "SS2"),
					} as ProductMediaItem,
					{
						screenshot: artwork(1600, 900, "8B8B8F", "SS3"),
					} as ProductMediaItem,
				],
			},
			{
				contentType: "description",
				items: [
					{
						text: "Loved by creative pros, Procreate is the leading creative application made for iPad. Offering hundreds of handmade brushes, a suite of innovative artistic tools, an advanced layer system, and the lightning fast Valkyrie graphics engine.",
					} as ProductDescriptionItem,
				],
			},
			{
				title: "Ratings & Reviews",
				contentType: "rating",
				items: [
					{
						average: 4.5,
						count: 135000,
						distribution: [500, 1000, 2000, 15000, 116500].reverse(),
					} as ProductRatingItem,
				],
			},
		],
	},

	searchPage: {
		title: "Search",
		shelves: [
			{
				title: "Trending",
				contentType: "searchLink",
				items: [
					{ title: "Subway Surfers", url: "/search?q=subway" },
					{ title: "AI Chatbot", url: "/search?q=ai" },
					{ title: "Monopoly Go", url: "/search?q=monopoly" },
					{ title: "Productivity", url: "/search?q=productivity" },
				],
			},
		],
	},
};
