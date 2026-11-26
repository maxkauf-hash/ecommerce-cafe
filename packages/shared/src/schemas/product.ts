import { z } from 'zod';

export const grindOptionSchema = z.enum([
  'WHOLE_BEAN', // Grains entiers
  'ESPRESSO', // Expresso
  'FILTER', // Filtre / V60 / Chemex
  'FRENCH_PRESS', // Piston / Cafetière à piston
]);

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const productVariantSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  label: z.string().min(1), // Ex. : "250g - Grains" ou "1kg - Expresso"
  weightGrams: z.number().int().positive(),
  grind: grindOptionSchema.nullable(),
  priceCents: z.number().int().nonnegative(),
  availableStock: z.number().int().nonnegative(),
  reservedStock: z.number().int().nonnegative().default(0),
});

export const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  tastingNotes: z.array(z.string().min(1)).default([]),
  origin: z.string().nullable(),
  isActive: z.boolean().default(true),
  category: categorySchema,
  variants: z.array(productVariantSchema).min(1),
});

export type GrindOption = z.infer<typeof grindOptionSchema>;
export type Category = z.infer<typeof categorySchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;
