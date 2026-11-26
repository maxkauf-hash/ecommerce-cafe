import { count, eq, sql, type SQL } from 'drizzle-orm';
import { products } from '../db/schema';
import type { DrizzleDb } from '../interfaces/drizzle.interface';

export async function countCatalogProducts(db: DrizzleDb, where: SQL | undefined): Promise<number> {
  const [countRow] = await db.select({ count: count() }).from(products).where(where);

  return countRow?.count ?? 0;
}
