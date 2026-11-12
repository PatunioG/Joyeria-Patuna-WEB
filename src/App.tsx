import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Lock,
  Plus,
  Trash2,
  Edit,
  LogOut,
  X,
  Calendar,
  DollarSign,
  Package,
  FolderOpen,
  AlertTriangle,
  Tag,
  ChevronRight,
  UserCheck,
  Compass,
  Mail,
  Send,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Home,
  LayoutDashboard,
  Menu,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BrandLogo from "./components/BrandLogo";
import AiAssistant from "./components/AiAssistant";
import { Category, Product, DashboardStats, AuthStatus, Collection } from "./types";

const formatToLocalDateTimeLocal = (dateString: string | null) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<"catalog" | "admin" | "auth">("catalog");
  
  // Auth state
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ setup: false, authenticated: false });
  const [patternInput, setPatternInput] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<"choose" | "confirm">("choose");
  const [firstPattern, setFirstPattern] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Products and Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<number>(30000);
  const [filterDiscounted, setFilterDiscounted] = useState(false);
  const [filterSpecial, setFilterSpecial] = useState(false);
  const [filterNew, setFilterNew] = useState(false);

  // Catalog detail modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState(0);

  // Admin states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);

  // Product Form State
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    images: [] as string[],
    categoryId: "",
    stock: 5 as string | number,
    regularPrice: 1000 as string | number,
    discountPercent: 0 as string | number,
    salePrice: 1000 as string | number,
    labels: [] as string[],
    customLabelInput: "",
    launchDate: "",
    isScheduled: false
  });

  // Collections State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    launchDate: "",
    coverImage: "",
    notifySubscribers: false
  });
  const [isManagingCollections, setIsManagingCollections] = useState(false);

  // Custom Modal Dialogs State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Upcoming collection countdown
  const [upcomingCollection, setUpcomingCollection] = useState<Collection | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success">("idle");
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterSubscriptions, setNewsletterSubscriptions] = useState<any[]>([]);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchCollections();
    checkAuthStatus();
  }, [currentView]);

  // Handle countdown lockout timer
  useEffect(() => {
    if (lockoutTimer && lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer(prev => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  // Handle upcoming collection countdown
  useEffect(() => {
    if (collections.length === 0) {
      setUpcomingCollection(null);
      setTimeLeft(null);
      return;
    }

    const now = new Date();
    const futureCollections = collections
      .filter(c => new Date(c.launchDate) > now)
      .sort((a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());

    if (futureCollections.length === 0) {
      setUpcomingCollection(null);
      setTimeLeft(null);
      return;
    }

    const nextColl = futureCollections[0];
    setUpcomingCollection(nextColl);

    const updateTimer = () => {
      const target = new Date(nextColl.launchDate).getTime();
      const current = new Date().getTime();
      const diff = target - current;

      if (diff <= 0) {
        setTimeLeft(null);
        fetchCollections();
        fetchProducts();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [collections]);

  const customConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const customAlert = (title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      title,
      message
    });
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem("patuna_admin_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  const checkAuthStatus = async () => {
    try {
      const headers = getAuthHeader();
      const res = await fetch("/api/auth/status", { headers });
      const data = await res.json();
      setAuthStatus(data);
      if (data.authenticated && currentView === "auth") {
        setCurrentView("admin");
      }
    } catch (err) {
      console.error("Error checking auth status:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("patuna_admin_token");
      const url = token ? "/api/products?admin=true" : "/api/products";
      const res = await fetch(url, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats", {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchNewsletterSubscriptions = async () => {
    try {
      const res = await fetch("/api/newsletter", {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setNewsletterSubscriptions(data);
      }
    } catch (err) {
      console.error("Error fetching newsletter subscriptions:", err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCollections(data);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterError(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setNewsletterStatus("success");
        if (currentView === "admin") {
          fetchNewsletterSubscriptions();
        }
      } else {
        setNewsletterError(data.error || "Ocurrió un error.");
      }
    } catch (err) {
      console.error("Error subscribing to newsletter:", err);
      setNewsletterError("Error de conexión. Inténtelo más tarde.");
    }
  };

  const handleDeleteSubscription = async (email: string) => {
    customConfirm(
      "Eliminar Suscriptor",
      `¿Está seguro de que desea eliminar permanentemente la suscripción de "${email}"?`,
      async () => {
        try {
          const res = await fetch(`/api/newsletter?email=${encodeURIComponent(email)}`, {
            method: "DELETE",
            headers: getAuthHeader()
          });
          const data = await res.json();
          if (res.ok) {
            fetchNewsletterSubscriptions();
          } else {
            customAlert("Error", data.error || "Ocurrió un error al eliminar.");
          }
        } catch (err) {
          console.error("Error deleting subscription:", err);
          customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
        }
      }
    );
  };

  useEffect(() => {
    if (currentView === "admin") {
      fetchStats();
      fetchNewsletterSubscriptions();
      fetchCollections();
    }
  }, [currentView, products]);

  // Color sequence patterns setup / login
  const handleColorClick = (color: string) => {
    if (lockoutTimer) return;
    
    const newPattern = [...patternInput, color];
    setPatternInput(newPattern);

    if (newPattern.length === 4) {
      // Sequence completed
      setTimeout(() => {
        processPattern(newPattern);
      }, 300);
    }
  };

  const processPattern = async (pattern: string[]) => {
    setPatternInput([]);
    setAuthError(null);

    if (!authStatus.setup) {
      // First setup flow
      if (setupStep === "choose") {
        setFirstPattern(pattern);
        setSetupStep("confirm");
      } else {
        // Confirmation step
        if (pattern.join(",") === firstPattern.join(",")) {
          // Send to API to lock sequence
          try {
            const res = await fetch("/api/auth/setup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pattern })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem("patuna_admin_token", data.token);
              setAuthStatus({ setup: true, authenticated: true });
              setCurrentView("admin");
              setSetupStep("choose");
              setFirstPattern([]);
            } else {
              setAuthError(data.error);
              setSetupStep("choose");
            }
          } catch (err) {
            setAuthError("Error al configurar la seguridad de la bóveda.");
            setSetupStep("choose");
          }
        } else {
          setAuthError("Los patrones no coinciden. Por favor, intente de nuevo.");
          setSetupStep("choose");
        }
      }
    } else {
      // Regular login flow
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem("patuna_admin_token", data.token);
          setAuthStatus(prev => ({ ...prev, authenticated: true }));
          setCurrentView("admin");
        } else {
          setAuthError(data.error);
          if (data.lockoutRemaining) {
            setLockoutTimer(data.lockoutRemaining);
          }
        }
      } catch (err) {
        setAuthError("No se pudo conectar al sistema de seguridad.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: getAuthHeader()
      });
    } catch (e) {}
    localStorage.removeItem("patuna_admin_token");
    setAuthStatus(prev => ({ ...prev, authenticated: false }));
    setCurrentView("catalog");
  };

  // Image Upload System
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const response = await fetch("/api/products/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader()
            },
            body: JSON.stringify({
              fileData: base64data,
              filename: file.name
            })
          });
          const result = await response.json();
          if (result.success) {
            if (editingProduct || isAddingProduct) {
              setProductForm(prev => ({
                ...prev,
                images: [...prev.images, result.imageUrl]
              }));
            }
          } else {
            alert(result.error || "No se pudo subir la imagen.");
          }
        } catch (error) {
          console.error("Error upload file:", error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate discount and sale prices dynamically
  const handlePriceChange = (field: "regular" | "percent" | "sale", value: string) => {
    if (field === "regular") {
      const reg = value === "" ? "" : Number(value);
      const regNum = Number(value) || 0;
      const pctNum = Number(productForm.discountPercent) || 0;
      const calculatedSale = value === "" ? "" : Math.round(regNum * (1 - pctNum / 100));
      setProductForm(prev => ({
        ...prev,
        regularPrice: reg,
        salePrice: calculatedSale
      }));
    } else if (field === "percent") {
      const pct = value === "" ? "" : Math.min(100, Math.max(0, Number(value)));
      const pctNum = Number(pct) || 0;
      const regNum = Number(productForm.regularPrice) || 0;
      const calculatedSale = regNum === 0 ? "" : Math.round(regNum * (1 - pctNum / 100));
      setProductForm(prev => ({
        ...prev,
        discountPercent: pct,
        salePrice: calculatedSale
      }));
    } else if (field === "sale") {
      const sale = value === "" ? "" : Number(value);
      const saleNum = Number(value) || 0;
      const regNum = Number(productForm.regularPrice) || 0;
      const calculatedPct = regNum > 0 ? Math.round(((regNum - saleNum) / regNum) * 100) : 0;
      setProductForm(prev => ({
        ...prev,
        salePrice: sale,
        discountPercent: calculatedPct === 0 ? "" : Math.min(100, Math.max(0, calculatedPct))
      }));
    }
  };

  const handleLabelToggle = (label: string) => {
    setProductForm(prev => {
      const hasLabel = prev.labels.includes(label);
      return {
        ...prev,
        labels: hasLabel ? prev.labels.filter(l => l !== label) : [...prev.labels, label]
      };
    });
  };

  const handleAddCustomLabel = () => {
    const val = productForm.customLabelInput.trim();
    if (val && !productForm.labels.includes(val)) {
      setProductForm(prev => ({
        ...prev,
        labels: [...prev.labels, val],
        customLabelInput: ""
      }));
    }
  };

  // Create or Update Product
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.categoryId) {
      customAlert("Campos Incompletos", "Por favor proporcione el nombre y la categoría.");
      return;
    }

    const payload = {
      name: productForm.name,
      description: productForm.description,
      images: productForm.images,
      categoryId: productForm.categoryId,
      stock: Number(productForm.stock),
      regularPrice: Number(productForm.regularPrice),
      discountPercent: Number(productForm.discountPercent),
      salePrice: Number(productForm.salePrice),
      labels: productForm.labels,
      launchDate: productForm.isScheduled && productForm.launchDate ? new Date(productForm.launchDate).toISOString() : null,
      isScheduled: productForm.isScheduled
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddingProduct(false);
        setEditingProduct(null);
        fetchProducts();
        resetProductForm();
      } else {
        const errorData = await res.json();
        customAlert("Error al Guardar", errorData.error || "Ocurrió un error al guardar el producto.");
      }
    } catch (err) {
      console.error("Error saving product:", err);
      customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      images: [],
      categoryId: "",
      stock: 5,
      regularPrice: 1000,
      discountPercent: 0,
      salePrice: 1000,
      labels: [],
      customLabelInput: "",
      launchDate: "",
      isScheduled: false
    });
  };

  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      description: prod.description,
      images: prod.images,
      categoryId: prod.categoryId,
      stock: prod.stock,
      regularPrice: prod.regularPrice,
      discountPercent: prod.discountPercent,
      salePrice: prod.salePrice,
      labels: prod.labels,
      customLabelInput: "",
      launchDate: prod.launchDate ? formatToLocalDateTimeLocal(prod.launchDate) : "",
      isScheduled: prod.isScheduled
    });
    setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    customConfirm(
      "Eliminar Pieza",
      "¿Está seguro de que desea eliminar permanentemente esta pieza del catálogo de lujo?",
      async () => {
        try {
          const res = await fetch(`/api/products/${id}`, {
            method: "DELETE",
            headers: getAuthHeader()
          });
          if (res.ok) {
            fetchProducts();
            fetchStats();
          } else {
            const errorData = await res.json();
            customAlert("Error al Eliminar", errorData.error || "Ocurrió un error al eliminar el producto.");
          }
        } catch (err) {
          console.error("Error deleting product:", err);
          customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
        }
      }
    );
  };

  // Category Operations
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    try {
      const url = categoryEditId ? `/api/categories/${categoryEditId}` : "/api/categories";
      const method = categoryEditId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify(categoryForm)
      });

      if (res.ok) {
        setCategoryForm({ name: "", description: "" });
        setCategoryEditId(null);
        fetchCategories();
      }
    } catch (err) {
      console.error("Error saving category:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    customConfirm(
      "Eliminar Categoría",
      "Al eliminar esta categoría, las piezas asociadas se marcarán 'Sin Categoría'. ¿Desea continuar?",
      async () => {
        try {
          const res = await fetch(`/api/categories/${id}`, {
            method: "DELETE",
            headers: getAuthHeader()
          });
          if (res.ok) {
            fetchCategories();
            fetchProducts();
          } else {
            const errorData = await res.json();
            customAlert("Error al Eliminar", errorData.error || "No se pudo eliminar la categoría.");
          }
        } catch (err) {
          console.error("Error deleting category:", err);
          customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
        }
      }
    );
  };

  // Collection Handlers
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionForm.name || !collectionForm.launchDate) {
      customAlert("Campos Incompletos", "Por favor proporcione el nombre y la fecha de lanzamiento para la colección.");
      return;
    }

    const payload = {
      name: collectionForm.name,
      launchDate: collectionForm.launchDate ? new Date(collectionForm.launchDate).toISOString() : "",
      coverImage: collectionForm.coverImage
    };

    try {
      const url = editingCollection ? `/api/collections/${editingCollection.id}` : "/api/collections";
      const method = editingCollection ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAddingCollection(false);
        setEditingCollection(null);
        setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false });
        fetchCollections();
        
        if (collectionForm.notifySubscribers && newsletterSubscriptions.length > 0) {
          customAlert(
            "Boletín Programado", 
            `Se ha programado el envío automático de notificaciones a ${newsletterSubscriptions.length} suscriptores del boletín privado para el lanzamiento de "${payload.name}".`
          );
        }
      } else {
        const errorData = await res.json();
        customAlert("Error al Guardar", errorData.error || "Ocurrió un error al guardar la colección.");
      }
    } catch (err) {
      console.error("Error saving collection:", err);
      customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
    }
  };

  const startEditCollection = (coll: Collection) => {
    setEditingCollection(coll);
    setCollectionForm({
      name: coll.name,
      launchDate: coll.launchDate ? formatToLocalDateTimeLocal(coll.launchDate) : "",
      coverImage: coll.coverImage,
      notifySubscribers: false
    });
    setIsAddingCollection(true);
  };

  const handleDeleteCollection = async (id: string) => {
    customConfirm(
      "Eliminar Colección",
      "¿Está seguro de que desea eliminar permanentemente esta colección? Esta acción no se puede deshacer.",
      async () => {
        try {
          const res = await fetch(`/api/collections/${id}`, {
            method: "DELETE",
            headers: getAuthHeader()
          });
          if (res.ok) {
            fetchCollections();
          } else {
            const data = await res.json();
            customAlert("Error al Eliminar", data.error || "No se pudo eliminar la colección.");
          }
        } catch (err) {
          console.error("Error deleting collection:", err);
          customAlert("Error de Conexión", "No se pudo conectar con el servidor.");
        }
      }
    );
  };

  const handleCollectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      try {
        const response = await fetch("/api/products/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify({
            fileData: base64data,
            filename: file.name
          })
        });
        const result = await response.json();
        if (result.success) {
          setCollectionForm(prev => ({
            ...prev,
            coverImage: result.imageUrl
          }));
        } else {
          customAlert("Error de Subida", result.error || "No se pudo subir la imagen.");
        }
      } catch (error) {
        console.error("Error upload file:", error);
        customAlert("Error", "Error de conexión al subir la imagen.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter Catalog logic
  const filteredProducts = products.filter(p => {
    // Search query match
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter match
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory || 
      (selectedCategory === "new-collection" && p.labels.includes("Nuevo")) ||
      (selectedCategory === "limited-edition" && p.labels.includes("Edición Limitada")) ||
      (selectedCategory === "luxury-sets" && p.categoryName === "Juegos de Lujo");

    // Price range match
    const matchesPrice = p.salePrice <= priceRange;

    // Badge filters
    const matchesDiscount = !filterDiscounted || p.discountPercent > 0;
    const matchesSpecial = !filterSpecial || p.labels.includes("Edición Especial") || p.labels.includes("Edición Limitada") || p.labels.includes("Exclusive") || p.labels.includes("Exclusivo");
    const matchesNew = !filterNew || p.labels.includes("Nuevo") || p.labels.includes("New");

    return matchesSearch && matchesCategory && matchesPrice && matchesDiscount && matchesSpecial && matchesNew;
  });

  // Calculate related products for modal view
  const getRelatedProducts = (current: Product) => {
    return products
      .filter(p => p.id !== current.id && (p.categoryId === current.categoryId || p.labels.some(l => current.labels.includes(l))))
      .slice(0, 3);
  };

  // Rich Text Editor Helpers: inserts tag into description field
  const insertRichTextTag = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById("prod-desc-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setProductForm(prev => ({ ...prev, description: newText }));

    // Refocus textarea and place selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E5E5E5] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
      
      {/* COUNTDOWN ANNOUNCEMENT BAR FOR UPCOMING COLLECTION */}
      {upcomingCollection && timeLeft && (
        <div className="bg-[#050505] border-b border-[#D4AF37]/40 text-xs py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 font-mono text-center relative overflow-hidden" id="countdown-banner">
          <div className="absolute inset-0 bg-[#D4AF37]/5 animate-pulse pointer-events-none" />
          <span className="text-neutral-400 uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Próximo Lanzamiento Exclusivo: <strong className="text-white font-serif tracking-normal font-medium">{upcomingCollection.name}</strong>
          </span>
          <span className="text-[#D4AF37] font-bold text-sm tracking-wider drop-shadow-[0_0_8px_rgba(212,175,55,0.3)] font-mono">
            {timeLeft.days.toString().padStart(2, "0")}d : {timeLeft.hours.toString().padStart(2, "0")}h : {timeLeft.minutes.toString().padStart(2, "0")}m : {timeLeft.seconds.toString().padStart(2, "0")}s
          </span>
        </div>
      )}

      {/* HEADER / NAVIGATION BAR */}
      <nav className="h-20 border-b border-[#D4AF37]/25 flex items-center justify-between px-6 md:px-12 bg-[#050505] sticky top-0 z-40" id="main-navigation">
        <div className="hidden md:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-400">
          <a href="#catalogo" onClick={() => { setCurrentView("catalog"); setSelectedCategory("all"); }} className="hover:text-[#D4AF37] transition-colors">Colecciones</a>
          <a href="#nosotros" onClick={() => { setCurrentView("catalog"); }} className="hover:text-[#D4AF37] transition-colors">Artesanía</a>
          <a href="#contacto" onClick={() => { setCurrentView("catalog"); }} className="hover:text-[#D4AF37] transition-colors">Contacto</a>
        </div>

        {/* Brand Logo & Title */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => { setCurrentView("catalog"); setSelectedCategory("all"); }}
          id="nav-brand-container"
        >
          <BrandLogo size="sm" animated={true} />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[15px] uppercase tracking-[0.35em] font-serif font-bold text-[#D4AF37] group-hover:text-white transition-colors">
              Joyería Patuna
            </span>
            <span className="text-[8px] uppercase tracking-[0.25em] text-neutral-500">
              HAUTE JOAILLERIE
            </span>
          </div>
        </div>

        {/* Desktop Admin Link */}
        <div className="hidden md:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-400 items-center">
          <a href="#catalogo" onClick={() => { setCurrentView("catalog"); }} className="hover:text-[#D4AF37] transition-colors">Catálogo</a>
          {authStatus.authenticated ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView("admin")} 
                className={`flex items-center gap-1.5 px-3 py-1.5 border border-[#D4AF37]/50 rounded-sm text-[#D4AF37] font-medium transition-all hover:bg-[#D4AF37]/10 ${currentView === "admin" ? "bg-[#D4AF37]/10" : ""}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Consola
              </button>
              <button onClick={handleLogout} title="Cerrar Sesión" className="p-1.5 hover:text-[#FF1744] transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCurrentView("auth")} 
              className="flex items-center gap-1 text-[#D4AF37] font-bold hover:underline underline-offset-4"
              id="admin-portal-link"
            >
              <Lock className="w-3.5 h-3.5" />
              Bóveda Admin
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-4">
          {authStatus.authenticated && (
            <button onClick={() => setCurrentView("admin")} className="text-[#D4AF37] p-1">
              <LayoutDashboard className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="text-neutral-300 p-2 hover:text-[#D4AF37]"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile drop-down Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden w-full bg-[#0d0d0d] border-b border-[#D4AF37]/25 absolute top-20 left-0 z-50 p-6 flex flex-col gap-5 text-center text-sm uppercase tracking-widest font-serif"
            id="mobile-nav-menu"
          >
            <a 
              href="#catalogo" 
              onClick={() => { setMobileMenuOpen(false); setCurrentView("catalog"); setSelectedCategory("all"); }} 
              className="py-2 hover:text-[#D4AF37]"
            >
              Colecciones
            </a>
            <a 
              href="#nosotros" 
              onClick={() => { setMobileMenuOpen(false); setCurrentView("catalog"); }} 
              className="py-2 hover:text-[#D4AF37]"
            >
              Artesanía
            </a>
            <a 
              href="#contacto" 
              onClick={() => { setMobileMenuOpen(false); setCurrentView("catalog"); }} 
              className="py-2 hover:text-[#D4AF37]"
            >
              Contacto
            </a>
            <hr className="border-neutral-800" />
            {authStatus.authenticated ? (
              <div className="flex flex-col gap-4 items-center">
                <button 
                  onClick={() => { setMobileMenuOpen(false); setCurrentView("admin"); }} 
                  className="px-4 py-2 border border-[#D4AF37] text-[#D4AF37] rounded-sm w-full"
                >
                  Dashboard Admin
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }} 
                  className="text-[#FF1744] py-2 flex items-center gap-2 justify-center"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setMobileMenuOpen(false); setCurrentView("auth"); }} 
                className="py-2 text-[#D4AF37] font-bold flex items-center gap-2 justify-center"
              >
                <Lock className="w-4 h-4" /> Bóveda Admin
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-grow">
        
        {/* VIEW 1: PUBLIC LUXURY CATALOG */}
        {currentView === "catalog" && (
          <div id="catalog-view" className="animate-fade-in">
            
            {/* HERO SECTION - Inspired by Geometric Balance Layout */}
            <section className="relative min-h-[70vh] flex flex-col justify-center border-b border-[#D4AF37]/20 p-6 md:p-16 overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
              
              {/* Luxury Geometric Backdrops */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#D4AF37]/5 rounded-full pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-dashed border-[#D4AF37]/10 rounded-full pointer-events-none" />
              <div className="absolute -right-24 top-12 w-96 h-96 border border-[#D4AF37]/5 pointer-events-none transform rotate-45" />

              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                
                {/* Hero left text */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <span className="text-[#D4AF37] text-xs font-mono uppercase tracking-[0.5em] block mb-3">
                      ORFEBRERÍA DE ALTA GAMA &mdash; COLECCIÓN REALE
                    </span>
                    <h1 className="text-4xl md:text-7xl font-serif font-light leading-none tracking-tight text-white">
                      Joyería <br/>
                      <span className="italic font-normal gold-gradient-text">Patuna</span>
                    </h1>
                  </div>
                  
                  <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-xl font-light">
                    Inspirada en el porte regio del pato dorado, nuestra firma esculpe piezas sublimes que fusionan la simetría perfecta con el oro de 24 quilates. Cada creación de Joyería Patuna relata una historia de opulencia, precisión y maestría artesanal única.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <a 
                      href="#catalogo" 
                      onClick={() => setSelectedCategory("all")}
                      className="px-8 py-3 bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-[0.25em] hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all rounded-sm flex items-center gap-2"
                    >
                      Explorar Colección <ArrowUpRight className="w-4 h-4" />
                    </a>
                    <a 
                      href="#nosotros"
                      className="px-8 py-3 border border-neutral-700 hover:border-[#D4AF37] text-white text-xs uppercase tracking-[0.25em] hover:bg-neutral-900/40 transition-all rounded-sm"
                    >
                      Nuestra Filosofía
                    </a>
                  </div>
                </div>

                {/* Hero right featured piece - Golden Duck Symbolism */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative p-8 bg-neutral-900/30 border border-[#D4AF37]/15 rounded-sm max-w-sm w-full text-center hover:border-[#D4AF37]/35 transition-all duration-700">
                    <BrandLogo size="xl" animated={true} className="mb-6" />
                    
                    <div className="border-t border-[#D4AF37]/20 pt-4 mt-2">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Sello de Autenticidad</span>
                      <p className="font-serif italic text-[#D4AF37] text-lg mt-1">"Elegancia Esculpida en Oro"</p>
                      <p className="text-[11px] text-neutral-400 font-light max-w-xs mx-auto mt-2 leading-relaxed">
                        Todas nuestras creaciones cuentan con el icónico distintivo en relieve de nuestra mascota áurea.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* LARGE HERO COUNTDOWN SECTION FOR UPCOMING COLLECTION */}
            {upcomingCollection && timeLeft && (
              <section className="relative bg-black border-y border-[#D4AF37]/30 py-16 px-6 md:px-16 overflow-hidden flex flex-col items-center justify-center text-center" id="home-large-countdown">
                {/* Background ambient gold glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
                
                {upcomingCollection.coverImage && (
                  <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <img src={upcomingCollection.coverImage} alt="" className="w-full h-full object-cover filter grayscale blur-xs scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
                  </div>
                )}

                <div className="max-w-4xl mx-auto w-full relative z-10 space-y-8">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                      <span className="text-[10px] text-[#D4AF37] font-mono uppercase tracking-[0.25em] font-bold">Lanzamiento de Alta Gama Exclusivo</span>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-serif font-light text-white leading-tight">
                      Próxima Colección Privada <br />
                      <span className="italic font-normal gold-gradient-text drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">{upcomingCollection.name}</span>
                    </h2>
                    <p className="text-neutral-400 text-xs md:text-sm uppercase tracking-widest font-mono max-w-xl mx-auto">
                      La cuenta atrás ha comenzado. El catálogo privado se revelará automáticamente al expirar el tiempo.
                    </p>
                  </div>

                  {/* Huge Clock Numbers */}
                  <div className="grid grid-cols-4 gap-3 md:gap-6 max-w-2xl mx-auto font-mono text-white">
                    <div className="bg-[#0c0c0c]/90 border border-[#D4AF37]/30 p-4 md:p-6 rounded-sm relative group overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#D4AF37] scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="block text-4xl md:text-7xl font-light text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        {timeLeft.days.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[9px] md:text-xs uppercase text-neutral-500 tracking-[0.2em] block mt-1 font-sans">Días</span>
                    </div>
                    
                    <div className="bg-[#0c0c0c]/90 border border-[#D4AF37]/30 p-4 md:p-6 rounded-sm relative group overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#D4AF37] scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="block text-4xl md:text-7xl font-light text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        {timeLeft.hours.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[9px] md:text-xs uppercase text-neutral-500 tracking-[0.2em] block mt-1 font-sans">Horas</span>
                    </div>

                    <div className="bg-[#0c0c0c]/90 border border-[#D4AF37]/30 p-4 md:p-6 rounded-sm relative group overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#D4AF37] scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="block text-4xl md:text-7xl font-light text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        {timeLeft.minutes.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[9px] md:text-xs uppercase text-neutral-500 tracking-[0.2em] block mt-1 font-sans">Minutos</span>
                    </div>

                    <div className="bg-[#0c0c0c]/90 border border-[#D4AF37]/30 p-4 md:p-6 rounded-sm relative group overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#D4AF37] scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="block text-4xl md:text-7xl font-light text-[#D4AF37] tracking-tight drop-shadow-[0_0_15px_rgba(212,175,55,0.35)] animate-pulse">
                        {timeLeft.seconds.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[9px] md:text-xs uppercase text-neutral-500 tracking-[0.2em] block mt-1 font-sans">Segundos</span>
                    </div>
                  </div>

                  {/* Subscriptions in the counter */}
                  <div className="bg-neutral-950/80 max-w-xl mx-auto p-6 border border-neutral-900 rounded-sm space-y-4">
                    <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                      Forme parte del círculo selecto de Joyería Patuna. Los miembros suscritos al boletín privado recibirán un enlace de acceso prioritario 15 minutos antes de la inauguración oficial.
                    </p>
                    
                    <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-md mx-auto">
                      <input 
                        type="email"
                        required
                        placeholder="Ingrese su correo de invitación..."
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        className="flex-grow bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-4 py-2.5 text-xs text-white outline-none font-sans"
                      />
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-[#D4AF37] text-black hover:bg-white text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5"
                      >
                        Suscribirse <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}

            {/* SEED PROMOTION STRIP */}
            <section className="bg-[#0b0b0b] border-b border-[#D4AF37]/10 py-6 px-10">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs tracking-widest uppercase text-neutral-400">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                  <span>Envío Global Asegurado Gratuito</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                  <span>Atención Personalizada de Alta Joyería</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                  <span>Certificación Gemológica de Autenticidad</span>
                </div>
              </div>
            </section>

            {/* PRÓXIMOS LANZAMIENTOS (COLECCIONES EXCLUSIVAS CON CUENTA REGRESIVA) */}
            {collections.some(c => new Date(c.launchDate) > new Date()) && (
              <section className="bg-gradient-to-b from-neutral-950 to-[#050505] border-b border-neutral-900 py-16 px-4 md:px-12" id="proximas-colecciones">
                <div className="max-w-7xl mx-auto space-y-10">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[#D4AF37] text-xs font-mono uppercase tracking-[0.3em] mb-2">Próximamente / Alta Gama</span>
                    <h2 className="text-3xl md:text-5xl font-serif font-light text-white italic">Próximas Colecciones Exclusivas</h2>
                    <div className="w-20 h-[1px] bg-[#D4AF37] mt-4"></div>
                    <p className="text-neutral-500 text-xs uppercase tracking-widest font-mono mt-4 max-w-md">
                      Suscríbase al boletín privado para recibir acceso prioritario y notificaciones inmediatas al instante del lanzamiento.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {collections
                      .filter(c => new Date(c.launchDate) > new Date())
                      .sort((a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime())
                      .map(col => {
                        const launchDateObj = new Date(col.launchDate);
                        // Local countdown calculation (updates every second via parent render)
                        const diff = launchDateObj.getTime() - new Date().getTime();
                        const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                        const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                        const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
                        const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

                        return (
                          <div 
                            key={col.id} 
                            className="bg-neutral-900/40 border border-neutral-800 rounded-sm overflow-hidden flex flex-col justify-between group hover:border-[#D4AF37]/40 transition-all duration-500"
                            style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)" }}
                          >
                            <div className="relative h-64 bg-black overflow-hidden border-b border-neutral-900">
                              {col.coverImage ? (
                                <img 
                                  src={col.coverImage} 
                                  alt={col.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700">
                                  <ImageIcon className="w-12 h-12 stroke-1 mb-2" />
                                  <span className="text-[10px] uppercase tracking-widest">Sin Portada</span>
                                </div>
                              )}
                              
                              {/* Overlay Badge */}
                              <div className="absolute top-4 right-4 bg-black/80 border border-[#D4AF37]/30 px-3 py-1 rounded-sm">
                                <span className="text-[9px] text-[#D4AF37] font-mono uppercase tracking-widest font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} /> Próximamente
                                </span>
                              </div>
                            </div>

                            <div className="p-6 space-y-4">
                              <div className="space-y-1">
                                <h3 className="text-xl font-serif text-white font-light group-hover:text-[#D4AF37] transition-colors">{col.name}</h3>
                                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                                  Lanzamiento: {launchDateObj.toLocaleDateString("es-ES")} a las {launchDateObj.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>

                              {/* Countdown display */}
                              <div className="bg-black/60 border border-neutral-800 rounded-sm p-4 text-center space-y-1">
                                <span className="text-[8px] text-neutral-500 uppercase tracking-widest font-mono">Cuenta Regresiva Privada</span>
                                <div className="grid grid-cols-4 gap-2 text-white font-mono">
                                  <div className="bg-neutral-950 p-2 rounded-sm border border-neutral-900">
                                    <span className="block text-lg font-bold text-[#D4AF37]">{days.toString().padStart(2, "0")}</span>
                                    <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Días</span>
                                  </div>
                                  <div className="bg-neutral-950 p-2 rounded-sm border border-neutral-900">
                                    <span className="block text-lg font-bold text-[#D4AF37]">{hours.toString().padStart(2, "0")}</span>
                                    <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Horas</span>
                                  </div>
                                  <div className="bg-neutral-950 p-2 rounded-sm border border-neutral-900">
                                    <span className="block text-lg font-bold text-[#D4AF37]">{minutes.toString().padStart(2, "0")}</span>
                                    <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Min</span>
                                  </div>
                                  <div className="bg-neutral-950 p-2 rounded-sm border border-neutral-900">
                                    <span className="block text-lg font-bold text-[#D4AF37]">{seconds.toString().padStart(2, "0")}</span>
                                    <span className="text-[8px] uppercase text-neutral-500 tracking-wider">Seg</span>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Subscribe call-to-action */}
                              <div className="pt-2">
                                <a 
                                  href="#boletin"
                                  className="w-full block py-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] text-center text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest transition-all rounded-sm"
                                >
                                  Suscribirse para Acceso Prioritario
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </section>
            )}

            {/* PRODUCT CATALOG SECTIONS (GRID & FILTERS) */}
            <section className="max-w-7xl mx-auto px-4 md:px-12 py-16" id="catalogo">
              
              {/* Category selector row */}
              <div className="flex flex-col items-center text-center mb-12">
                <span className="text-[#D4AF37] text-xs font-mono uppercase tracking-[0.3em] mb-2">Exclusividad Hecha a Mano</span>
                <h2 className="text-3xl md:text-5xl font-serif font-light text-white italic">Nuestro Catálogo Exclusivo</h2>
                <div className="w-20 h-[1px] bg-[#D4AF37] mt-4"></div>
              </div>

              {/* Grid of Categories Navigation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 mb-12" id="categories-navigation">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`py-3 px-2 border text-center transition-all ${selectedCategory === "all" ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold" : "bg-[#0d0d0d] border-neutral-800 text-neutral-400 hover:text-white hover:border-[#D4AF37]/50"}`}
                >
                  <span className="text-[10px] uppercase tracking-widest block">Todas</span>
                </button>

                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`py-3 px-2 border text-center transition-all ${selectedCategory === cat.id ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold" : "bg-[#0d0d0d] border-neutral-800 text-neutral-400 hover:text-white hover:border-[#D4AF37]/50"}`}
                  >
                    <span className="text-[10px] uppercase tracking-widest block truncate" title={cat.name}>{cat.name}</span>
                  </button>
                ))}

                {/* Built-in Virtual Filter categories */}
                <button
                  onClick={() => setSelectedCategory("new-collection")}
                  className={`py-3 px-2 border text-center transition-all ${selectedCategory === "new-collection" ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold" : "bg-[#0d0d0d] border-neutral-800 text-neutral-400 hover:text-white hover:border-[#D4AF37]/50"}`}
                >
                  <span className="text-[10px] uppercase tracking-widest block truncate">Novedades</span>
                </button>
                <button
                  onClick={() => setSelectedCategory("limited-edition")}
                  className={`py-3 px-2 border text-center transition-all ${selectedCategory === "limited-edition" ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold" : "bg-[#0d0d0d] border-neutral-800 text-neutral-400 hover:text-white hover:border-[#D4AF37]/50"}`}
                >
                  <span className="text-[10px] uppercase tracking-widest block truncate">Edición Limitada</span>
                </button>
              </div>

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="bg-[#0b0b0b] border border-neutral-800 p-6 rounded-sm mb-8 space-y-6" id="search-filter-panel">
                
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  
                  {/* Search Bar */}
                  <div className="relative w-full md:max-w-md">
                    <input 
                      type="text"
                      placeholder="Buscar piezas, gemas, colecciones..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] px-4 py-2.5 pl-11 text-sm text-white rounded-sm outline-none transition-all placeholder:text-neutral-600"
                    />
                    <Search className="w-4 h-4 text-neutral-600 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Filter Info */}
                  <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-500 font-mono">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Filtrando {filteredProducts.length} de {products.length} piezas</span>
                  </div>

                </div>

                {/* Sub Filters row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-neutral-900">
                  
                  {/* Max Price Range Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs uppercase tracking-wider text-neutral-400">
                      <span>Precio Máximo:</span>
                      <span className="text-[#D4AF37] font-semibold">${priceRange.toLocaleString("es-MX")} MXN</span>
                    </div>
                    <input 
                      type="range"
                      min="500"
                      max="40000"
                      step="500"
                      value={priceRange}
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      className="w-full accent-[#D4AF37] bg-neutral-800 h-1 rounded-sm appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Checkbox filter 1: On Sale / Discount */}
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={filterDiscounted}
                        onChange={(e) => setFilterDiscounted(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border border-neutral-700 rounded-sm bg-[#050505] peer-checked:bg-[#D4AF37] peer-checked:border-[#D4AF37] flex items-center justify-center transition-all">
                        {filterDiscounted && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <span className="ml-3 text-xs uppercase tracking-wider text-neutral-400 hover:text-white">Con Descuento</span>
                    </label>
                  </div>

                  {/* Checkbox filter 2: Limited / Special */}
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={filterSpecial}
                        onChange={(e) => setFilterSpecial(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border border-neutral-700 rounded-sm bg-[#050505] peer-checked:bg-[#D4AF37] peer-checked:border-[#D4AF37] flex items-center justify-center transition-all">
                        {filterSpecial && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <span className="ml-3 text-xs uppercase tracking-wider text-neutral-400 hover:text-white">Ediciones Exclusivas</span>
                    </label>
                  </div>

                  {/* Checkbox filter 3: New Arrivals */}
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={filterNew}
                        onChange={(e) => setFilterNew(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 border border-neutral-700 rounded-sm bg-[#050505] peer-checked:bg-[#D4AF37] peer-checked:border-[#D4AF37] flex items-center justify-center transition-all">
                        {filterNew && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <span className="ml-3 text-xs uppercase tracking-wider text-neutral-400 hover:text-white">Piezas Nuevas</span>
                    </label>
                  </div>

                </div>

              </div>

              {/* PRODUCT CATALOG GRID */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-neutral-800 rounded-sm">
                  <Sparkles className="w-8 h-8 text-[#D4AF37]/40 mx-auto mb-4" />
                  <p className="text-neutral-500 font-serif italic text-lg">Ninguna pieza coincide con los criterios de filtrado actuales.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setPriceRange(30000);
                      setFilterDiscounted(false);
                      setFilterSpecial(false);
                      setFilterNew(false);
                    }}
                    className="mt-4 text-[#D4AF37] underline text-xs uppercase tracking-widest hover:text-white"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" id="catalog-products-grid">
                  {filteredProducts.map(product => {
                    const hasDiscount = product.discountPercent > 0;
                    return (
                      <motion.div
                        key={product.id}
                        layoutId={`product-card-${product.id}`}
                        onClick={() => {
                          setSelectedProduct(product);
                          setDetailImageIdx(0);
                        }}
                        className="bg-neutral-950/80 border border-neutral-900 rounded-sm hover:border-[#D4AF37]/50 group cursor-pointer transition-all duration-500 overflow-hidden relative flex flex-col justify-between"
                        style={{ boxShadow: "0 4px 30px rgba(0, 0, 0, 0.4)" }}
                      >
                        {/* Labels / Badges absolute on product */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                          {product.labels.map((lbl, idx) => (
                            <span 
                              key={idx} 
                              className={`px-2.5 py-1 text-[8px] uppercase tracking-widest font-semibold rounded-sm ${
                                lbl === "Nuevo" || lbl === "New" ? "bg-[#D4AF37] text-black" :
                                lbl === "Edición Limitada" || lbl === "Limited Edition" ? "bg-red-950 text-red-200 border border-red-800" :
                                "bg-neutral-900 text-[#D4AF37] border border-[#D4AF37]/30"
                              }`}
                            >
                              {lbl}
                            </span>
                          ))}
                          
                          {/* Discount badge */}
                          {hasDiscount && (
                            <span className="px-2.5 py-1 text-[8px] uppercase tracking-widest font-bold bg-[#FF1744] text-white rounded-sm">
                              -{product.discountPercent}%
                            </span>
                          )}
                        </div>

                        {/* Product Image Stage */}
                        <div className="h-80 w-full bg-[#0a0a0a] flex items-center justify-center p-4 border-b border-neutral-900 relative overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.name} 
                              className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-700"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-neutral-700 flex flex-col items-center gap-2">
                              <ImageIcon className="w-12 h-12 stroke-1" />
                              <span className="text-[10px] tracking-widest uppercase">Sin Imagen</span>
                            </div>
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                            <span className="px-5 py-2 border border-[#D4AF37] text-[#D4AF37] text-[10px] uppercase tracking-[0.2em] bg-black/80 rounded-sm">
                              Ver Detalles Elegantes
                            </span>
                          </div>
                        </div>

                        {/* Product Metadata info */}
                        <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                          <div>
                            <span className="text-[#D4AF37] text-[9px] uppercase tracking-[0.3em] font-mono block">
                              {product.categoryName}
                            </span>
                            <h3 className="text-lg font-serif font-light text-white group-hover:text-[#D4AF37] transition-colors mt-1">
                              {product.name}
                            </h3>
                            <p className="text-neutral-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                              {product.description.replace(/<[^>]*>/g, "")}
                            </p>
                          </div>

                          <div className="border-t border-neutral-900/80 pt-4 flex items-center justify-between">
                            <div>
                              {hasDiscount ? (
                                <div className="space-y-0.5">
                                  <span className="text-xs text-neutral-500 line-through block">
                                    ${product.regularPrice.toLocaleString("es-MX")} MXN
                                  </span>
                                  <span className="text-lg font-serif text-[#D4AF37] font-semibold">
                                    ${product.salePrice.toLocaleString("es-MX")} MXN
                                  </span>
                                </div>
                              ) : (
                                <span className="text-lg font-serif text-[#D4AF37] font-semibold">
                                  ${product.regularPrice.toLocaleString("es-MX")} MXN
                                </span>
                              )}
                            </div>

                            <div>
                              {product.stock <= 0 ? (
                                <span className="text-[9px] text-red-500 uppercase tracking-widest font-semibold border border-red-950 px-2 py-0.5 bg-red-950/20">Agotado</span>
                              ) : product.stock <= 2 ? (
                                <span className="text-[9px] text-[#FF6D00] uppercase tracking-widest font-semibold border border-orange-950 px-2 py-0.5 bg-orange-950/20">Últimas {product.stock} piezas</span>
                              ) : (
                                <span className="text-[9px] text-neutral-400 uppercase tracking-widest">Disponible</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}

            </section>

            {/* ARTISAN / VALUE PROP SECTION */}
            <section className="bg-gradient-to-b from-[#050505] to-[#0a0a0a] border-t border-[#D4AF37]/15 py-20 px-6 md:px-12" id="nosotros">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                
                {/* Left graphics */}
                <div className="relative border border-[#D4AF37]/20 p-8 md:p-12 bg-neutral-950">
                  <div className="absolute top-4 left-4 text-[#D4AF37] text-xs font-mono tracking-widest uppercase">
                    PROCESO PATUNA
                  </div>
                  <h3 className="text-3xl font-serif text-white mt-4 italic mb-6">"El Arte de la Orfebrería Perfecta"</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">
                    Todas las piezas mostradas en nuestra colección pasan por rigurosos procesos de tallado y pulido en nuestro taller oficial. Inspirado por la elegancia geométrica de nuestro pato dorado, cada engaste de diamante o zafiro se realiza bajo microscopios de alta definición para asegurar una simetría y un brillo sin paralelos en el mercado de alta gama.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 border-t border-[#D4AF37]/15 pt-6 text-center">
                    <div>
                      <span className="text-2xl font-serif text-[#D4AF37] block">100%</span>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Oro Ético Certificado</span>
                    </div>
                    <div>
                      <span className="text-2xl font-serif text-[#D4AF37] block">24k</span>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Pureza de Metal</span>
                    </div>
                    <div>
                      <span className="text-2xl font-serif text-[#D4AF37] block">Hand</span>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Hecho a Mano</span>
                    </div>
                  </div>
                </div>

                {/* Right quotes / layout */}
                <div className="space-y-8 lg:pl-10">
                  <span className="text-[#D4AF37] text-xs uppercase tracking-widest font-mono">El Legado del Pato Dorado</span>
                  <h3 className="text-4xl font-serif text-white font-light">Elegancia Geométrica Para Almas Exigentes</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Creemos que las joyas son más que simples ornamentos; son legados físicos de momentos eternos. Nuestro logotipo, que representa al pato dorado coronado, simboliza la lealtad, la pureza y la transformación de la materia en belleza imperecedera.
                  </p>
                  <blockquote className="border-l-2 border-[#D4AF37] pl-4 italic text-neutral-300 text-sm font-serif">
                    "La simetría es la estética de los dioses, y el oro es su lenguaje. En Joyería Patuna creamos el puente entre ambos."
                  </blockquote>
                </div>

              </div>
            </section>

            {/* NEWSLETTER SUBSCRIPTION */}
            <section className="border-t border-[#D4AF37]/15 bg-[#080808] py-16 px-6" id="contacto">
              <div className="max-w-3xl mx-auto text-center space-y-6">
                <Mail className="w-8 h-8 text-[#D4AF37] mx-auto opacity-80" />
                <h3 className="text-2xl md:text-3xl font-serif text-white">Suscripción a la Bóveda de Novedades</h3>
                <p className="text-neutral-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed uppercase tracking-widest font-light">
                  Reciba invitaciones exclusivas a subastas privadas, lanzamientos limitados antes de su publicación general y el catálogo estacional de Joyería Patuna.
                </p>

                {newsletterStatus === "success" ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-emerald-950/30 border border-emerald-500 text-emerald-300 text-xs tracking-widest uppercase rounded-sm"
                  >
                    ✦ ¡Bienvenido a la Bóveda Privada! Le enviaremos un correo de confirmación de alta gama.
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <form 
                      onSubmit={handleNewsletterSubmit}
                      className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                    >
                      <input 
                        type="email"
                        required
                        placeholder="Su correo electrónico de contacto"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        className="flex-grow bg-black border border-neutral-800 text-white text-xs px-4 py-3 outline-none focus:border-[#D4AF37] rounded-sm tracking-wide"
                      />
                      <button 
                        type="submit"
                        className="px-6 py-3 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-all rounded-sm flex items-center justify-center gap-1.5"
                      >
                        Suscribirse <Send className="w-3 h-3" />
                      </button>
                    </form>
                    {newsletterError && (
                      <p className="text-red-400 text-xs mt-1 uppercase tracking-widest">{newsletterError}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* VIEW 2: THE SECRET COLOR PATTERN AUTH */}
        {currentView === "auth" && (
          <div id="auth-view" className="max-w-md mx-auto my-16 px-6 py-12 bg-neutral-950 border border-[#D4AF37]/35 rounded-sm shadow-2xl relative" style={{ boxShadow: "0 0 40px rgba(212, 175, 55, 0.15)" }}>
            
            <div className="absolute top-4 right-4">
              <button onClick={() => setCurrentView("catalog")} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-8 space-y-3">
              <BrandLogo size="md" animated={true} className="mb-2" />
              <h2 className="text-xl font-serif text-white uppercase tracking-[0.25em]">Acceso Bóveda de Seguridad</h2>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">
                {!authStatus.setup ? "CONFIGURACIÓN INICIAL DEL PATRÓN DE COLORES" : "REPRODUZCA LA SECUENCIA DE COLORES SECRETA"}
              </p>
              
              {/* Dynamic steps for Setup */}
              {!authStatus.setup && (
                <div className="inline-block px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] tracking-widest uppercase font-semibold">
                  {setupStep === "choose" ? "Paso 1: Elija 4 colores" : "Paso 2: Confirme el patrón"}
                </div>
              )}
            </div>

            {/* Pattern Dots indicator */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((idx) => {
                const isSelected = patternInput.length > idx;
                const dotColor = isSelected ? patternInput[idx] : null;

                let bgClass = "bg-transparent border-neutral-700";
                if (dotColor === "yellow") bgClass = "bg-[#FFB000] border-[#FFB000] shadow-[0_0_8px_#FFB000]";
                if (dotColor === "orange") bgClass = "bg-[#FF6D00] border-[#FF6D00] shadow-[0_0_8px_#FF6D00]";
                if (dotColor === "blue") bgClass = "bg-[#2979FF] border-[#2979FF] shadow-[0_0_8px_#2979FF]";
                if (dotColor === "red") bgClass = "bg-[#FF1744] border-[#FF1744] shadow-[0_0_8px_#FF1744]";

                return (
                  <div 
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${bgClass}`}
                  />
                );
              })}
            </div>

            {/* Interactive Color Pad buttons */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => handleColorClick("yellow")}
                disabled={!!lockoutTimer}
                className="h-28 bg-[#FFB000] border-2 border-transparent hover:border-white transition-all active:scale-95 rounded-sm flex items-center justify-center text-black font-semibold text-xs tracking-widest uppercase opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                Amarillo
              </button>
              <button 
                onClick={() => handleColorClick("orange")}
                disabled={!!lockoutTimer}
                className="h-28 bg-[#FF6D00] border-2 border-transparent hover:border-white transition-all active:scale-95 rounded-sm flex items-center justify-center text-white font-semibold text-xs tracking-widest uppercase opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                Naranja
              </button>
              <button 
                onClick={() => handleColorClick("blue")}
                disabled={!!lockoutTimer}
                className="h-28 bg-[#2979FF] border-2 border-transparent hover:border-white transition-all active:scale-95 rounded-sm flex items-center justify-center text-white font-semibold text-xs tracking-widest uppercase opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                Azul
              </button>
              <button 
                onClick={() => handleColorClick("red")}
                disabled={!!lockoutTimer}
                className="h-28 bg-[#FF1744] border-2 border-transparent hover:border-white transition-all active:scale-95 rounded-sm flex items-center justify-center text-white font-semibold text-xs tracking-widest uppercase opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                Rojo
              </button>
            </div>

            {/* Error alerts and lockouts */}
            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-500 rounded-sm text-red-300 text-xs text-center mb-6">
                {authError}
              </div>
            )}

            {lockoutTimer !== null && (
              <div className="p-4 bg-orange-950/40 border border-orange-500 rounded-sm text-orange-300 text-xs text-center mb-6 font-mono">
                BÓVEDA BLOQUEADA. INTENTE EN: {lockoutTimer} SEGUNDOS
              </div>
            )}

            <div className="text-center">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
                Este sistema de bóveda no utiliza contraseñas alfanuméricas tradicionales. Protegido con algoritmo de auto-bloqueo anti fuerza bruta.
              </p>
              <button 
                onClick={() => setCurrentView("catalog")}
                className="mt-6 text-neutral-400 hover:text-white text-xs uppercase tracking-widest underline"
              >
                Volver al Catálogo Público
              </button>
            </div>

          </div>
        )}

        {/* VIEW 3: COMPREHENSIVE ADMINISTRATOR DASHBOARD */}
        {currentView === "admin" && (
          <div id="admin-view" className="p-6 md:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in">
            
            {/* Dashboard Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-900">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs text-neutral-400 uppercase tracking-widest font-mono">Panel Administrativo &mdash; Sesión Encriptada</span>
                </div>
                <h2 className="text-3xl font-serif text-white italic">Consola de Control Patuna</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => { resetProductForm(); setIsAddingProduct(true); }}
                  className="px-4 py-2 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nueva Pieza
                </button>
                <button 
                  onClick={() => { setEditingCollection(null); setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false }); setIsAddingCollection(true); }}
                  className="px-4 py-2 bg-neutral-900 border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#D4AF37] text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Crear Nueva Colección
                </button>
                <button 
                  onClick={() => setIsManagingCategories(true)}
                  className="px-4 py-2 border border-neutral-700 hover:border-[#D4AF37] text-white text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5"
                >
                  <FolderOpen className="w-4 h-4" /> Categorías ({categories.length})
                </button>
                <button 
                  onClick={() => setCurrentView("catalog")}
                  className="px-4 py-2 border border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider rounded-sm hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Home className="w-4 h-4" /> Ver Catálogo
                </button>
              </div>
            </div>

            {/* QUICK STATS INSIGHT PANEL */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="stats-dashboard-grid">
                
                <div className="bg-neutral-950 p-6 border border-neutral-900 rounded-sm space-y-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Total Piezas de Joyería</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-serif text-[#D4AF37]">{stats.totalProducts}</span>
                    <Package className="w-5 h-5 text-neutral-700" />
                  </div>
                  <span className="text-[9px] text-neutral-600 uppercase block">Disponibles en el Catálogo</span>
                </div>

                <div className="bg-neutral-950 p-6 border border-neutral-900 rounded-sm space-y-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Valor de Inventario</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-serif text-white">${stats.totalInventoryValue.toLocaleString("es-MX")} MXN</span>
                    <DollarSign className="w-5 h-5 text-neutral-700" />
                  </div>
                  <span className="text-[9px] text-neutral-600 uppercase block">Basado en precio de venta</span>
                </div>

                <div className="bg-neutral-950 p-6 border border-neutral-900 rounded-sm space-y-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Alertas Stock Crítico</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-3xl font-serif ${stats.lowStockCount > 0 ? "text-[#FF1744]" : "text-neutral-400"}`}>
                      {String(stats.lowStockCount).padStart(2, '0')}
                    </span>
                    <AlertTriangle className={`w-5 h-5 ${stats.lowStockCount > 0 ? "text-[#FF1744]" : "text-neutral-700"}`} />
                  </div>
                  {stats.lowStockCount > 0 ? (
                    <span className="text-[9px] text-[#FF1744] font-medium uppercase animate-pulse block">Piezas con ≤ 2 en existencia</span>
                  ) : (
                    <span className="text-[9px] text-neutral-600 uppercase block">Todo el inventario óptimo</span>
                  )}
                </div>

                <div className="bg-neutral-950 p-6 border border-neutral-900 rounded-sm space-y-2">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Lanzamientos Agendados</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-serif text-sky-400">
                      {stats.scheduledLaunches ? stats.scheduledLaunches.length : 0}
                    </span>
                    <Calendar className="w-5 h-5 text-neutral-700" />
                  </div>
                  <span className="text-[9px] text-neutral-600 uppercase block">Pendientes de visibilidad automática</span>
                </div>

              </div>
            )}

            {/* DETAILED LOW STOCK ALERT REVEALS */}
            {stats && stats.lowStockCount > 0 && (
              <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-[#FF1744] w-5 h-5 flex-shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-[#FF1744] uppercase tracking-wider block">ALERTA DE REABASTECIMIENTO</span>
                    <span className="text-neutral-300">
                      Los siguientes productos están a punto de agotarse: {stats.lowStockItems.map(p => `"${p.name}" (${p.stock} pzs)`).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULED LAUNCHES SCHEDULE CALENDAR */}
            {stats && stats.scheduledLaunches && stats.scheduledLaunches.length > 0 && (
              <div className="bg-neutral-950 border border-[#D4AF37]/20 p-6 rounded-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Cronograma de Lanzamientos de Alta Joyería</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.scheduledLaunches.map(launch => {
                    const lDate = new Date(launch.launchDate);
                    return (
                      <div key={launch.id} className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-sm text-xs space-y-1">
                        <span className="text-neutral-300 font-medium block truncate">{launch.name}</span>
                        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                          <span>Fecha: {lDate.toLocaleString("es-ES")}</span>
                          <span className="bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded-sm">Espera</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CORE MANAGE PRODUCTS CONTAINER */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-sm p-6 space-y-6">
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif text-white font-light">Todas las Piezas de Joyería</h3>
                <span className="text-xs font-mono text-neutral-500 uppercase">Total: {products.length} productos</span>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-800 rounded-sm">
                  <Package className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">Aún no se han añadido joyas al inventario.</p>
                  <button 
                    onClick={() => { resetProductForm(); setIsAddingProduct(true); }}
                    className="mt-4 text-[#D4AF37] underline text-xs uppercase tracking-widest"
                  >
                    Añadir el primer producto
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                        <th className="py-4 px-3 font-medium">Miniatura</th>
                        <th className="py-4 px-3 font-medium">Nombre & Categoría</th>
                        <th className="py-4 px-3 font-medium text-right">Precio Reg.</th>
                        <th className="py-4 px-3 font-medium text-right">Desc. %</th>
                        <th className="py-4 px-3 font-medium text-right">Precio Final</th>
                        <th className="py-4 px-3 font-medium text-center">Stock</th>
                        <th className="py-4 px-3 font-medium">Estado / Lanzamiento</th>
                        <th className="py-4 px-3 font-medium text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {products.map(prod => {
                        const isScheduledFuture = prod.isScheduled && prod.launchDate && new Date(prod.launchDate) > new Date();
                        return (
                          <tr key={prod.id} className="hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="w-12 h-12 bg-black border border-neutral-800 rounded-sm flex items-center justify-center p-1 overflow-hidden">
                                {prod.images && prod.images.length > 0 ? (
                                  <img src={prod.images[0]} alt={prod.name} className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-neutral-700" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white block">{prod.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{prod.categoryName || "Sin Categoría"}</span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">${prod.regularPrice.toLocaleString("es-MX")} MXN</td>
                            <td className="py-3 px-3 text-right font-mono text-red-400">
                              {prod.discountPercent > 0 ? `-${prod.discountPercent}%` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-[#D4AF37] font-semibold">
                              ${prod.salePrice.toLocaleString("es-MX")} MXN
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 font-mono font-bold rounded-sm ${prod.stock <= 2 ? "bg-red-950/40 text-red-400" : "text-neutral-300"}`}>
                                {prod.stock}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs">
                              {isScheduledFuture ? (
                                <div className="space-y-0.5 text-sky-400">
                                  <span className="text-[9px] uppercase tracking-wider block font-bold">Agendado 📅</span>
                                  <span className="text-[10px] font-mono block text-neutral-500">{new Date(prod.launchDate!).toLocaleString("es-ES")}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400">Visible en Catálogo</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => startEditProduct(prod)}
                                  className="p-1.5 hover:text-[#D4AF37] transition-colors"
                                  title="Editar pieza"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-1.5 hover:text-[#FF1744] transition-colors"
                                  title="Eliminar pieza"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* EXCLUSIVE COLLECTIONS CONTAINER */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-sm p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif text-white font-light">Colecciones de Joyas Exclusivas</h3>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Total: {collections.length} colecciones creadas</p>
                </div>
                <button 
                  onClick={() => { setEditingCollection(null); setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false }); setIsAddingCollection(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-[10px] rounded-sm hover:bg-white transition-all shadow-md cursor-pointer"
                  id="admin-create-collection-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear Nueva Colección
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-800 rounded-sm">
                  <Calendar className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">Aún no se han creado colecciones exclusivas.</p>
                  <button 
                    onClick={() => { setEditingCollection(null); setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false }); setIsAddingCollection(true); }}
                    className="mt-4 text-[#D4AF37] underline text-xs uppercase tracking-widest"
                  >
                    Crear la primera colección
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                        <th className="py-4 px-3 font-medium">Portada de Colección</th>
                        <th className="py-4 px-3 font-medium">Nombre de la Colección</th>
                        <th className="py-4 px-3 font-medium">Fecha y Hora de Lanzamiento</th>
                        <th className="py-4 px-3 font-medium">Estado / Cuenta Regresiva</th>
                        <th className="py-4 px-3 font-medium text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {collections.map(col => {
                        const launchDateObj = new Date(col.launchDate);
                        const isLaunched = launchDateObj <= new Date();
                        return (
                          <tr key={col.id} className="hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="w-16 h-12 bg-black border border-neutral-800 rounded-sm flex items-center justify-center overflow-hidden">
                                {col.coverImage ? (
                                  <img src={col.coverImage} alt={col.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-neutral-700" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white block">{col.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">Creada: {new Date(col.createdAt).toLocaleDateString("es-ES")}</span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {launchDateObj.toLocaleString("es-ES")}
                            </td>
                            <td className="py-3 px-3">
                              {isLaunched ? (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/40 rounded-sm">Colección Lanzada</span>
                              ) : (
                                <span className="text-[9px] uppercase tracking-wider font-bold text-sky-400 px-2 py-0.5 bg-sky-950/40 rounded-sm">Próximamente</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => startEditCollection(col)}
                                  className="p-1.5 hover:text-[#D4AF37] transition-colors"
                                  title="Editar colección"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCollection(col.id)}
                                  className="p-1.5 hover:text-[#FF1744] transition-colors"
                                  title="Eliminar colección"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* NEWSLETTER SUBSCRIPTIONS CONTAINER */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif text-white font-light flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#D4AF37]" /> Suscriptores al Boletín Privado
                  </h3>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Correos registrados para ofertas exclusivas y subastas de alta gama</p>
                </div>
                <span className="text-xs font-mono text-neutral-500 uppercase">Total: {newsletterSubscriptions.length}</span>
              </div>

              {newsletterSubscriptions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-900 rounded-sm">
                  <Mail className="w-8 h-8 text-neutral-800 mx-auto mb-2 opacity-50" />
                  <p className="text-neutral-500 text-xs">Aún no hay usuarios suscritos al boletín privado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-neutral-500 uppercase tracking-wider text-[10px] font-mono">
                        <th className="py-3 px-3 font-medium">Correo Electrónico</th>
                        <th className="py-3 px-3 font-medium">Fecha de Registro</th>
                        <th className="py-3 px-3 font-medium text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {newsletterSubscriptions.map((sub, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/20 transition-colors">
                          <td className="py-3 px-3 font-semibold text-neutral-200">{sub.email}</td>
                          <td className="py-3 px-3 text-neutral-500 font-mono">
                            {new Date(sub.registeredAt).toLocaleString("es-MX")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={() => handleDeleteSubscription(sub.email)}
                              className="p-1.5 hover:text-[#FF1744] text-neutral-600 transition-colors"
                              title="Eliminar suscriptor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#050505] border-t border-[#D4AF37]/20 py-12 px-6 md:px-12 mt-auto text-xs" id="footer-main">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" animated={false} />
              <div className="flex flex-col">
                <span className="text-sm font-serif text-[#D4AF37] tracking-widest font-bold uppercase">Joyería Patuna</span>
                <span className="text-[8px] text-neutral-500 tracking-wider">HAUTE JOAILLERIE</span>
              </div>
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-xs">
              Esmerada selección de las gemas más hermosas del mundo engastadas en oro de 24 quilates bajo el sello del pato real áureo.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-[#D4AF37] text-[10px] uppercase tracking-[0.25em] font-bold block">Colecciones</span>
            <ul className="space-y-1.5 text-neutral-400 text-xs">
              <li><a href="#catalogo" onClick={() => { setCurrentView("catalog"); setSelectedCategory("all"); }} className="hover:text-white transition-colors">Ver Todo</a></li>
              <li><a href="#catalogo" onClick={() => { setCurrentView("catalog"); setSelectedCategory("new-collection"); }} className="hover:text-white transition-colors">Novedades Estacionales</a></li>
              <li><a href="#catalogo" onClick={() => { setCurrentView("catalog"); setSelectedCategory("limited-edition"); }} className="hover:text-white transition-colors">Ediciones Limitadas</a></li>
              <li><a href="#catalogo" onClick={() => { setCurrentView("catalog"); setSelectedCategory("luxury-sets"); }} className="hover:text-white transition-colors">Soberanos de Oro</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-[#D4AF37] text-[10px] uppercase tracking-[0.25em] font-bold block">Contacto Privado</span>
            <ul className="space-y-1.5 text-neutral-400 text-xs">
              <li>Taller de Orfebrería Imperial</li>
              <li>WhatsApp Directo: <span className="text-[#D4AF37]">56-2541-9181</span></li>
              <li>Correo: <span className="text-neutral-300">lajoyeriapatunaoficial@yahoo.com</span></li>
              <li>México &bull; Ginebra &bull; París</li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-[#D4AF37] text-[10px] uppercase tracking-[0.25em] font-bold block">WhatsApp Concierge</span>
            <p className="text-neutral-500 text-xs leading-relaxed">
              ¿Desea encargar una pieza personalizada o consultar existencias inmediatas? Hable con un asesor experto.
            </p>
            <a 
              href="https://wa.me/525625419181?text=Hola,%20deseo%20consultar%20el%20catalogo%20exclusivo%20de%20Joyeria%20Patuna."
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] tracking-widest uppercase rounded-sm transition-colors"
            >
              Iniciar Chat Concierge
            </a>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-neutral-900/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-neutral-600 text-[10px] uppercase tracking-widest font-mono">
          <div>&copy; {new Date().getFullYear()} Joyería Patuna &mdash; Excelencia en Orfebrería Imperial</div>
          <div className="flex gap-6">
            <span>Sello: Certificado</span>
            <span>Seguridad: Bóveda de Cuatro Colores</span>
            <span className="text-[#D4AF37]">Mascota: El Pato Dorado</span>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* DIALOG MODAL: DETAILED SINGLE PRODUCT PAGE (POPUP) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="product-details-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/30 rounded-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-10"
              style={{ boxShadow: "0 0 50px rgba(212, 175, 55, 0.15)" }}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-neutral-900 rounded-full text-neutral-400 hover:text-white border border-neutral-800 transition-colors hover:border-[#D4AF37]/50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                
                {/* Image Gallery Column */}
                <div className="md:col-span-5 space-y-4">
                  <div className="h-80 w-full bg-[#050505] border border-neutral-900 rounded-sm flex items-center justify-center p-4 relative overflow-hidden">
                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                      <img 
                        src={selectedProduct.images[detailImageIdx]} 
                        alt={selectedProduct.name} 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-neutral-700 flex flex-col items-center gap-2">
                        <ImageIcon className="w-12 h-12 stroke-1" />
                        <span className="text-xs uppercase tracking-widest">Sin Imagen</span>
                      </div>
                    )}

                    {/* Left/Right controls if multiple images */}
                    {selectedProduct.images && selectedProduct.images.length > 1 && (
                      <div className="absolute inset-x-2 bottom-2 flex justify-between">
                        <button 
                          onClick={() => setDetailImageIdx(prev => prev > 0 ? prev - 1 : selectedProduct.images.length - 1)}
                          className="p-1 bg-black/80 hover:bg-[#D4AF37] hover:text-black rounded-sm border border-neutral-800 text-white transition-colors"
                        >
                          ◀
                        </button>
                        <button 
                          onClick={() => setDetailImageIdx(prev => prev < selectedProduct.images.length - 1 ? prev + 1 : 0)}
                          className="p-1 bg-black/80 hover:bg-[#D4AF37] hover:text-black rounded-sm border border-neutral-800 text-white transition-colors"
                        >
                          ▶
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Previews */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setDetailImageIdx(idx)}
                          className={`h-16 bg-[#050505] border rounded-sm p-1 flex items-center justify-center overflow-hidden transition-all ${detailImageIdx === idx ? "border-[#D4AF37]" : "border-neutral-900 hover:border-neutral-700"}`}
                        >
                          <img src={img} alt="Thumb" className="max-h-full max-w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Meta details Column */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                  
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[#D4AF37] text-xs font-mono uppercase tracking-[0.25em]">
                        {selectedProduct.categoryName}
                      </span>
                      <span className="text-neutral-600">&bull;</span>
                      <span className="text-neutral-500 text-[10px] font-mono">ID: {selectedProduct.id}</span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-serif text-white font-light leading-snug">
                      {selectedProduct.name}
                    </h2>

                    {/* Labels Display */}
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.labels.map((lbl, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-neutral-900 border border-[#D4AF37]/30 text-[#D4AF37] rounded-sm">
                          {lbl}
                        </span>
                      ))}
                      {selectedProduct.discountPercent > 0 && (
                        <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest font-bold bg-[#FF1744] text-white rounded-sm">
                          -{selectedProduct.discountPercent}% Descuento Especial
                        </span>
                      )}
                    </div>

                    {/* Rich text HTML content container */}
                    <div className="border-t border-neutral-900 pt-4">
                      <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-mono">Descripción de la Pieza</h4>
                      <div 
                        className="text-neutral-300 text-xs md:text-sm leading-relaxed font-light rich-text-preview"
                        dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-neutral-900 pt-6 space-y-6">
                    
                    {/* Price and Stock status panel */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">Valor de Adquisición</span>
                        {selectedProduct.discountPercent > 0 ? (
                          <div className="space-y-1">
                            <span className="text-sm text-neutral-500 line-through block">
                              ${selectedProduct.regularPrice.toLocaleString("es-MX")} MXN
                            </span>
                            <span className="text-2xl font-serif text-[#D4AF37] font-semibold block">
                              ${selectedProduct.salePrice.toLocaleString("es-MX")} MXN
                            </span>
                          </div>
                        ) : (
                          <span className="text-2xl font-serif text-[#D4AF37] font-semibold block">
                            ${selectedProduct.regularPrice.toLocaleString("es-MX")} MXN
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">Disponibilidad</span>
                        {selectedProduct.stock <= 0 ? (
                          <span className="text-xs text-[#FF1744] font-bold uppercase tracking-widest block mt-1">Agotado Temporalmente</span>
                        ) : selectedProduct.stock <= 2 ? (
                          <span className="text-xs text-[#FF6D00] font-bold uppercase tracking-widest block mt-1 animate-pulse">
                            ¡Solo {selectedProduct.stock} unidades!
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest block mt-1">En Existencia ({selectedProduct.stock})</span>
                        )}
                      </div>
                    </div>

                    {/* Whatsapp direct reservation button */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a 
                        href={`https://wa.me/525625419181?text=Hola,%20deseo%20reservar%20la%20siguiente%20joya%20de%20lujo%20de%20su%20catalogo:%20${encodeURIComponent(selectedProduct.name)}%20(${selectedProduct.id})`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-grow py-3 px-6 bg-[#D4AF37] hover:bg-white text-black font-bold text-center text-xs uppercase tracking-widest transition-colors rounded-sm"
                      >
                        Reservar con Asesoría Privada
                      </a>
                      <button 
                        onClick={() => setSelectedProduct(null)}
                        className="py-3 px-6 border border-neutral-700 hover:border-white text-white text-xs uppercase tracking-widest transition-all rounded-sm"
                      >
                        Volver al Catálogo
                      </button>
                    </div>

                  </div>

                </div>

              </div>

              {/* Related Products Section */}
              <div className="mt-12 border-t border-neutral-900 pt-8">
                <h4 className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-6 font-mono text-center">Otras Creaciones del Taller</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {getRelatedProducts(selectedProduct).map(rel => (
                    <div 
                      key={rel.id}
                      onClick={() => {
                        setSelectedProduct(rel);
                        setDetailImageIdx(0);
                      }}
                      className="p-3 bg-neutral-950 border border-neutral-900 hover:border-[#D4AF37]/40 rounded-sm cursor-pointer transition-all flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-[#050505] border border-neutral-800 rounded-sm flex-shrink-0 flex items-center justify-center p-0.5 overflow-hidden">
                        {rel.images && rel.images.length > 0 ? (
                          <img src={rel.images[0]} alt={rel.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-neutral-700" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs text-neutral-400 uppercase tracking-widest font-serif truncate block" title={rel.name}>{rel.name}</span>
                        <span className="text-[10px] text-[#D4AF37] font-semibold">${rel.salePrice.toLocaleString("es-MX")} MXN</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DIALOG MODAL: ADD / EDIT PRODUCT */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8"
            >
              {/* Close Button */}
              <button 
                onClick={() => { setIsAddingProduct(false); setEditingProduct(null); resetProductForm(); }}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-serif text-white uppercase tracking-[0.2em] mb-6 border-b border-[#D4AF37]/20 pb-3">
                {editingProduct ? "Editar Pieza de Lujo" : "Incorporar Nueva Pieza"}
              </h2>

              <form onSubmit={handleSubmitProduct} className="space-y-6 text-xs text-left">
                
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase tracking-wider block">Nombre de la Joya *</label>
                  <input 
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                    placeholder="Ej. Anillo Reale Imperial Solitario"
                  />
                </div>

                {/* Category & Stock row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-neutral-400 uppercase tracking-wider block">Categoría *</label>
                    <select
                      required
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                    >
                      <option value="">-- Seleccionar Categoría --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-400 uppercase tracking-wider block">Cantidad en Existencia *</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value === "" ? "" : Number(e.target.value) }))}
                      className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                {/* Pricing / Discount System Engine Row */}
                <div className="bg-neutral-900/30 border border-neutral-800/80 p-4 rounded-sm space-y-4">
                  <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-mono block">Motor de Precios e Impuestos</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-neutral-400 uppercase tracking-wider block">Precio Regular (MXN) *</label>
                      <input 
                        type="number"
                        required
                        min="0"
                        value={productForm.regularPrice}
                        onChange={(e) => handlePriceChange("regular", e.target.value)}
                        className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-400 uppercase tracking-wider block">Porcentaje Descuento (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={productForm.discountPercent}
                        onChange={(e) => handlePriceChange("percent", e.target.value)}
                        className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-400 uppercase tracking-wider block">Precio de Oferta (MXN)</label>
                      <input 
                        type="number"
                        min="0"
                        value={productForm.salePrice}
                        onChange={(e) => handlePriceChange("sale", e.target.value)}
                        className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  {productForm.discountPercent > 0 && (
                    <div className="text-[10px] text-red-400 font-mono">
                      ✦ Descuento activo: -{productForm.discountPercent}% calculando precio final de ${productForm.salePrice} MXN
                    </div>
                  )}
                </div>

                {/* Direct File Image Upload from device storage */}
                <div className="space-y-2">
                  <label className="text-neutral-400 uppercase tracking-wider block">Galería de Imágenes (Subir directamente desde el dispositivo)</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-sm cursor-pointer text-center text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#D4AF37]">
                      <Plus className="w-4 h-4" /> Seleccionar Archivos
                      <input 
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-neutral-500 text-[10px]">Las imágenes se guardan directamente en el servidor. No requiere URLs externas.</span>
                  </div>

                  {/* Uploaded images grid */}
                  {productForm.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                      {productForm.images.map((img, idx) => (
                        <div key={idx} className="relative h-24 border border-neutral-800 bg-neutral-950 rounded-sm p-1.5 flex flex-col items-center justify-between group overflow-hidden">
                          <div className="flex-grow flex items-center justify-center w-full h-12 overflow-hidden">
                            <img src={img} alt="Preview" className="max-h-full max-w-full object-contain" />
                          </div>
                          
                          {/* Badges and Controls */}
                          <div className="w-full flex items-center justify-between gap-1 mt-1">
                            {idx === 0 ? (
                              <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded-xs font-semibold uppercase tracking-wider">
                                Portada
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm(prev => {
                                    const nextImages = [...prev.images];
                                    const [moved] = nextImages.splice(idx, 1);
                                    return { ...prev, images: [moved, ...nextImages] };
                                  });
                                }}
                                className="text-[9px] hover:text-[#D4AF37] text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded-xs font-semibold uppercase tracking-wider transition-colors"
                              >
                                Usar Portada
                              </button>
                            )}
                            
                            <button 
                              type="button"
                              onClick={() => setProductForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                              className="text-red-500 hover:text-red-400 p-1 bg-neutral-900 border border-neutral-800 hover:border-red-950/50 rounded-xs transition-colors"
                              title="Eliminar imagen"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduling Publications features */}
                <div className="bg-neutral-900/30 border border-neutral-800/80 p-4 rounded-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-mono block">Programar Publicación Automática</span>
                    
                    <label className="relative flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={productForm.isScheduled}
                        onChange={(e) => setProductForm(prev => ({ ...prev, isScheduled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:bg-[#D4AF37] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-black after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  {productForm.isScheduled && (
                    <div className="space-y-1.5">
                      <label className="text-neutral-400 uppercase tracking-wider block">Fecha y Hora de Lanzamiento en Catálogo</label>
                      <input 
                        type="datetime-local"
                        required={productForm.isScheduled}
                        value={productForm.launchDate}
                        onChange={(e) => setProductForm(prev => ({ ...prev, launchDate: e.target.value }))}
                        className="bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none w-full"
                      />
                      <span className="text-[10px] text-sky-400 block">✦ El producto permanecerá oculto al público hasta llegar a la fecha y hora configuradas.</span>
                    </div>
                  )}
                </div>

                {/* Built-in Labels list & custom creation */}
                <div className="space-y-3">
                  <label className="text-neutral-400 uppercase tracking-wider block">Etiquetas del Producto</label>
                  <div className="flex flex-wrap gap-2">
                    {["Nuevo", "Best Seller", "Edición Especial", "Exclusivo", "Destacado", "Edición Limitada"].map(lbl => {
                      const isSelected = productForm.labels.includes(lbl);
                      return (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => handleLabelToggle(lbl)}
                          className={`px-3 py-1 border rounded-sm transition-all ${isSelected ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold" : "bg-[#050505] border-neutral-800 text-neutral-400"}`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom labels */}
                  <div className="flex gap-2 max-w-sm">
                    <input 
                      type="text"
                      placeholder="Crear etiqueta personalizada..."
                      value={productForm.customLabelInput}
                      onChange={(e) => setProductForm(prev => ({ ...prev, customLabelInput: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomLabel(); } }}
                      className="bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-1.5 text-white outline-none flex-grow"
                    />
                    <button 
                      type="button"
                      onClick={handleAddCustomLabel}
                      className="px-3 bg-neutral-900 border border-neutral-800 hover:text-white"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Product Rich Text Description with built-in toolbar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-neutral-400 uppercase tracking-wider block">Descripción Detallada *</label>
                    <div className="flex gap-1 bg-neutral-900 p-1 rounded-sm border border-neutral-800">
                      <button 
                        type="button" 
                        onClick={() => insertRichTextTag("<strong>", "</strong>")} 
                        className="px-2 py-0.5 hover:bg-neutral-800 rounded-sm font-bold"
                        title="Negrita"
                      >
                        B
                      </button>
                      <button 
                        type="button" 
                        onClick={() => insertRichTextTag("<em>", "</em>")} 
                        className="px-2 py-0.5 hover:bg-neutral-800 rounded-sm italic"
                        title="Cursiva"
                      >
                        I
                      </button>
                      <button 
                        type="button" 
                        onClick={() => insertRichTextTag("<h3>", "</h3>")} 
                        className="px-2 py-0.5 hover:bg-neutral-800 rounded-sm"
                        title="Encabezado"
                      >
                        H
                      </button>
                      <button 
                        type="button" 
                        onClick={() => insertRichTextTag("<ul><li>", "</li></ul>")} 
                        className="px-2 py-0.5 hover:bg-neutral-800 rounded-sm"
                        title="Lista"
                      >
                        •
                      </button>
                    </div>
                  </div>
                  <textarea 
                    id="prod-desc-textarea"
                    required
                    rows={4}
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none font-mono"
                    placeholder="Detalles sobre el quilataje, pureza de gemas, procesos y dimensiones..."
                  />
                  
                  {/* Rich Text Live preview block */}
                  {productForm.description && (
                    <div className="border border-dashed border-neutral-800 p-3 bg-neutral-950/40 rounded-sm">
                      <span className="text-[9px] text-neutral-600 uppercase tracking-widest font-mono block mb-2">Vista Previa con Soporte Enriquecido</span>
                      <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: productForm.description }} />
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-neutral-900">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingProduct(false); setEditingProduct(null); resetProductForm(); }}
                    className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#D4AF37] text-black font-bold uppercase tracking-wider"
                  >
                    {editingProduct ? "Guardar Cambios" : "Publicar Pieza"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DIALOG MODAL: MANAGE CATEGORIES */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isManagingCategories && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-sm max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8"
            >
              {/* Close Button */}
              <button 
                onClick={() => { setIsManagingCategories(false); setCategoryForm({ name: "", description: "" }); setCategoryEditId(null); }}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-serif text-white uppercase tracking-[0.2em] mb-6 border-b border-[#D4AF37]/20 pb-3">
                Administrar Categorías del Catálogo
              </h2>

              {/* Category creation / edit form */}
              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs text-left mb-8 bg-neutral-900/30 p-4 border border-neutral-800 rounded-sm">
                <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-mono block">
                  {categoryEditId ? "Editar Categoría Existente" : "Crear Nueva Categoría de Joyería"}
                </span>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block">Nombre *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej. Anillos de Compromiso, Esmeraldas"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block">Descripción</label>
                    <input 
                      type="text"
                      placeholder="Ej. Gemas pulidas en el taller con oro amarillo"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {categoryEditId && (
                    <button 
                      type="button"
                      onClick={() => { setCategoryEditId(null); setCategoryForm({ name: "", description: "" }); }}
                      className="px-3 py-1.5 border border-neutral-800 text-neutral-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-[#D4AF37] text-black font-bold uppercase tracking-wider rounded-sm"
                  >
                    {categoryEditId ? "Actualizar" : "Crear Categoría"}
                  </button>
                </div>
              </form>

              {/* Categories list table */}
              <div className="space-y-3">
                <span className="text-xs text-neutral-400 uppercase tracking-widest block font-mono">Categorías Existentes ({categories.length})</span>
                
                <div className="divide-y divide-neutral-900 border border-neutral-900 max-h-60 overflow-y-auto">
                  {categories.map(cat => (
                    <div key={cat.id} className="py-2.5 px-3 flex items-center justify-between hover:bg-neutral-900/30">
                      <div>
                        <span className="text-white font-medium text-xs block">{cat.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono block italic">{cat.description || 'Sin descripción'}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => { setCategoryEditId(cat.id); setCategoryForm({ name: cat.name, description: cat.description }); }}
                          className="p-1 hover:text-[#D4AF37] transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 hover:text-[#FF1744] transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-neutral-900 mt-6">
                <button 
                  type="button"
                  onClick={() => { setIsManagingCategories(false); setCategoryForm({ name: "", description: "" }); setCategoryEditId(null); }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs uppercase"
                >
                  Cerrar Ventana
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DIALOG MODAL: ADD / EDIT COLLECTION */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isAddingCollection && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="collection-form-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-sm max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8"
              style={{ boxShadow: "0 0 40px rgba(212, 175, 55, 0.15)" }}
            >
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => { setIsAddingCollection(false); setEditingCollection(null); setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false }); }}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-serif text-white uppercase tracking-[0.2em] mb-6 border-b border-[#D4AF37]/20 pb-3">
                {editingCollection ? "Editar Colección" : "Crear Nueva Colección"}
              </h2>

              <form onSubmit={handleSaveCollection} className="space-y-5 text-xs text-left">
                
                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Nombre de la Colección *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Colección Imperial, Dinastía de Oro"
                    value={collectionForm.name}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2.5 text-white outline-none font-sans text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Fecha y Hora de Lanzamiento *</label>
                  <input 
                    type="datetime-local"
                    required
                    value={collectionForm.launchDate}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, launchDate: e.target.value }))}
                    className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2.5 text-white outline-none font-mono text-xs"
                  />
                  <span className="text-[10px] text-neutral-500 block">✦ Los suscriptores del newsletter verán la cuenta atrás y recibirán acceso prioritario al catálogo.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Portada de la Colección (Subir fotos o archivos) *</label>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 hover:border-[#D4AF37] bg-neutral-950/40 rounded-sm py-4 px-2 cursor-pointer transition-all">
                      <ImageIcon className="w-6 h-6 text-neutral-500 mb-1" />
                      <span className="text-neutral-400 font-bold uppercase tracking-wider text-[9px]">Seleccionar Archivo</span>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleCollectionImageUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex-grow space-y-1">
                      <input 
                        type="text"
                        placeholder="O pegue la URL de la portada..."
                        value={collectionForm.coverImage}
                        onChange={(e) => setCollectionForm(prev => ({ ...prev, coverImage: e.target.value }))}
                        className="w-full bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3 py-2.5 text-white outline-none font-mono text-xs"
                      />
                    </div>
                  </div>

                  {collectionForm.coverImage && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-500 block font-mono">Vista previa de portada:</span>
                      <div className="w-full h-32 bg-black border border-neutral-800 rounded-sm overflow-hidden flex items-center justify-center">
                        <img src={collectionForm.coverImage} alt="Cover Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notify Newsletter Subscribers option */}
                <div className="flex items-center gap-2.5 py-1">
                  <input 
                    type="checkbox"
                    id="notifySubscribers"
                    checked={collectionForm.notifySubscribers}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, notifySubscribers: e.target.checked }))}
                    className="accent-[#D4AF37] h-4.5 w-4.5 rounded-sm cursor-pointer"
                  />
                  <label htmlFor="notifySubscribers" className="text-neutral-400 uppercase tracking-wider font-semibold cursor-pointer select-none">Notificar a los suscriptores del Boletín</label>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-neutral-900">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingCollection(false); setEditingCollection(null); setCollectionForm({ name: "", launchDate: "", coverImage: "", notifySubscribers: false }); }}
                    className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#D4AF37] text-black font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-all"
                  >
                    {editingCollection ? "Guardar Cambios" : "Publicar Colección"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4" id="custom-confirm-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-sm max-w-sm w-full p-6 text-center shadow-2xl relative"
            >
              <AlertTriangle className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-sm uppercase tracking-widest font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-6">{confirmModal.message}</p>
              <div className="flex justify-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setConfirmModal(null)} 
                  className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] uppercase tracking-wider rounded-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={confirmModal.onConfirm} 
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-black font-bold text-[10px] uppercase tracking-wider rounded-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALERT DIALOG MODAL */}
      <AnimatePresence>
        {alertModal && alertModal.isOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4" id="custom-alert-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#D4AF37]/50 rounded-sm max-w-sm w-full p-6 text-center shadow-2xl relative"
            >
              <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-sm uppercase tracking-widest font-bold text-white mb-2">{alertModal.title}</h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-6">{alertModal.message}</p>
              <button 
                type="button" 
                onClick={() => setAlertModal(null)} 
                className="w-full py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-black font-bold text-[10px] uppercase tracking-wider rounded-sm"
              >
                Aceptar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AiAssistant />

    </div>
  );
}
