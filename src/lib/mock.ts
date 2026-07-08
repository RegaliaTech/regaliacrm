import type {
  CustomerStatus,
  ExpenseCategory,
  ProductKind,
  QuotationStatus,
} from "@prisma/client";

/**
 * Realistic sample data used as a fallback when the database isn't connected.
 * Lets the UI present a fully populated, production-like experience during
 * local development and demos.
 */

export type MockRecentQuote = {
  id: string;
  number: string;
  status: QuotationStatus;
  total: number;
  currency: string;
  createdAt: Date;
  customer: { name: string; company: string | null };
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export const mockStats = {
  customers: 248,
  products: 86,
  quotations: 134,
  pendingFollowups: 17,
  pipelineValue: 1_284_500,
};

export const mockRecentQuotes: MockRecentQuote[] = [
  {
    id: "q-1042",
    number: "Q-1042",
    status: "SENT",
    total: 84500,
    currency: "AED",
    createdAt: daysAgo(0),
    customer: { name: "John Carter", company: "Acme Industrial" },
  },
  {
    id: "q-1041",
    number: "Q-1041",
    status: "ACCEPTED",
    total: 152000,
    currency: "AED",
    createdAt: daysAgo(1),
    customer: { name: "Maria Lopez", company: "Globex Corp" },
  },
  {
    id: "q-1040",
    number: "Q-1040",
    status: "DRAFT",
    total: 23750,
    currency: "AED",
    createdAt: daysAgo(2),
    customer: { name: "Ahmed Khan", company: "Falcon Trading" },
  },
  {
    id: "q-1039",
    number: "Q-1039",
    status: "SENT",
    total: 67900,
    currency: "AED",
    createdAt: daysAgo(4),
    customer: { name: "Sara Idris", company: "Nova Engineering" },
  },
  {
    id: "q-1038",
    number: "Q-1038",
    status: "REJECTED",
    total: 41200,
    currency: "AED",
    createdAt: daysAgo(6),
    customer: { name: "Liam Walsh", company: "Summit Build" },
  },
];

// Detailed mock quotations with items (for individual quotation views)
export type MockQuotationDetail = {
  id: string;
  number: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  status: string;
  currency: string;
  taxRate: number;
  discountRate: number;
  notes: string | null;
  validUntil: Date | null;
  issuedAt: Date | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  items: {
    id: string;
    quotationId: string;
    productId: string | null;
    product?: {
      id: string;
      sku: string;
      name: string;
      kind: string;
    } | null;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    position: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export const mockQuotationDetails: MockQuotationDetail[] = [
  {
    id: "q-1042",
    number: "Q-1042",
    customerId: "c-acme-john",
    customer: {
      id: "c-acme-john",
      name: "John Carter",
      company: "Acme Industrial",
      email: "john.carter@acme.ae",
    },
    status: "SENT",
    currency: "AED",
    taxRate: 5,
    discountRate: 0,
    notes: "Expo stand coverage - 3 day event at DWTC",
    validUntil: new Date("2026-07-15"),
    issuedAt: daysAgo(0),
    subtotal: 84500,
    discountTotal: 0,
    taxTotal: 4225,
    total: 88725,
    items: [
      {
        id: "qi-1042-1",
        quotationId: "q-1042",
        productId: "p-eternity",
        product: {
          id: "p-eternity",
          sku: "MDL-ETERNITY",
          name: "Sofia Eternity",
          kind: "MODEL",
        },
        description: "Promotional model for expo stand - 3 days",
        quantity: 3,
        unitPrice: 18500,
        lineTotal: 55500,
        position: 0,
      },
      {
        id: "qi-1042-2",
        quotationId: "q-1042",
        productId: "p-orion",
        product: {
          id: "p-orion",
          sku: "PHG-ORION",
          name: "Orion Vega",
          kind: "PHOTOGRAPHER",
        },
        description: "Event photography coverage - 3 days",
        quantity: 3,
        unitPrice: 9500,
        lineTotal: 28500,
        position: 1,
      },
      {
        id: "qi-1042-3",
        quotationId: "q-1042",
        productId: null,
        product: null,
        description: "Travel allowance",
        quantity: 1,
        unitPrice: 500,
        lineTotal: 500,
        position: 2,
      },
    ],
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: "q-1041",
    number: "Q-1041",
    customerId: "c-globex-maria",
    customer: {
      id: "c-globex-maria",
      name: "Maria Lopez",
      company: "Globex Corp",
      email: "m.lopez@globex.com",
    },
    status: "ACCEPTED",
    currency: "AED",
    taxRate: 5,
    discountRate: 10,
    notes: "Corporate gala event - VIP package confirmed",
    validUntil: new Date("2026-08-01"),
    issuedAt: daysAgo(1),
    subtotal: 152000,
    discountTotal: 15200,
    taxTotal: 6840,
    total: 143640,
    items: [
      {
        id: "qi-1041-1",
        quotationId: "q-1041",
        productId: "p-eternity",
        product: {
          id: "p-eternity",
          sku: "MDL-ETERNITY",
          name: "Sofia Eternity",
          kind: "MODEL",
        },
        description: "Runway model - Corporate gala",
        quantity: 4,
        unitPrice: 18500,
        lineTotal: 74000,
        position: 0,
      },
      {
        id: "qi-1041-2",
        quotationId: "q-1041",
        productId: "p-celeste",
        product: {
          id: "p-celeste",
          sku: "MDL-CELESTE",
          name: "Celeste Marin",
          kind: "MODEL",
        },
        description: "Event host - Bilingual MC",
        quantity: 4,
        unitPrice: 16200,
        lineTotal: 64800,
        position: 1,
      },
      {
        id: "qi-1041-3",
        quotationId: "q-1041",
        productId: null,
        product: null,
        description: "Premium styling package",
        quantity: 1,
        unitPrice: 13200,
        lineTotal: 13200,
        position: 2,
      },
    ],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "q-1040",
    number: "Q-1040",
    customerId: "c-falcon-ahmed",
    customer: {
      id: "c-falcon-ahmed",
      name: "Ahmed Khan",
      company: "Falcon Trading",
      email: "akhan@falcontrading.ae",
    },
    status: "DRAFT",
    currency: "AED",
    taxRate: 5,
    discountRate: 0,
    notes: "Product photography shoot - warehouse location",
    validUntil: new Date("2026-07-10"),
    issuedAt: null,
    subtotal: 23750,
    discountTotal: 0,
    taxTotal: 1187.5,
    total: 24937.5,
    items: [
      {
        id: "qi-1040-1",
        quotationId: "q-1040",
        productId: "p-orion",
        product: {
          id: "p-orion",
          sku: "PHG-ORION",
          name: "Orion Vega",
          kind: "PHOTOGRAPHER",
        },
        description: "Product photography - Full day shoot",
        quantity: 2,
        unitPrice: 9500,
        lineTotal: 19000,
        position: 0,
      },
      {
        id: "qi-1040-2",
        quotationId: "q-1040",
        productId: null,
        product: null,
        description: "Photo editing and retouching - 50 images",
        quantity: 1,
        unitPrice: 4750,
        lineTotal: 4750,
        position: 1,
      },
    ],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "q-1039",
    number: "Q-1039",
    customerId: "c-nova-sara",
    customer: {
      id: "c-nova-sara",
      name: "Sara Idris",
      company: "Nova Engineering",
      email: "s.idris@novaeng.io",
    },
    status: "SENT",
    currency: "AED",
    taxRate: 5,
    discountRate: 5,
    notes: "Corporate headshots session for 15 employees",
    validUntil: new Date("2026-07-20"),
    issuedAt: daysAgo(4),
    subtotal: 67900,
    discountTotal: 3395,
    taxTotal: 3225.25,
    total: 67730.25,
    items: [
      {
        id: "qi-1039-1",
        quotationId: "q-1039",
        productId: "p-orion",
        product: {
          id: "p-orion",
          sku: "PHG-ORION",
          name: "Orion Vega",
          kind: "PHOTOGRAPHER",
        },
        description: "Corporate headshots - Studio session",
        quantity: 3,
        unitPrice: 9500,
        lineTotal: 28500,
        position: 0,
      },
      {
        id: "qi-1039-2",
        quotationId: "q-1039",
        productId: "p-celeste",
        product: {
          id: "p-celeste",
          sku: "MDL-CELESTE",
          name: "Celeste Marin",
          kind: "MODEL",
        },
        description: "Brand ambassador photoshoot",
        quantity: 2,
        unitPrice: 16200,
        lineTotal: 32400,
        position: 1,
      },
      {
        id: "qi-1039-3",
        quotationId: "q-1039",
        productId: null,
        product: null,
        description: "Studio rental and equipment - Full day",
        quantity: 1,
        unitPrice: 7000,
        lineTotal: 7000,
        position: 2,
      },
    ],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "q-1038",
    number: "Q-1038",
    customerId: "c-summit-liam",
    customer: {
      id: "c-summit-liam",
      name: "Liam Walsh",
      company: "Summit Build",
      email: "liam.walsh@summitbuild.me",
    },
    status: "REJECTED",
    currency: "AED",
    taxRate: 5,
    discountRate: 0,
    notes: "Construction site promotional video - declined due to budget",
    validUntil: new Date("2026-06-30"),
    issuedAt: daysAgo(6),
    subtotal: 41200,
    discountTotal: 0,
    taxTotal: 2060,
    total: 43260,
    items: [
      {
        id: "qi-1038-1",
        quotationId: "q-1038",
        productId: "p-orion",
        product: {
          id: "p-orion",
          sku: "PHG-ORION",
          name: "Orion Vega",
          kind: "PHOTOGRAPHER",
        },
        description: "Videography - Construction site coverage",
        quantity: 4,
        unitPrice: 9500,
        lineTotal: 38000,
        position: 0,
      },
      {
        id: "qi-1038-2",
        quotationId: "q-1038",
        productId: null,
        product: null,
        description: "Video editing and post-production",
        quantity: 1,
        unitPrice: 3200,
        lineTotal: 3200,
        position: 1,
      },
    ],
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
];

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export type MockCustomer = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: CustomerStatus;
  tags: string[];
  ownerId: string | null;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const mockCustomers: MockCustomer[] = [
  {
    id: "c-acme-john",
    name: "John Carter",
    company: "Acme Industrial",
    email: "john.carter@acme.ae",
    phone: "+971 50 112 8943",
    website: "https://acme.ae",
    address: "JLT Cluster Y, Dubai, UAE",
    status: "ACTIVE",
    tags: ["VIP", "Corporate", "Repeat"],
    ownerId: "u-sales-noor",
    ownerName: "Noor Ibrahim",
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
  },
  {
    id: "c-globex-maria",
    name: "Maria Lopez",
    company: "Globex Corp",
    email: "m.lopez@globex.com",
    phone: "+971 55 334 7812",
    website: "https://globex.com",
    address: "DIFC Gate Avenue, Dubai, UAE",
    status: "LEAD",
    tags: ["RFP", "Expo 2027", "Enterprise"],
    ownerId: "u-sales-adam",
    ownerName: "Adam Kareem",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(0),
  },
  {
    id: "c-falcon-ahmed",
    name: "Ahmed Khan",
    company: "Falcon Trading",
    email: "akhan@falcontrading.ae",
    phone: "+971 52 889 4401",
    website: "https://falcontrading.ae",
    address: "Al Quoz Industrial Area 3, Dubai, UAE",
    status: "ACTIVE",
    tags: ["Logistics", "Priority"],
    ownerId: "u-sales-noor",
    ownerName: "Noor Ibrahim",
    createdAt: daysAgo(140),
    updatedAt: daysAgo(3),
  },
  {
    id: "c-nova-sara",
    name: "Sara Idris",
    company: "Nova Engineering",
    email: "s.idris@novaeng.io",
    phone: "+971 58 120 3397",
    website: "https://novaeng.io",
    address: "Abu Dhabi Global Market, Abu Dhabi, UAE",
    status: "INACTIVE",
    tags: ["On Hold", "Budget Review"],
    ownerId: "u-sales-adam",
    ownerName: "Adam Kareem",
    createdAt: daysAgo(220),
    updatedAt: daysAgo(41),
  },
  {
    id: "c-summit-liam",
    name: "Liam Walsh",
    company: "Summit Build",
    email: "liam.walsh@summitbuild.me",
    phone: "+971 50 650 1200",
    website: "https://summitbuild.me",
    address: "Business Bay, Dubai, UAE",
    status: "CHURNED",
    tags: ["Lost", "Competitor"],
    ownerId: "u-sales-adam",
    ownerName: "Adam Kareem",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(95),
  },
  {
    id: "c-atelier-aya",
    name: "Aya Nakamura",
    company: "Atelier Bloom",
    email: "aya@atelierbloom.studio",
    phone: "+971 55 901 2830",
    website: "https://atelierbloom.studio",
    address: "Alserkal Avenue, Dubai, UAE",
    status: "ACTIVE",
    tags: ["Creative", "Bridal", "High Ticket"],
    ownerId: "u-sales-noor",
    ownerName: "Noor Ibrahim",
    createdAt: daysAgo(88),
    updatedAt: daysAgo(2),
  },
  {
    id: "c-orchid-rania",
    name: "Rania Salem",
    company: "Orchid Hospitality",
    email: "rania.salem@orchidhospitality.com",
    phone: "+971 54 443 7291",
    website: "https://orchidhospitality.com",
    address: "Yas Island, Abu Dhabi, UAE",
    status: "LEAD",
    tags: ["Hotel", "Event Season"],
    ownerId: "u-sales-adam",
    ownerName: "Adam Kareem",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(1),
  },
  {
    id: "c-polaris-emma",
    name: "Emma Richardson",
    company: "Polaris Ventures",
    email: "emma@polarisvc.co",
    phone: "+971 58 772 1944",
    website: "https://polarisvc.co",
    address: "One Central, Dubai, UAE",
    status: "ACTIVE",
    tags: ["Investment", "Quarterly"],
    ownerId: "u-sales-noor",
    ownerName: "Noor Ibrahim",
    createdAt: daysAgo(132),
    updatedAt: daysAgo(6),
  },
  {
    id: "c-bluewave-yusuf",
    name: "Yusuf Al Mansoori",
    company: "Bluewave Marine",
    email: "yusuf@bluewavemarine.ae",
    phone: "+971 50 210 6408",
    website: "https://bluewavemarine.ae",
    address: "Mina Zayed Port, Abu Dhabi, UAE",
    status: "INACTIVE",
    tags: ["Seasonal", "Follow-up Q4"],
    ownerId: "u-sales-adam",
    ownerName: "Adam Kareem",
    createdAt: daysAgo(201),
    updatedAt: daysAgo(28),
  },
  {
    id: "c-riviera-olivia",
    name: "Olivia Bennett",
    company: "Riviera Events",
    email: "olivia@rivieraevents.co",
    phone: "+971 56 334 9120",
    website: "https://rivieraevents.co",
    address: "Jumeirah 1, Dubai, UAE",
    status: "ACTIVE",
    tags: ["Agency", "Wedding", "Monthly"],
    ownerId: "u-sales-noor",
    ownerName: "Noor Ibrahim",
    createdAt: daysAgo(70),
    updatedAt: daysAgo(0),
  },
];

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export type MockExpense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  incurredAt: Date;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
};

export const mockExpenses: MockExpense[] = [
  {
    id: "e-rent-1",
    title: "Studio + office rent",
    category: "RENT",
    amount: 18000,
    currency: "AED",
    incurredAt: daysAgo(3),
    notes: "Monthly rent — Al Quoz studio & office",
    createdById: "u-admin",
    createdByName: "Ali Sheikh",
    createdAt: daysAgo(3),
  },
  {
    id: "e-util-1",
    title: "DEWA + internet",
    category: "UTILITIES",
    amount: 2450,
    currency: "AED",
    incurredAt: daysAgo(5),
    notes: null,
    createdById: "u-admin",
    createdByName: "Ali Sheikh",
    createdAt: daysAgo(5),
  },
  {
    id: "e-sal-1",
    title: "Sales & ops payroll",
    category: "SALARIES",
    amount: 42000,
    currency: "AED",
    incurredAt: daysAgo(8),
    notes: "Monthly payroll run",
    createdById: "u-admin",
    createdByName: "Ali Sheikh",
    createdAt: daysAgo(8),
  },
  {
    id: "e-mkt-1",
    title: "Instagram ad campaign",
    category: "MARKETING",
    amount: 3600,
    currency: "AED",
    incurredAt: daysAgo(12),
    notes: "Expo 2027 lead-gen push",
    createdById: "u-admin",
    createdByName: "Ali Sheikh",
    createdAt: daysAgo(12),
  },
  {
    id: "e-maint-1",
    title: "Studio equipment servicing",
    category: "MAINTENANCE",
    amount: 1150,
    currency: "AED",
    incurredAt: daysAgo(15),
    notes: null,
    createdById: "u-admin",
    createdByName: "Ali Sheikh",
    createdAt: daysAgo(15),
  },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type MockProductImage = {
  id: string;
  url: string;
  caption: string | null;
  position: number;
};

export type MockProduct = {
  id: string;
  sku: string;
  name: string;
  kind: ProductKind;
  model: string | null;
  figure: string | null;
  category: string | null;
  description: string | null;
  coverImage: string | null;
  specs: Record<string, string> | null;
  height: string | null;
  weight: string | null;
  nationality: string | null;
  languages: string[];
  unitPrice: number;
  unitCost: number;
  currency: string;
  isActive: boolean;
  dailyRate: number | null;
  weeklyRate: number | null;
  deposit: number | null;
  qtyTotal: number | null;
  qtyOnRent: number;
  isBespoke: boolean;
  leadTimeDays: number | null;
  images: MockProductImage[];
  createdAt: Date;
};

function album(
  keyword: string,
  lockBase: number,
  captions: string[],
): MockProductImage[] {
  return captions.map((caption, i) => ({
    id: `${keyword.replace(/[^a-z]/gi, "")}-${lockBase}-${i}`,
    url: `https://loremflickr.com/800/600/${keyword}?lock=${lockBase + i}`,
    caption,
    position: i,
  }));
}

function cover(keyword: string, lockBase: number): string {
  return `https://loremflickr.com/800/600/${keyword}?lock=${lockBase}`;
}

export const mockProducts: MockProduct[] = [
  {
    id: "p-eternity",
    sku: "MDL-ETERNITY",
    name: "Sofia Eternity",
    kind: "MODEL",
    model: "ETERNITY",
    figure: "Runway / Host",
    category: "Fashion Models",
    description:
      "Versatile runway and promotional model, experienced in expo, private and corporate events. Also available as an event host.",
    coverImage: cover("fashion,model,woman", 101),
    specs: { Experience: "6 years", Eyes: "Hazel", Hair: "Brunette" },
    height: "178 cm",
    weight: "58 kg",
    nationality: "Italian",
    languages: ["English", "Italian", "French"],
    unitPrice: 18500,
    unitCost: 7200,
    currency: "AED",
    isActive: true,
    dailyRate: null,
    weeklyRate: null,
    deposit: null,
    qtyTotal: null,
    qtyOnRent: 0,
    isBespoke: false,
    leadTimeDays: null,
    images: album("fashion,model,woman", 101, [
      "Runway look",
      "Studio portrait",
      "Editorial shot",
      "Event appearance",
    ]),
    createdAt: daysAgo(40),
  },
  {
    id: "p-celeste",
    sku: "MDL-CELESTE",
    name: "Celeste Marin",
    kind: "MODEL",
    model: "CELESTE",
    figure: "Promotional / Host",
    category: "Event Hosts",
    description:
      "Bilingual event host and promotional model for corporate launches and expo stands.",
    coverImage: cover("model,woman,portrait", 201),
    specs: { Experience: "4 years", Eyes: "Green", Hair: "Blonde" },
    height: "172 cm",
    weight: "55 kg",
    nationality: "French",
    languages: ["English", "French", "Arabic"],
    unitPrice: 16200,
    unitCost: 6400,
    currency: "AED",
    isActive: true,
    dailyRate: null,
    weeklyRate: null,
    deposit: null,
    qtyTotal: null,
    qtyOnRent: 0,
    isBespoke: false,
    leadTimeDays: null,
    images: album("model,woman,portrait", 201, [
      "Promotional shoot",
      "Event hosting",
      "Side profile",
    ]),
    createdAt: daysAgo(28),
  },
  {
    id: "p-orion",
    sku: "PHG-ORION",
    name: "Orion Vega",
    kind: "PHOTOGRAPHER",
    model: null,
    figure: "Event & Studio",
    category: "Photographers",
    description:
      "Award-winning event photographer specialising in expo coverage, corporate portraits and product shoots.",
    coverImage: cover("photographer,camera", 301),
    specs: { Experience: "9 years", Gear: "Sony A1", Style: "Editorial" },
    height: "183 cm",
    weight: "76 kg",
    nationality: "Spanish",
    languages: ["English", "Spanish"],
    unitPrice: 4500,
    unitCost: 1500,
    currency: "AED",
    isActive: true,
    dailyRate: null,
    weeklyRate: null,
    deposit: null,
    qtyTotal: null,
    qtyOnRent: 0,
    isBespoke: false,
    leadTimeDays: null,
    images: album("photographer,camera", 301, [
      "On assignment",
      "Studio setup",
    ]),
    createdAt: daysAgo(20),
  },
  {
    id: "p-arch",
    sku: "RNT-ARCH-GOLD",
    name: "Gold Circular Arch",
    kind: "RENTAL",
    model: "ARCH-2400",
    figure: null,
    category: "Ceremony Decor",
    description:
      "2.4m brushed-gold circular arch, perfect centerpiece for vows and photos.",
    coverImage: cover("wedding,arch,flowers", 401),
    specs: { Height: "2.4m", Finish: "Brushed Gold", Setup: "Included" },
    height: null,
    weight: null,
    nationality: null,
    languages: [],
    unitPrice: 0,
    unitCost: 3200,
    currency: "AED",
    isActive: true,
    dailyRate: 650,
    weeklyRate: 3200,
    deposit: 1500,
    qtyTotal: 6,
    qtyOnRent: 4,
    isBespoke: false,
    leadTimeDays: null,
    images: album("wedding,arch,flowers", 401, ["Assembled arch", "Detail finish"]),
    createdAt: daysAgo(60),
  },
  {
    id: "p-chairs",
    sku: "RNT-CHIAVARI",
    name: "Chiavari Chairs (set of 50)",
    kind: "RENTAL",
    model: "CHIAVARI-CLR",
    figure: null,
    category: "Seating",
    description:
      "Crystal-clear resin Chiavari chairs with cushioned seats, rented in sets of 50.",
    coverImage: cover("wedding,chairs,banquet", 501),
    specs: { Material: "Resin", Color: "Clear", PerSet: "50 chairs" },
    height: null,
    weight: null,
    nationality: null,
    languages: [],
    unitPrice: 0,
    unitCost: 8000,
    currency: "AED",
    isActive: true,
    dailyRate: 1200,
    weeklyRate: 6000,
    deposit: 2000,
    qtyTotal: 10,
    qtyOnRent: 2,
    isBespoke: false,
    leadTimeDays: null,
    images: album("wedding,chairs,banquet", 501, ["Full set", "Seat detail"]),
    createdAt: daysAgo(75),
  },
  {
    id: "p-couture",
    sku: "CST-COUTURE",
    name: "Bespoke Couture Gown",
    kind: "CUSTOM",
    model: null,
    figure: "Made to measure",
    category: "Custom Bridal",
    description:
      "Fully bespoke gown designed from scratch with the bride across three fittings.",
    coverImage: cover("wedding,dress,gown", 601),
    specs: { Fittings: "3 included", Design: "1:1 consultation" },
    height: null,
    weight: null,
    nationality: null,
    languages: [],
    unitPrice: 32000,
    unitCost: 12000,
    currency: "AED",
    isActive: true,
    dailyRate: null,
    weeklyRate: null,
    deposit: null,
    qtyTotal: null,
    qtyOnRent: 0,
    isBespoke: true,
    leadTimeDays: 90,
    images: album("wedding,dress,gown", 601, ["Sketch concept", "Fabric selection"]),
    createdAt: daysAgo(15),
  },
];
