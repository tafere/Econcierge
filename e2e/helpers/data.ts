// ─── Auth ─────────────────────────────────────────────────────────────────────

export const MOCK_TOKEN = 'mock-jwt-token-for-testing';

export const MOCK_ADMIN = {
  username: 'admin',
  fullName: 'Admin User',
  roles: ['ADMIN'],
  hotelId: 1,
  hotelName: 'Test Hotel',
  primaryColor: null,
  logoUrl: null,
};

export const MOCK_STAFF_USER = {
  username: 'housekeeping1',
  fullName: 'House Keeper',
  roles: ['HOUSEKEEPING'],
  hotelId: 1,
  hotelName: 'Test Hotel',
  primaryColor: null,
  logoUrl: null,
};

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const MOCK_ROOMS = [
  { id: 1, roomNumber: '101', floor: '1', type: 'Standard', qrToken: 'qr-token-101', enabled: true },
  { id: 2, roomNumber: '202', floor: '2', type: 'Suite',    qrToken: 'qr-token-202', enabled: true },
  { id: 3, roomNumber: '303', floor: '3', type: 'Deluxe',   qrToken: 'qr-token-303', enabled: false },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES = [
  {
    id: 1, name: 'Housekeeping', nameAm: 'የቤት አያያዝ', icon: 'broom', etaMinutes: 15, sortOrder: 1,
    items: [
      { id: 1, name: 'Extra Towels', nameAm: 'ተጨማሪ ፎጣዎች', enabled: true, maxQuantity: 5, schedulable: false, slotIntervalMins: 30, capacity: 10 },
      { id: 2, name: 'Extra Pillows', nameAm: null, enabled: true, maxQuantity: 3, schedulable: false, slotIntervalMins: 30, capacity: 10 },
    ],
  },
  {
    id: 2, name: 'Transport', nameAm: 'መጓጓዣ', icon: 'car', etaMinutes: 30, sortOrder: 2,
    items: [
      { id: 3, name: 'Shuttle Schedule', nameAm: 'የሻትል ጊዜ ሰሌዳ', enabled: true, maxQuantity: 1, schedulable: true, slotIntervalMins: 60, capacity: 8 },
    ],
  },
  {
    id: 3, name: 'Spa', nameAm: 'ስፓ', icon: 'flower', etaMinutes: null, sortOrder: 3,
    items: [
      { id: 4, name: 'Massage', nameAm: null, enabled: true, maxQuantity: 1, schedulable: true, slotIntervalMins: 60, capacity: 2 },
      { id: 5, name: 'Sauna', nameAm: null, enabled: true, maxQuantity: 1, schedulable: true, slotIntervalMins: 60, capacity: 4 },
    ],
  },
];

// ─── Staff ────────────────────────────────────────────────────────────────────

export const MOCK_STAFF = [
  { id: 1, username: 'admin',     fullName: 'Admin User',   roles: ['ADMIN'],                  enabled: true },
  { id: 2, username: 'john',      fullName: 'John Smith',   roles: ['HOUSEKEEPING'],            enabled: true },
  { id: 3, username: 'maria',     fullName: 'Maria Garcia', roles: ['SPA'],                    enabled: true },
  { id: 4, username: 'disabled1', fullName: 'Old Staff',    roles: ['STAFF'],                  enabled: false },
  { id: 5, username: 'multi1',    fullName: 'Multi Role',   roles: ['HOUSEKEEPING', 'SPA'],    enabled: true },
];

// ─── Service Requests ─────────────────────────────────────────────────────────

export const MOCK_REQUESTS = {
  pending: [
    {
      id: 1, roomNumber: '101', floor: '1', itemName: 'Extra Towels',
      categoryName: 'Housekeeping', categoryIcon: 'broom',
      quantity: 2, notes: 'Please deliver ASAP',
      status: 'PENDING', createdAt: new Date().toISOString(),
      etaMinutes: 15, escalated: false, highlighted: false,
      slotTimeIso: null, assignedTo: null, staffComment: null,
    },
    {
      id: 2, roomNumber: '202', floor: '2', itemName: 'Extra Pillows',
      categoryName: 'Housekeeping', categoryIcon: 'broom',
      quantity: 1, notes: null,
      status: 'PENDING', createdAt: new Date(Date.now() - 35 * 60_000).toISOString(), // 35 min ago = overdue
      etaMinutes: 15, escalated: false, highlighted: false,
      slotTimeIso: null, assignedTo: null, staffComment: null,
    },
  ],
  inProgress: [
    {
      id: 3, roomNumber: '303', floor: '3', itemName: 'Extra Towels',
      categoryName: 'Housekeeping', categoryIcon: 'broom',
      quantity: 1, notes: null,
      status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
      etaMinutes: 15, escalated: false, highlighted: false,
      slotTimeIso: null, assignedTo: 'John Smith', staffComment: null,
    },
  ],
  completed: [
    {
      id: 4, roomNumber: '101', floor: '1', itemName: 'Extra Pillows',
      categoryName: 'Housekeeping', categoryIcon: 'broom',
      quantity: 2, notes: null,
      status: 'DONE', createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      etaMinutes: 15, escalated: false, highlighted: false,
      slotTimeIso: null, assignedTo: 'John Smith', staffComment: null,
    },
  ],
};

export const ALL_MOCK_REQUESTS = [
  ...MOCK_REQUESTS.pending,
  ...MOCK_REQUESTS.inProgress,
  ...MOCK_REQUESTS.completed,
];

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const MOCK_BOOKINGS = [
  {
    id: 1, roomNumber: '101', floor: '1', itemName: 'Shuttle Schedule',
    categoryName: 'Transport', categoryIcon: 'car',
    slotTime: '10:00 AM', slotTimeIso: new Date(Date.now() + 3600_000).toISOString(),
    guestCount: 2, status: 'PENDING',
  },
  {
    id: 2, roomNumber: '202', floor: '2', itemName: 'Massage',
    categoryName: 'Spa', categoryIcon: 'flower',
    slotTime: '2:00 PM', slotTimeIso: new Date(Date.now() + 7200_000).toISOString(),
    guestCount: 1, status: 'PENDING',
  },
];

// ─── Hotel Settings ───────────────────────────────────────────────────────────

export const MOCK_HOTEL = {
  id: 1,
  name: 'Test Hotel',
  tagline: 'Your home away from home',
  logoUrl: '',
  heroImageUrl: '',
  primaryColor: '#b45309',
  defaultEtaMinutes: 20,
  website: 'https://testhotel.com',
  address: '123 Main Street',
  phone: '+1-555-0100',
  email: 'info@testhotel.com',
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const MOCK_ANALYTICS = {
  kpi: {
    todayCount: 24,
    openCount: 5,
    completionRate: 87,
    avgResponseMins: 12,
  },
  byHour: Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 10),
  })),
  byDay: [
    { date: 'Apr 13', count: 12 },
    { date: 'Apr 14', count: 18 },
    { date: 'Apr 15', count: 9  },
    { date: 'Apr 16', count: 22 },
    { date: 'Apr 17', count: 15 },
    { date: 'Apr 18', count: 30 },
    { date: 'Apr 19', count: 24 },
  ],
  byCategory: [
    { category: 'Housekeeping', count: 45 },
    { category: 'Transport',    count: 20 },
    { category: 'Spa',          count: 12 },
  ],
  topItems: [
    { item: 'Extra Towels',    count: 30 },
    { item: 'Extra Pillows',   count: 15 },
    { item: 'Shuttle Schedule', count: 10 },
  ],
  leaderboard: [
    { name: 'John Smith',   handled: 45, avgMins: 10 },
    { name: 'Maria Garcia', handled: 32, avgMins: 8  },
  ],
};

