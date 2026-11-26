import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { categories, orderItems, orders, products, productVariants, users } from './schema.js';

type SeedCategory = {
  id: string;
  name: string;
  slug: string;
};

type SeedVariant = {
  id: string;
  sku: string;
  label: string;
  weightGrams: number;
  grind: 'WHOLE_BEAN' | 'ESPRESSO' | 'FILTER' | 'FRENCH_PRESS' | null;
  priceCents: number;
  availableStock: number;
  reservedStock: number;
};

type SeedProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tastingNotes: string[];
  origin: string | null;
  imageUrl: string | null;
  isActive: boolean;
  categorySlug: string;
  variants: SeedVariant[];
};

const SEED_CATEGORIES: SeedCategory[] = [
  { id: 'cat_origines', name: 'Origines', slug: 'origines' },
  { id: 'cat_blends', name: 'Blends', slug: 'blends' },
  { id: 'cat_accessoires', name: 'Accessoires & Matériel', slug: 'accessoires' },
];

const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 'prod_ethiopie_yirgacheffe',
    slug: 'ethiopie-yirgacheffe-kochere',
    title: 'Éthiopie Yirgacheffe Kochere',
    description:
      'Café de spécialité lavé cultivé en altitude (1 950 m). Profil floral et vif, idéal pour les extractions douces.',
    tastingNotes: ['Bergamote', 'Jasmin', 'Pêche blanche'],
    origin: 'Éthiopie — Yirgacheffe',
    imageUrl: '/images/coffees/ethiopie-yirgacheffe.jpg',
    isActive: true,
    categorySlug: 'origines',
    variants: [
      {
        id: 'var_eth_250_filter',
        sku: 'COF-ETH-250-FLT',
        label: '250g - Filtre / V60',
        weightGrams: 250,
        grind: 'FILTER',
        priceCents: 1490,
        availableStock: 18,
        reservedStock: 0,
      },
      {
        id: 'var_eth_250_bean',
        sku: 'COF-ETH-250-BEAN',
        label: '250g - Grains entiers',
        weightGrams: 250,
        grind: 'WHOLE_BEAN',
        priceCents: 1490,
        availableStock: 2, // Stock bas pour tester les alertes / limites
        reservedStock: 1,
      },
      {
        id: 'var_eth_1000_bean',
        sku: 'COF-ETH-1000-BEAN',
        label: '1kg - Grains entiers',
        weightGrams: 1000,
        grind: 'WHOLE_BEAN',
        priceCents: 5200,
        availableStock: 0, // Rupture de stock
        reservedStock: 0,
      },
    ],
  },
  {
    id: 'prod_colombie_huila',
    slug: 'colombie-huila-finca-la-palma',
    title: 'Colombie Huila — Finca La Palma',
    description:
      'Sélection de petits producteurs du Huila. Douceur caramélisée, corps rond et belle longueur en bouche.',
    tastingNotes: ['Caramel au beurre', 'Pomme rouge', 'Noisette'],
    origin: 'Colombie — Huila',
    imageUrl: '/images/coffees/colombie-huila.jpg',
    isActive: true,
    categorySlug: 'origines',
    variants: [
      {
        id: 'var_col_250_esp',
        sku: 'COF-COL-250-ESP',
        label: '250g - Expresso',
        weightGrams: 250,
        grind: 'ESPRESSO',
        priceCents: 1350,
        availableStock: 15,
        reservedStock: 0,
      },
      {
        id: 'var_col_250_bean',
        sku: 'COF-COL-250-BEAN',
        label: '250g - Grains entiers',
        weightGrams: 250,
        grind: 'WHOLE_BEAN',
        priceCents: 1350,
        availableStock: 12,
        reservedStock: 0,
      },
    ],
  },
  {
    id: 'prod_blend_atelier_espresso',
    slug: 'blend-atelier-n1-espresso',
    title: 'Blend Atelier N°1 — Expresso',
    description:
      'Notre assemblage signature (Brésil naturel + Colombie lavé) pensé pour un espresso sirupeux et équilibré, même avec un trait de lait.',
    tastingNotes: ['Chocolat noir', 'Praliné', 'Cerise noire'],
    origin: 'Brésil & Colombie',
    imageUrl: '/images/coffees/blend-atelier-1.jpg',
    isActive: true,
    categorySlug: 'blends',
    variants: [
      {
        id: 'var_bld1_250_esp',
        sku: 'BLD-01-250-ESP',
        label: '250g - Expresso',
        weightGrams: 250,
        grind: 'ESPRESSO',
        priceCents: 1190,
        availableStock: 30,
        reservedStock: 0,
      },
      {
        id: 'var_bld1_1000_esp',
        sku: 'BLD-01-1000-ESP',
        label: '1kg - Expresso',
        weightGrams: 1000,
        grind: 'ESPRESSO',
        priceCents: 3990,
        availableStock: 1, // Stock critique (1 unité)
        reservedStock: 0,
      },
      {
        id: 'var_bld1_1000_bean',
        sku: 'BLD-01-1000-BEAN',
        label: '1kg - Grains entiers',
        weightGrams: 1000,
        grind: 'WHOLE_BEAN',
        priceCents: 3990,
        availableStock: 0, // Rupture complète
        reservedStock: 0,
      },
    ],
  },
  {
    id: 'prod_dripper_ceramique_02',
    slug: 'dripper-ceramique-taille-02',
    title: 'Dripper Céramique Blanc — Taille 02',
    description:
      'Conical dripper en céramique à nervures hélicoïdales pour une extraction régulière de 1 à 4 tasses.',
    tastingNotes: [],
    origin: null,
    imageUrl: '/images/gear/dripper-02.jpg',
    isActive: true,
    categorySlug: 'accessoires',
    variants: [
      {
        id: 'var_drip_02_unit',
        sku: 'ACC-DRP-02-WHT',
        label: 'Unité - Blanc mat',
        weightGrams: 340,
        grind: null,
        priceCents: 2400,
        availableStock: 9,
        reservedStock: 0,
      },
    ],
  },
];

