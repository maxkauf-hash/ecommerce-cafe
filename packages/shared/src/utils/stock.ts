export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(availableStock: number, lowStockThreshold = 5): StockStatus {
  if (availableStock <= 0) return 'OUT_OF_STOCK';
  if (availableStock <= lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
