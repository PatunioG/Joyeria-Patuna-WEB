import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

// Interfaces
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Product {
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

interface NewsletterSubscription {
  email: string;
  registeredAt: string;
}

interface Collection {
  id: string;
  name: string;
  launchDate: string;
  coverImage: string;
  createdAt: string;
}

interface DbSchema {
  categories: Category[];
  products: Product[];
  patternHash: string | null; // Color sequence stored as a comma-separated string of colors
  newsletter?: NewsletterSubscription[];
  collections?: Collection[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Brute force protection state
let failedAttempts = 0;
let lockoutUntil: number | null = null;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000; // 1 minute lockout

// In-memory sessions
const activeSessions = new Set<string>();

// Predefined luxury seed SVG images to write to disk
const SEED_IMAGES = {
  ring: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <circle cx="200" cy="240" r="80" stroke="#d4af37" stroke-width="8" fill="none"/>
    <polygon points="200,110 160,160 240,160" fill="#f0f8ff" stroke="#d4af37" stroke-width="4"/>
    <polygon points="200,80 180,110 220,110" fill="#ffffff"/>
    <circle cx="200" cy="135" r="5" fill="#d4af37"/>
    <text x="200" y="360" font-family="'Inter', sans-serif" font-size="14" fill="#d4af37" text-anchor="middle" letter-spacing="4">JOYERÍA PATUNA</text>
  </svg>`,
  necklace: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <path d="M100,100 C100,280 300,280 300,100" stroke="#d4af37" stroke-width="6" fill="none"/>
    <path d="M110,100 C110,260 290,260 290,100" stroke="#b8860b" stroke-dasharray="4,4" stroke-width="2" fill="none"/>
    <g transform="translate(200, 240)">
      <polygon points="0,-15 -15,10 15,10" fill="#d4af37"/>
      <circle cx="0" cy="25" r="12" fill="#ffffff" stroke="#d4af37" stroke-width="3"/>
      <circle cx="0" cy="25" r="4" fill="#d4af37"/>
    </g>
    <text x="200" y="360" font-family="'Inter', sans-serif" font-size="14" fill="#d4af37" text-anchor="middle" letter-spacing="4">JOYERÍA PATUNA</text>
  </svg>`,
  earrings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <!-- Left Earring -->
    <g transform="translate(140, 100)">
      <line x1="0" y1="0" x2="0" y2="80" stroke="#d4af37" stroke-width="4"/>
      <circle cx="0" cy="80" r="15" fill="#d4af37"/>
      <path d="M -10,80 Q 0,110 10,80 Z" fill="#ffffff"/>
      <circle cx="0" cy="0" r="6" fill="#d4af37"/>
    </g>
    <!-- Right Earring -->
    <g transform="translate(260, 100)">
      <line x1="0" y1="0" x2="0" y2="80" stroke="#d4af37" stroke-width="4"/>
      <circle cx="0" cy="80" r="15" fill="#d4af37"/>
      <path d="M -10,80 Q 0,110 10,80 Z" fill="#ffffff"/>
      <circle cx="0" cy="0" r="6" fill="#d4af37"/>
    </g>
    <text x="200" y="360" font-family="'Inter', sans-serif" font-size="14" fill="#d4af37" text-anchor="middle" letter-spacing="4">JOYERÍA PATUNA</text>
  </svg>`,
  watch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <!-- Straps -->
    <rect x="170" y="50" width="60" height="300" rx="10" fill="#b8860b" stroke="#d4af37" stroke-width="2"/>
    <path d="M170,90 L230,90 M170,130 L230,130 M170,270 L230,270 M170,310 L230,310" stroke="#d4af37" stroke-width="2"/>
    <!-- Case -->
    <circle cx="200" cy="200" r="75" fill="#111" stroke="#d4af37" stroke-width="8"/>
    <!-- Dial -->
    <circle cx="200" cy="200" r="62" fill="#000" stroke="#d4af37" stroke-width="1"/>
    <!-- Gold Mascot detail inside dial -->
    <path d="M195,190 Q200,180 205,190 T215,200 Q200,210 185,200 Z" fill="#d4af37" opacity="0.3"/>
    <!-- Hands -->
    <line x1="200" y1="200" x2="200" y2="160" stroke="#d4af37" stroke-width="4" stroke-linecap="round"/>
    <line x1="200" y1="200" x2="235" y2="200" stroke="#d4af37" stroke-width="3" stroke-linecap="round"/>
    <circle cx="200" cy="200" r="6" fill="#d4af37"/>
    <text x="200" y="360" font-family="'Inter', sans-serif" font-size="14" fill="#d4af37" text-anchor="middle" letter-spacing="4">JOYERÍA PATUNA</text>
  </svg>`,
  bracelet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <!-- Bracelet Ring -->
    <ellipse cx="200" cy="200" rx="110" ry="55" stroke="#d4af37" stroke-width="14" fill="none"/>
    <ellipse cx="200" cy="200" rx="105" ry="50" stroke="#000" stroke-width="2" fill="none"/>
    <!-- Jewels on Bracelet -->
    <circle cx="110" cy="180" r="8" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
    <circle cx="290" cy="220" r="8" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
    <circle cx="200" cy="145" r="10" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
    <circle cx="200" cy="255" r="10" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
    <text x="200" y="360" font-family="'Inter', sans-serif" font-size="14" fill="#d4af37" text-anchor="middle" letter-spacing="4">JOYERÍA PATUNA</text>
  </svg>`
};

// Initialize Directory Structure & Seed File Database
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Seed images if they do not exist
  Object.entries(SEED_IMAGES).forEach(([name, svgContent]) => {
    const targetPath = path.join(UPLOAD_DIR, `seed-${name}.svg`);
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, svgContent, "utf8");
    }
  });

  if (!fs.existsSync(DB_FILE)) {
    const defaultCategories: Category[] = [
      { id: "cat-1", name: "Anillos", slug: "anillos", description: "Anillos de compromiso, alianzas de boda y anillos de lujo en oro de 24k y diamantes." },
      { id: "cat-2", name: "Aretes", slug: "aretes", description: "Pendientes y aretes elegantes acabados con gemas preciosas." },
      { id: "cat-3", name: "Pulseras", slug: "pulseras", description: "Brazaletes estructurados y cadenas finas de oro macizo." },
      { id: "cat-4", name: "Collares", slug: "collares", description: "Gargantillas exclusivas, cadenas y dijes diseñados a mano." },
      { id: "cat-5", name: "Relojes", slug: "relojes", description: "Cronógrafos automáticos de precisión mecánica y acabados en oro." },
      { id: "cat-6", name: "Juegos de Lujo", slug: "juegos-de-lujo", description: "Colecciones combinadas de aretes, collar y sortija a juego." },
      { id: "cat-7", name: "Nueva Colección", slug: "nueva-coleccion", description: "Nuestros lanzamientos más recientes del taller de orfebrería." },
      { id: "cat-8", name: "Edición Limitada", slug: "edicion-limitada", description: "Piezas de joyería únicas con producción limitada en todo el mundo." }
    ];

    const defaultProducts: Product[] = [];

    const initialDb: DbSchema = {
      categories: defaultCategories,
      products: defaultProducts,
      patternHash: null // Starts as null, admin configures it during setup
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
  } else {
    // If DB already exists, clear out any original mock/seed products (prod-1, prod-2, etc.) to start empty as requested,
    // but keep any user-created products exactly as they are without forcing scheduling.
    try {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const db: DbSchema = JSON.parse(raw);
      const originalLength = db.products.length;
      
      // Filter out original mock products so the catalog starts empty for now, but preserve user additions
      db.products = db.products.filter(p => !["prod-1", "prod-2", "prod-3", "prod-4", "prod-5"].includes(p.id));
      
      if (db.products.length !== originalLength) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
      }
    } catch (e) {
      console.error("Error filtering existing DB file:", e);
    }
  }
}

// Initialize Firestore
let dbFirestore: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const appInstance = initializeApp({
      projectId: config.projectId
    });
    dbFirestore = getFirestore(appInstance, config.firestoreDatabaseId || "(default)");
    console.log("[Firebase] Inicializado con éxito en base de datos:", config.firestoreDatabaseId);
  } else {
    console.warn("[Firebase] Archivo de configuración firebase-applet-config.json no encontrado.");
  }
} catch (error) {
  console.error("[Firebase] Error al inicializar Admin SDK:", error);
}

// Synchronize from Firestore to local db.json
async function syncFromFirestore() {
  if (!dbFirestore) return;
  try {
    console.log("[Firebase] Sincronizando catálogo desde Firestore...");
    const dbState: DbSchema = {
      categories: [],
      products: [],
      patternHash: null,
      newsletter: [],
      collections: []
    };

    // 1. Fetch Categories
    const categoriesSnapshot = await dbFirestore.collection("categories").get();
    categoriesSnapshot.forEach((doc: any) => {
      dbState.categories.push(doc.data() as Category);
    });

    // 2. Fetch Products
    const productsSnapshot = await dbFirestore.collection("products").get();
    productsSnapshot.forEach((doc: any) => {
      dbState.products.push(doc.data() as Product);
    });

    // 3. Fetch Config/Auth
    const authDoc = await dbFirestore.collection("config").doc("auth").get();
    if (authDoc.exists) {
      dbState.patternHash = authDoc.data().patternHash || null;
    }

    // 4. Fetch Active Sessions
    const sessionsSnapshot = await dbFirestore.collection("sessions").get();
    sessionsSnapshot.forEach((doc: any) => {
      activeSessions.add(doc.id);
    });

    // 5. Fetch Newsletter registrations
    try {
      const newsletterSnapshot = await dbFirestore.collection("newsletter").get();
      newsletterSnapshot.forEach((doc: any) => {
        dbState.newsletter!.push(doc.data() as NewsletterSubscription);
      });
    } catch (newsErr) {
      console.warn("[Firebase] No se pudieron obtener boletines de Firestore:", newsErr);
    }

    // 6. Fetch Collections
    try {
      const collectionsSnapshot = await dbFirestore.collection("collections").get();
      collectionsSnapshot.forEach((doc: any) => {
        dbState.collections!.push(doc.data() as Collection);
      });
    } catch (collErr) {
      console.warn("[Firebase] No se pudieron obtener colecciones de Firestore:", collErr);
    }

    console.log(`[Firebase] Sincronización exitosa: ${dbState.categories.length} categorías, ${dbState.products.length} productos, ${dbState.newsletter.length} registros boletín, ${dbState.collections ? dbState.collections.length : 0} colecciones, sesiones: ${activeSessions.size}`);

    // If Firestore has categories, products, or collections, overwrite local db
    if (dbState.categories.length > 0 || dbState.products.length > 0 || dbState.patternHash || dbState.newsletter.length > 0 || (dbState.collections && dbState.collections.length > 0)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf8");
    } else {
      // If Firestore is completely empty, we keep local default seeded categories and save them up to Firestore
      console.log("[Firebase] Firestore está vacío, inicializando datos semilla...");
      const localDb = getDb();
      await syncToFirestore(localDb);
    }
  } catch (error) {
    console.error("[Firebase] Error al sincronizar desde Firestore:", error);
  }
}

// Synchronize memory/local db to Firestore
async function syncToFirestore(db: DbSchema) {
  if (!dbFirestore) return;
  try {
    console.log("[Firebase] Guardando cambios en Firestore...");
    
    // 1. Save Categories (with deletion checks)
    const categoriesCol = dbFirestore.collection("categories");
    const categoriesSnapshot = await categoriesCol.get();
    const currentCategoryIds = new Set(db.categories.map(c => c.id));
    for (const doc of categoriesSnapshot.docs) {
      if (!currentCategoryIds.has(doc.id)) {
        await categoriesCol.doc(doc.id).delete();
      }
    }
    for (const cat of db.categories) {
      await categoriesCol.doc(cat.id).set(cat);
    }

    // 2. Save Products
    const productsCol = dbFirestore.collection("products");
    
    // Deletions check
    const productsSnapshot = await productsCol.get();
    const currentProductIds = new Set(db.products.map(p => p.id));
    for (const doc of productsSnapshot.docs) {
      if (!currentProductIds.has(doc.id)) {
        console.log(`[Firebase] Eliminando producto ${doc.id} de Firestore`);
        await productsCol.doc(doc.id).delete();
      }
    }
    
    // Save current products
    for (const prod of db.products) {
      await productsCol.doc(prod.id).set(prod);
    }

    // 3. Save Config/Auth
    await dbFirestore.collection("config").doc("auth").set({
      patternHash: db.patternHash || null
    });

    // 4. Save Sessions
    const sessionsCol = dbFirestore.collection("sessions");
    const sessionsSnapshot = await sessionsCol.get();
    const currentSessions = Array.from(activeSessions);
    const dbSessionIds = new Set(currentSessions);

    // Delete inactive sessions from Firestore
    for (const doc of sessionsSnapshot.docs) {
      if (!dbSessionIds.has(doc.id)) {
        await sessionsCol.doc(doc.id).delete();
      }
    }

    // Add current active sessions
    for (const sessionToken of currentSessions) {
      await sessionsCol.doc(sessionToken).set({
        createdAt: new Date().toISOString()
      });
    }

    // 5. Save Newsletter registrations
    if (db.newsletter) {
      const newsletterCol = dbFirestore.collection("newsletter");
      try {
        const newsletterSnapshot = await newsletterCol.get();
        const currentEmails = new Set(db.newsletter.map(n => n.email.toLowerCase()));
        for (const doc of newsletterSnapshot.docs) {
          const docData = doc.data();
          if (docData && docData.email && !currentEmails.has(docData.email.toLowerCase())) {
            await newsletterCol.doc(doc.id).delete();
          }
        }
        for (const sub of db.newsletter) {
          const docId = sub.email.toLowerCase().replace(/[^a-z0-9@_.-]/g, "_");
          await newsletterCol.doc(docId).set(sub);
        }
      } catch (newsErr) {
        console.error("[Firebase] Error al guardar boletines en Firestore:", newsErr);
      }
    }

    // 6. Save Collections
    if (db.collections) {
      const collectionsCol = dbFirestore.collection("collections");
      try {
        const collectionsSnapshot = await collectionsCol.get();
        const currentCollIds = new Set(db.collections.map(c => c.id));
        for (const doc of collectionsSnapshot.docs) {
          if (!currentCollIds.has(doc.id)) {
            await collectionsCol.doc(doc.id).delete();
          }
        }
        for (const coll of db.collections) {
          await collectionsCol.doc(coll.id).set(coll);
        }
      } catch (collErr) {
        console.error("[Firebase] Error al guardar colecciones en Firestore:", collErr);
      }
    }

    console.log("[Firebase] Sincronización a Firestore completada exitosamente.");
  } catch (error) {
    console.error("[Firebase] Error al guardar en Firestore:", error);
  }
}

// Get Database State
function getDb(): DbSchema {
  initDb();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  const db = JSON.parse(raw);
  if (!db.newsletter) {
    db.newsletter = [];
  }
  if (!db.collections) {
    db.collections = [];
  }
  return db;
}

// Save Database State
function saveDb(db: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  syncToFirestore(db).catch(err => console.error("[Firebase] Error en sincronización asíncrona:", err));
}

// Start Server Setup
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup DB
  initDb();
  await syncFromFirestore();

  // Middleware for large base64 data uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve uploaded files, with fallback to Firestore if they do not exist locally
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(UPLOAD_DIR, filename);

      // 1. If it exists locally, serve it directly
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }

      // 2. Fallback to Firestore (in case of ephemeral storage wipeout)
      if (dbFirestore) {
        const doc = await dbFirestore.collection("uploads").doc(filename).get();
        if (doc.exists) {
          const data = doc.data();
          if (data && data.fileData) {
            const fileData = data.fileData;
            const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
              const contentType = matches[1];
              const buffer = Buffer.from(matches[2], "base64");
              
              // Cache locally so we don't hit Firestore on every single request
              try {
                fs.writeFileSync(filePath, buffer);
              } catch (writeErr) {
                console.error("[Fallback] Error caching file locally:", writeErr);
              }

              res.setHeader("Content-Type", contentType);
              return res.send(buffer);
            } else {
              // Raw base64 or other format fallback
              const buffer = Buffer.from(fileData, "base64");
              
              try {
                fs.writeFileSync(filePath, buffer);
              } catch (writeErr) {
                console.error("[Fallback] Error caching raw file locally:", writeErr);
              }

              res.setHeader("Content-Type", "image/png"); // fallback MIME
              return res.send(buffer);
            }
          }
        }
      }

      return res.status(404).send("Archivo no encontrado.");
    } catch (err: any) {
      console.error("[Fallback] Error serving file:", err);
      res.status(500).send("Error interno.");
    }
  });

  // Static directory fallback for uploaded files
  app.use("/uploads", express.static(UPLOAD_DIR));

  // Authentication Middleware helper
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (activeSessions.has(token)) {
        return next();
      }
    }
    return res.status(401).json({ error: "No autorizado. Sesión inválida o expirada." });
  };

  // --- API ROUTES ---

  // Auth Status Checked on Load
  app.get("/api/auth/status", (req, res) => {
    try {
      const db = getDb();
      const authHeader = req.headers.authorization;
      let authenticated = false;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        if (activeSessions.has(token)) {
          authenticated = true;
        }
      }
      res.json({
        setup: db.patternHash !== null,
        authenticated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Setup Pattern Configuration (Only once)
  app.post("/api/auth/setup", (req, res) => {
    try {
      const db = getDb();
      if (db.patternHash !== null) {
        return res.status(400).json({ error: "El sistema de seguridad ya ha sido configurado previamente." });
      }

      const { pattern } = req.body; // Expects array of strings, e.g. ['blue', 'red', 'yellow', 'orange']
      if (!pattern || !Array.isArray(pattern) || pattern.length !== 4) {
        return res.status(400).json({ error: "Patrón de seguridad inválido. Debe consistir de exactamente 4 colores." });
      }

      db.patternHash = pattern.join(",");
      saveDb(db);

      // Automatically create a session for the setup completion
      const sessionToken = "token-" + Date.now() + "-" + Math.random().toString(36).substring(2, 12);
      activeSessions.add(sessionToken);

      res.json({ success: true, token: sessionToken });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Login via Color Pattern
  app.post("/api/auth/login", (req, res) => {
    try {
      const db = getDb();
      if (db.patternHash === null) {
        return res.status(400).json({ error: "El sistema de seguridad aún no se ha configurado." });
      }

      // Check lockout status
      const now = Date.now();
      if (lockoutUntil && now < lockoutUntil) {
        const lockoutRemaining = Math.ceil((lockoutUntil - now) / 1000);
        return res.status(429).json({
          error: `Acceso temporalmente bloqueado debido a múltiples intentos fallidos. Intente de nuevo en ${lockoutRemaining} segundos.`,
          lockoutRemaining
        });
      }

      const { pattern } = req.body;
      if (!pattern || !Array.isArray(pattern) || pattern.length !== 4) {
        return res.status(400).json({ error: "Formato de patrón inválido." });
      }

      const userPatternString = pattern.join(",");
      if (userPatternString === db.patternHash) {
        // Reset brute-force counter on success
        failedAttempts = 0;
        lockoutUntil = null;

        const sessionToken = "token-" + Date.now() + "-" + Math.random().toString(36).substring(2, 12);
        activeSessions.add(sessionToken);

        saveDb(db);

        return res.json({ success: true, token: sessionToken });
      } else {
        // Increment brute force counter
        failedAttempts += 1;
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          failedAttempts = 0; // Reset count for next cycle after lockout
          return res.status(429).json({
            error: "Acceso bloqueado. Demasiados intentos fallidos. Por favor, espere 60 segundos.",
            lockoutRemaining: 60
          });
        }
        return res.status(401).json({
          error: `Patrón incorrecto. Intentos restantes antes del bloqueo: ${MAX_FAILED_ATTEMPTS - failedAttempts}`,
          failedAttempts
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verification endpoint
  app.get("/api/auth/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (activeSessions.has(token)) {
        return res.json({ authenticated: true });
      }
    }
    return res.json({ authenticated: false });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      activeSessions.delete(token);
      try {
        const db = getDb();
        saveDb(db);
      } catch (e) {
        console.error("Error saving DB on logout:", e);
      }
    }
    res.json({ success: true });
  });

  // --- CATEGORIES ROUTES ---

  app.get("/api/categories", (req, res) => {
    try {
      const db = getDb();
      res.json(db.categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/categories", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "El nombre de la categoría es requerido." });
      }

      const slug = name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const newCategory: Category = {
        id: "cat-" + Date.now(),
        name,
        slug,
        description: description || ""
      };

      db.categories.push(newCategory);
      saveDb(db);
      res.status(201).json(newCategory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/categories/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      const { name, description } = req.body;

      const categoryIndex = db.categories.findIndex(c => c.id === id);
      if (categoryIndex === -1) {
        return res.status(404).json({ error: "Categoría no encontrada." });
      }

      if (name) {
        db.categories[categoryIndex].name = name;
        db.categories[categoryIndex].slug = name.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      if (description !== undefined) {
        db.categories[categoryIndex].description = description;
      }

      saveDb(db);
      res.json(db.categories[categoryIndex]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;

      const initialLength = db.categories.length;
      db.categories = db.categories.filter(c => c.id !== id);

      if (db.categories.length === initialLength) {
        return res.status(404).json({ error: "Categoría no encontrada." });
      }

      // Check if any product is using this category, and reassign them to a fallback name or remove the reference
      db.products.forEach(p => {
        if (p.categoryId === id) {
          p.categoryId = "";
          p.categoryName = "Sin Categoría";
        }
      });

      saveDb(db);
      res.json({ success: true, message: "Categoría eliminada con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- PRODUCTS ROUTES ---

  // Get products (with scheduling rules)
  app.get("/api/products", (req, res) => {
    try {
      const db = getDb();
      const isAdmin = req.query.admin === "true";
      const authHeader = req.headers.authorization;

      let verifiedAdmin = false;
      if (isAdmin && authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        if (activeSessions.has(token)) {
          verifiedAdmin = true;
        }
      }

      if (verifiedAdmin) {
        // Return ALL products including scheduled/hidden ones for admin dashboard
        return res.json(db.products);
      } else {
        // Public Catalog Route: Filter out scheduled products whose launch date has not arrived yet
        const now = new Date();
        const visibleProducts = db.products.filter(p => {
          if (!p.isScheduled || !p.launchDate) {
            return true; // Publish immediately
          }
          const launch = new Date(p.launchDate);
          return launch <= now; // Only visible if past
        });
        return res.json(visibleProducts);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload Product Image (Requires Auth)
  app.post("/api/products/upload", requireAuth, async (req, res) => {
    try {
      const { fileData, filename } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "No se proporcionaron datos de archivo." });
      }

      // Parse base64 representation
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = "png";

      if (matches && matches.length === 3) {
        extension = matches[1].split("/")[1] || "png";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(fileData, "base64");
      }

      // Sanitize extension and file format
      if (extension === "jpeg") extension = "jpg";
      if (extension === "svg+xml") extension = "svg";

      const finalFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const filePath = path.join(UPLOAD_DIR, finalFilename);

      fs.writeFileSync(filePath, buffer);

      // Persist in Firestore to handle ephemeral containers restarts/scaling
      if (dbFirestore) {
        try {
          await dbFirestore.collection("uploads").doc(finalFilename).set({
            fileData,
            createdAt: new Date().toISOString()
          });
          console.log(`[Firebase] Guardada imagen en Firestore: ${finalFilename}`);
        } catch (dbErr: any) {
          console.error("[Firebase] Error al guardar imagen en Firestore:", dbErr);
        }
      }

      res.json({
        success: true,
        imageUrl: `/uploads/${finalFilename}`
      });
    } catch (err: any) {
      res.status(500).json({ error: `Error de subida: ${err.message}` });
    }
  });

  // Create Product
  app.post("/api/products", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const {
        name,
        description,
        images,
        categoryId,
        stock,
        regularPrice,
        discountPercent,
        salePrice,
        labels,
        launchDate,
        isScheduled
      } = req.body;

      if (!name || regularPrice === undefined || stock === undefined) {
        return res.status(400).json({ error: "Faltan campos obligatorios para el producto." });
      }

      const category = db.categories.find(c => c.id === categoryId);
      const categoryName = category ? category.name : "Sin Categoría";

      const newProduct: Product = {
        id: "prod-" + Date.now(),
        name,
        description: description || "",
        images: Array.isArray(images) ? images : [],
        categoryId: categoryId || "",
        categoryName,
        stock: Number(stock),
        regularPrice: Number(regularPrice),
        discountPercent: Number(discountPercent || 0),
        salePrice: Number(salePrice || regularPrice),
        labels: Array.isArray(labels) ? labels : [],
        launchDate: launchDate ? new Date(launchDate).toISOString() : null,
        isScheduled: !!isScheduled,
        createdAt: new Date().toISOString()
      };

      db.products.push(newProduct);
      saveDb(db);
      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit Product
  app.put("/api/products/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      const productIndex = db.products.findIndex(p => p.id === id);

      if (productIndex === -1) {
        return res.status(404).json({ error: "Producto no encontrado." });
      }

      const existingProduct = db.products[productIndex];
      const {
        name,
        description,
        images,
        categoryId,
        stock,
        regularPrice,
        discountPercent,
        salePrice,
        labels,
        launchDate,
        isScheduled
      } = req.body;

      let categoryName = existingProduct.categoryName;
      if (categoryId !== undefined) {
        const category = db.categories.find(c => c.id === categoryId);
        categoryName = category ? category.name : "Sin Categoría";
      }

      const updatedProduct: Product = {
        ...existingProduct,
        name: name !== undefined ? name : existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        images: images !== undefined ? (Array.isArray(images) ? images : []) : existingProduct.images,
        categoryId: categoryId !== undefined ? categoryId : existingProduct.categoryId,
        categoryName,
        stock: stock !== undefined ? Number(stock) : existingProduct.stock,
        regularPrice: regularPrice !== undefined ? Number(regularPrice) : existingProduct.regularPrice,
        discountPercent: discountPercent !== undefined ? Number(discountPercent) : existingProduct.discountPercent,
        salePrice: salePrice !== undefined ? Number(salePrice) : existingProduct.salePrice,
        labels: labels !== undefined ? (Array.isArray(labels) ? labels : []) : existingProduct.labels,
        launchDate: launchDate !== undefined ? (launchDate ? new Date(launchDate).toISOString() : null) : existingProduct.launchDate,
        isScheduled: isScheduled !== undefined ? !!isScheduled : existingProduct.isScheduled
      };

      db.products[productIndex] = updatedProduct;
      saveDb(db);
      res.json(updatedProduct);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Product
  app.delete("/api/products/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;

      const initialLength = db.products.length;
      db.products = db.products.filter(p => p.id !== id);

      if (db.products.length === initialLength) {
        return res.status(404).json({ error: "Producto no encontrado." });
      }

      saveDb(db);
      res.json({ success: true, message: "Producto eliminado con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- COLLECTIONS ROUTES ---

  // Get collections
  app.get("/api/collections", (req, res) => {
    try {
      const db = getDb();
      res.json(db.collections || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Collection
  app.post("/api/collections", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { name, launchDate, coverImage } = req.body;

      if (!name || !launchDate) {
        return res.status(400).json({ error: "Faltan campos obligatorios para la colección." });
      }

      const newCollection: Collection = {
        id: "coll-" + Date.now(),
        name,
        launchDate: new Date(launchDate).toISOString(),
        coverImage: coverImage || "",
        createdAt: new Date().toISOString()
      };

      if (!db.collections) {
        db.collections = [];
      }
      db.collections.push(newCollection);
      saveDb(db);
      res.status(201).json(newCollection);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit Collection
  app.put("/api/collections/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      if (!db.collections) db.collections = [];
      
      const colIndex = db.collections.findIndex(c => c.id === id);
      if (colIndex === -1) {
        return res.status(404).json({ error: "Colección no encontrada." });
      }

      const existingCol = db.collections[colIndex];
      const { name, launchDate, coverImage } = req.body;

      const updatedCol: Collection = {
        ...existingCol,
        name: name !== undefined ? name : existingCol.name,
        launchDate: launchDate !== undefined ? new Date(launchDate).toISOString() : existingCol.launchDate,
        coverImage: coverImage !== undefined ? coverImage : existingCol.coverImage
      };

      db.collections[colIndex] = updatedCol;
      saveDb(db);
      res.json(updatedCol);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Collection
  app.delete("/api/collections/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      if (!db.collections) db.collections = [];

      const initialLength = db.collections.length;
      db.collections = db.collections.filter(c => c.id !== id);

      if (db.collections.length === initialLength) {
        return res.status(404).json({ error: "Colección no encontrada." });
      }

      saveDb(db);
      res.json({ success: true, message: "Colección eliminada con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- STATS ENDPOINT (ADMIN DASHBOARD) ---

  app.get("/api/stats", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const totalProducts = db.products.length;
      const lowStockAlerts = db.products.filter(p => p.stock <= 2);

      // Total catalog retail value (using regular or discounted price)
      const totalInventoryValue = db.products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);

      // Category product counts
      const categoryCounts = db.categories.map(c => {
        const count = db.products.filter(p => p.categoryId === c.id).length;
        return { name: c.name, count };
      });

      // Scheduled Launches Calendar
      const now = new Date();
      const scheduledLaunches = db.products
        .filter(p => p.isScheduled && p.launchDate && new Date(p.launchDate) > now)
        .map(p => ({
          id: p.id,
          name: p.name,
          launchDate: p.launchDate,
          stock: p.stock
        }));

      res.json({
        totalProducts,
        totalCategories: db.categories.length,
        totalInventoryValue,
        lowStockCount: lowStockAlerts.length,
        lowStockItems: lowStockAlerts.map(p => ({ id: p.id, name: p.name, stock: p.stock })),
        categoryDistribution: categoryCounts,
        scheduledLaunches
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- NEWSLETTER ROUTES ---

  // Register public email
  app.post("/api/newsletter", (req, res) => {
    try {
      const db = getDb();
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      // Simple email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Formato de correo electrónico inválido." });
      }

      db.newsletter = db.newsletter || [];
      const alreadyRegistered = db.newsletter.some(sub => sub.email.toLowerCase() === email.toLowerCase());
      if (alreadyRegistered) {
        return res.status(400).json({ error: "Este correo electrónico ya se encuentra registrado." });
      }

      const newSubscription: NewsletterSubscription = {
        email: email.trim(),
        registeredAt: new Date().toISOString()
      };

      db.newsletter.push(newSubscription);
      saveDb(db);

      res.status(201).json({ success: true, message: "Suscripción completada con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get newsletter subscriptions (Admin only)
  app.get("/api/newsletter", requireAuth, (req, res) => {
    try {
      const db = getDb();
      res.json(db.newsletter || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete newsletter subscription (Admin only)
  app.delete("/api/newsletter", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "El correo electrónico es requerido para eliminar." });
      }

      db.newsletter = db.newsletter || [];
      const initialLength = db.newsletter.length;
      db.newsletter = db.newsletter.filter(sub => sub.email.toLowerCase() !== email.toLowerCase());

      if (db.newsletter.length === initialLength) {
        return res.status(404).json({ error: "Suscripción no encontrada." });
      }

      saveDb(db);
      res.json({ success: true, message: "Suscripción eliminada con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- COLLECTIONS ROUTES ---

  // Get collections (Public)
  app.get("/api/collections", (req, res) => {
    try {
      const db = getDb();
      res.json(db.collections || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Collection (Admin only)
  app.post("/api/collections", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { name, launchDate, coverImage } = req.body;
      if (!name || !launchDate || !coverImage) {
        return res.status(400).json({ error: "Faltan campos obligatorios para la colección (nombre, fecha de lanzamiento y portada)." });
      }

      db.collections = db.collections || [];
      const newCollection: Collection = {
        id: "col-" + Date.now(),
        name,
        launchDate: new Date(launchDate).toISOString(),
        coverImage,
        createdAt: new Date().toISOString()
      };

      db.collections.push(newCollection);
      saveDb(db);
      res.status(201).json(newCollection);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit Collection (Admin only)
  app.put("/api/collections/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      db.collections = db.collections || [];
      const collectionIndex = db.collections.findIndex(c => c.id === id);

      if (collectionIndex === -1) {
        return res.status(404).json({ error: "Colección no encontrada." });
      }

      const existingCollection = db.collections[collectionIndex];
      const { name, launchDate, coverImage } = req.body;

      const updatedCollection: Collection = {
        ...existingCollection,
        name: name !== undefined ? name : existingCollection.name,
        launchDate: launchDate !== undefined ? new Date(launchDate).toISOString() : existingCollection.launchDate,
        coverImage: coverImage !== undefined ? coverImage : existingCollection.coverImage
      };

      db.collections[collectionIndex] = updatedCollection;
      saveDb(db);
      res.json(updatedCollection);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Collection (Admin only)
  app.delete("/api/collections/:id", requireAuth, (req, res) => {
    try {
      const db = getDb();
      const { id } = req.params;
      db.collections = db.collections || [];

      const initialLength = db.collections.length;
      db.collections = db.collections.filter(c => c.id !== id);

      if (db.collections.length === initialLength) {
        return res.status(404).json({ error: "Colección no encontrada." });
      }

      saveDb(db);
      res.json({ success: true, message: "Colección eliminada con éxito." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Assistant Endpoint (Public)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "La clave API de Gemini (GEMINI_API_KEY) no está configurada. Por favor, añádala en el panel 'Settings > Secrets' de AI Studio para activar el asistente de IA." 
        });
      }

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "El historial de mensajes es inválido o requerido." });
      }

      // Initialize GoogleGenAI lazily
      const geminiAi = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const db = getDb();
      const categoriesText = db.categories.map(c => `- ${c.name} (${c.description || "Sin descripción"})`).join("\n");
      const productsText = db.products.map(p => {
        const priceText = p.salePrice < p.regularPrice ? `Precio de oferta: $${p.salePrice} MXN (antes $${p.regularPrice} MXN)` : `Precio: $${p.regularPrice} MXN`;
        const stockText = p.stock > 0 ? `Stock: ${p.stock} unidades` : "Agotado temporalmente";
        const launchText = p.isScheduled && p.launchDate ? `Disponible a partir de: ${p.launchDate}` : 'Disponible ahora';
        return `- ${p.name}: ${p.description}. ${priceText}. ${stockText}. ${launchText}. Categoría: ${p.categoryName}.`;
      }).join("\n");

      const collectionsText = (db.collections || []).map(c => `- Colección "${c.name}": Lanzamiento programado para el ${c.launchDate}`).join("\n");

      const systemInstruction = `Eres "Patuni", el Asistente de Inteligencia Artificial de Joyería Patuna en México.
Joyería Patuna es una marca de joyería moderna inspirada en el emblemático "pato dorado".
Tu misión es resolver las dudas de los clientes de manera DIRECTA, CLARA Y AL GRANO, pero manteniendo siempre un trato sumamente CORDIAL, amable, atento y profesional. Evita rodeos, discursos largos o lenguaje teatral. Responde con sencillez y educación.

--- REGLA DE ORO SOBRE EL CATÁLOGO (CRÍTICA) ---
- DEBES BASARTE ÚNICAMENTE Y ESTRICTAMENTE EN LOS PRODUCTOS DETALLADOS EN LA SECCIÓN "PRODUCTOS DISPONIBLES" ABAJO.
- SI LA SECCIÓN "PRODUCTOS DISPONIBLES" DICE QUE NO HAY PRODUCTOS EN STOCK, TIENES ESTRICTAMENTE PROHIBIDO INVENTAR, SUGERIR O FABRICAR NOMBRES DE JOYAS, MODELOS, ANILLOS, DIJES O PRECIOS.
- Si no hay productos disponibles o publicados en el catálogo, dile directamente y con total honestidad al cliente: "Actualmente no tenemos productos publicados en nuestro catálogo en línea. Con gusto le puedo avisar en cuanto tengamos stock disponible, o si lo prefiere, puede contactarnos directamente por WhatsApp para que le informemos de piezas físicas disponibles en nuestra sucursal."

--- INFORMACIÓN CLAVE SOBRE NUESTROS MATERIALES ---
1. **Actualmente SÓLO ofrecemos piezas de Acero Inoxidable** de alta calidad.
2. **Próximamente tendremos colecciones de Oro y Diamantes**. Por el momento NO están a la venta, pero puedes indicarle al cliente que estén atentos a los próximos lanzamientos en la web.

--- CATALOGO DE LA TIENDA EN TIEMPO REAL ---

--- CATEGORÍAS ---
${categoriesText || "No hay categorías registradas aún."}

--- PRODUCTOS DISPONIBLES ---
${productsText || "No hay productos en stock en este momento."}

--- PRÓXIMAS COLECCIONES PRIVADAS ---
${collectionsText || "No hay próximas colecciones programadas actualmente."}

--- POLÍTICAS DE LA MARCA ---
1. **NO TRABAJAMOS JOYAS PERSONALIZADAS**: No ofrezcas que hagamos, diseñemos o fabriquemos joyas a medida o personalizadas. Si el cliente lo solicita, explícale amablemente que no contamos con ese servicio, solo vendemos los modelos del catálogo.
2. **Alternativa para Productos Agotados**: Si una pieza solicitada o joya de catálogo está agotada o no disponible en stock, ofrécele registrar su interés para avisarle/informarle de inmediato en cuanto la joya o producto vuelva a estar disponible en stock en la tienda.
3. **Contacto por WhatsApp**: Si hay algo que no puedas resolver al 100%, o si el cliente requiere atención personalizada humana directa para cerrar su compra, ofrécele siempre ponerse en contacto con nuestro equipo de atención por medio de WhatsApp para que le asistamos de inmediato.

--- REGLAS DE ATENCIÓN AL CLIENTE ---
1. Responde en idioma español de México de forma natural, muy cordial, servicial y directa al grano.
2. Si el cliente consulta sobre un artículo disponible, dile directamente su precio en pesos mexicanos (MXN) y el stock actual. Recuerda recalcar que son piezas de acero inoxidable de excelente durabilidad.
3. Si un artículo está agotado (0 unidades), indícale de forma directa que no contamos con stock por ahora, pero que le avisaremos en cuanto esté disponible de nuevo. No ofrezcas fabricación personalizada ni rediseño bajo pedido.
4. Si te preguntan por oro o diamantes, aclara amablemente que son para nuestras próximas colecciones y que por ahora nuestro catálogo disponible es de acero inoxidable.
5. Si el usuario te hace preguntas ajenas a joyería, reencauza amistosamente el chat indicándole de manera directa que estás aquí solo para asesorarle en nuestro catálogo de joyería.
6. Si no puedes contestar una duda o resolverla al 100%, indícale de inmediato de forma muy clara que puede contactarse por WhatsApp para que un asesor le resuelva en un instante.
`;

      // Map client-side message structure to `@google/genai` contents format
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || m.text || "" }]
      }));

      // Generate response from gemini-3.5-flash
      const response = await geminiAi.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "Disculpe, distinguido cliente. He tenido un breve inconveniente al procesar su solicitud. ¿Podría repetirla?";
      res.json({ text });

    } catch (err: any) {
      console.error("[Gemini API Error]:", err);
      res.status(500).json({ error: "Disculpe el inconveniente. Ha ocurrido un error en mi sistema de comunicación. Detalles: " + err.message });
    }
  });

  // Vite development vs production serving logic
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Joyería Patuna Backend] Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();