async function seed() {
  console.log('Début du seed catalogue café...');

  // 1. Catégories
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of SEED_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: cat.name,
          updatedAt: new Date(),
        },
      });

    const [saved] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug));

    if (saved) {
      categoryIdBySlug.set(cat.slug, saved.id);
    }
  }

  // 2. Produits & variantes
  for (const prod of SEED_PRODUCTS) {
    const categoryId = categoryIdBySlug.get(prod.categorySlug);
    if (!categoryId) {
      throw new Error(`Catégorie introuvable pour le seed : ${prod.categorySlug}`);
    }

    await db
      .insert(products)
      .values({
        id: prod.id,
        slug: prod.slug,
        title: prod.title,
        description: prod.description,
        tastingNotes: prod.tastingNotes,
        origin: prod.origin,
        imageUrl: prod.imageUrl,
        isActive: prod.isActive,
        categoryId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          title: prod.title,
          description: prod.description,
          tastingNotes: prod.tastingNotes,
          origin: prod.origin,
          imageUrl: prod.imageUrl,
          isActive: prod.isActive,
          categoryId,
          updatedAt: new Date(),
        },
      });

    const [savedProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, prod.slug));

    if (!savedProduct) {
      throw new Error(`Produit introuvable après upsert : ${prod.slug}`);
    }

    for (const variant of prod.variants) {
      await db
        .insert(productVariants)
        .values({
          id: variant.id,
          sku: variant.sku,
          label: variant.label,
          weightGrams: variant.weightGrams,
          grind: variant.grind,
          priceCents: variant.priceCents,
          availableStock: variant.availableStock,
          reservedStock: variant.reservedStock,
          productId: savedProduct.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: productVariants.sku,
          set: {
            label: variant.label,
            weightGrams: variant.weightGrams,
            grind: variant.grind,
            priceCents: variant.priceCents,
            availableStock: variant.availableStock,
            reservedStock: variant.reservedStock,
            productId: savedProduct.id,
            updatedAt: new Date(),
          },
        });
    }
  }

  // 3. Utilisateur démo (utile dès maintenant pour l'historique commande / Semaines 2-3)
  // Remplacez ce hash placeholder par un vrai hash Argon2 / bcrypt lors de l'auth en Semaine 2
  const demoEmail = 'client.demo@atelier-cafe.fr';
  await db
    .insert(users)
    .values({
      id: 'usr_demo_client',
      email: demoEmail,
      passwordHash: 'DEV_ONLY_NOT_A_REAL_HASH',
      fullName: 'Camille Laurent',
      role: 'USER',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        fullName: 'Camille Laurent',
        updatedAt: new Date(),
      },
    });

  const [demoUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, demoEmail));

  // 4. Commande exemple (historique réaliste avec snapshot dans OrderItem)
  const sampleOrderNumber = 'CMD-2026-0001';
  const unitPrice = 1350;
  const qty = 2;
  const subtotal = unitPrice * qty;

  await db
    .insert(orders)
    .values({
      id: 'ord_seed_0001',
      orderNumber: sampleOrderNumber,
      userId: demoUser?.id ?? null,
      customerEmail: demoEmail,
      status: 'PAID',
      subtotalCents: subtotal,
      shippingCents: 0,
      totalCents: subtotal,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: orders.orderNumber,
      set: {
        status: 'PAID',
        subtotalCents: subtotal,
        totalCents: subtotal,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(orderItems)
    .values({
      id: 'oi_seed_0001',
      orderId: 'ord_seed_0001',
      variantId: 'var_col_250_bean',
      productTitle: 'Colombie Huila — Finca La Palma',
      variantLabel: '250g - Grains entiers',
      sku: 'COF-COL-250-BEAN',
      unitPriceCents: unitPrice,
      quantity: qty,
      lineTotalCents: subtotal,
    })
    .onConflictDoNothing({ target: orderItems.id });

  console.log('Seed terminé avec succès.');
}

seed()
  .catch((err) => {
    console.error('Erreur pendant le seed :', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
