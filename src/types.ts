export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  categoryId: string;
  categoryName: string;
  stock: number;
  regularPrice: number;
  discountPercent: number; // 0-100
  salePrice: number;
  labels: string[];
  launchDate: string | null; // ISO string or null for immediate
  isScheduled: boolean;
  createdAt: string;
}

export interface AuthStatus {
  setup: boolean;
  authenticated: boolean;
}

export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ScheduledLaunch {
  id: string;
  name: string;
  launchDate: string;
  stock: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalInventoryValue: number;
  lowStockCount: number;
  lowStockItems: LowStockItem[];
  categoryDistribution: CategoryCount[];
  scheduledLaunches: ScheduledLaunch[];
}

export interface Collection {
  id: string;
  name: string;
  launchDate: string;
  coverImage: string;
  createdAt: string;
}