// ─── Guest (Public) ───────────────────────────────────────────────────────────

export const MOCK_QR_TOKEN = 'qr-token-101';

export const MOCK_ROOM_INFO = {
  roomId: 1,
  roomNumber: '101',
  floor: '1',
  hotelId: 1,
  hotelName: 'Test Hotel',
  tagline: 'Your home away from home',
  logoUrl: '',
  heroImageUrl: '',
  primaryColor: '#b45309',
  menu: [
    {
      id: 1, name: 'Housekeeping', nameAm: 'የቤት አያያዝ', icon: 'broom',
      items: [
        { id: 1, name: 'Extra Towels', nameAm: 'ተጨማሪ ፎጣዎች', description: '', maxQuantity: 5, schedulable: false, slotIntervalMins: 30, capacity: 10 },
        { id: 2, name: 'Extra Pillows', nameAm: null, description: '', maxQuantity: 3, schedulable: false, slotIntervalMins: 30, capacity: 10 },
      ],
    },
    {
      id: 2, name: 'Transport', nameAm: 'መጓጓዣ', icon: 'car',
      items: [
        { id: 3, name: 'Shuttle Schedule', nameAm: 'የሻትል ጊዜ ሰሌዳ', description: '', maxQuantity: 1, schedulable: true, slotIntervalMins: 60, capacity: 8 },
      ],
    },
  ],
};

export const MOCK_SLOTS = [
  { time: '10:00 AM', dateTime: new Date(Date.now() + 3600_000).toISOString(), capacity: 8, remaining: 6, available: true, past: false },
  { time: '11:00 AM', dateTime: new Date(Date.now() + 7200_000).toISOString(), capacity: 8, remaining: 8, available: true, past: false },
  { time: '12:00 PM', dateTime: new Date(Date.now() + 10800_000).toISOString(), capacity: 8, remaining: 0, available: false, past: false },
  { time: '01:00 PM', dateTime: new Date(Date.now() + 14400_000).toISOString(), capacity: 8, remaining: 4, available: true, past: false },
];
