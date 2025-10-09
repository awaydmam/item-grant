/**
 * Request Optimizer untuk Vite.js + Supabase
 * Mengatasi masalah slow fetching dan HTTP interceptors
 */

import { supabase } from "@/integrations/supabase/client";

// Types
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

interface QueryOptions {
  filters?: Record<string, string | number | boolean>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  cacheKey?: string;
  cacheTTL?: number;
  debounceKey?: string;
  debounceDelay?: number;
}

// Cache untuk request yang sudah pernah dimuat
const requestCache = new Map<string, CacheEntry>();

// Debounce untuk menghindari request berulang
const debounceMap = new Map<string, NodeJS.Timeout>();

/**
 * Optimized fetch dengan caching dan debouncing
 */
export class RequestOptimizer {
  private static instance: RequestOptimizer;
  
  static getInstance(): RequestOptimizer {
    if (!RequestOptimizer.instance) {
      RequestOptimizer.instance = new RequestOptimizer();
    }
    return RequestOptimizer.instance;
  }

  /**
   * Cache request dengan TTL (Time To Live)
   */
  private getCachedData<T>(cacheKey: string): T | null {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`✅ Cache hit: ${cacheKey}`);
      return cached.data as T;
    }
    if (cached) {
      requestCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Simpan data ke cache
   */
  private setCachedData(cacheKey: string, data: unknown, ttlMs: number = 30000): void {
    requestCache.set(cacheKey, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Debounce request untuk menghindari duplicate calls
   */
  private debounceRequest<T>(key: string, callback: () => Promise<T>, delay: number = 300): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      const existingTimeout = debounceMap.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        try {
          const result = await callback();
          debounceMap.delete(key);
          resolve(result);
        } catch (error) {
          debounceMap.delete(key);
          reject(error);
        }
      }, delay);

      debounceMap.set(key, timeout);
    });
  }

  /**
   * Optimized items fetching khusus
   */
  async getOptimizedItems(departmentId?: string): Promise<unknown[]> {
    const cacheKey = `items_optimized_${departmentId || 'all'}`;
    
    // Check cache first
    const cachedData = this.getCachedData<unknown[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Debounced request
    return this.debounceRequest(
      cacheKey,
      async () => {
        console.log(`🔄 Fetching items: ${departmentId ? `dept-${departmentId}` : 'all'}`);
        
        let query = supabase
          .from('items')
          .select(`
            *,
            categories (id, name),
            departments (id, name)
          `);

        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error(`❌ Error fetching items:`, error);
          throw error;
        }

        // Cache the result for 1 minute
        this.setCachedData(cacheKey, data, 60000);
        
        console.log(`✅ Fetched and cached items: ${data?.length || 0} items`);
        return data || [];
      },
      200
    );
  }

  /**
   * Optimized departments fetching
   */
  async getOptimizedDepartments(): Promise<unknown[]> {
    const cacheKey = 'departments_optimized';
    
    const cachedData = this.getCachedData<unknown[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.debounceRequest(
      cacheKey,
      async () => {
        console.log('🔄 Fetching departments');
        
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, description')
          .order('name');

        if (error) {
          console.error('❌ Error fetching departments:', error);
          throw error;
        }

        // Cache for 5 minutes
        this.setCachedData(cacheKey, data, 300000);
        
        console.log(`✅ Fetched and cached departments: ${data?.length || 0} items`);
        return data || [];
      },
      100
    );
  }

  /**
   * Optimized categories fetching
   */
  async getOptimizedCategories(): Promise<unknown[]> {
    const cacheKey = 'categories_optimized';
    
    const cachedData = this.getCachedData<unknown[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.debounceRequest(
      cacheKey,
      async () => {
        console.log('🔄 Fetching categories');
        
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('❌ Error fetching categories:', error);
          throw error;
        }

        // Cache for 5 minutes
        this.setCachedData(cacheKey, data, 300000);
        
        console.log(`✅ Fetched and cached categories: ${data?.length || 0} items`);
        return data || [];
      },
      100
    );
  }

  /**
   * Clear cache for specific key or all
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      requestCache.delete(cacheKey);
      console.log(`🗑️ Cache cleared: ${cacheKey}`);
    } else {
      requestCache.clear();
      console.log('🗑️ All cache cleared');
    }
  }

  /**
   * Clear all debounce timers
   */
  clearDebounce(): void {
    debounceMap.forEach(timeout => clearTimeout(timeout));
    debounceMap.clear();
    console.log('🗑️ All debounce timers cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys())
    };
  }

  /**
   * Force refresh data (bypass cache)
   */
  async forceRefreshItems(departmentId?: string): Promise<unknown[]> {
    const cacheKey = `items_optimized_${departmentId || 'all'}`;
    this.clearCache(cacheKey);
    return this.getOptimizedItems(departmentId);
  }
}

// Export singleton instance
export const requestOptimizer = RequestOptimizer.getInstance();

// Export utility functions
export const getOptimizedItems = requestOptimizer.getOptimizedItems.bind(requestOptimizer);
export const getOptimizedDepartments = requestOptimizer.getOptimizedDepartments.bind(requestOptimizer);
export const getOptimizedCategories = requestOptimizer.getOptimizedCategories.bind(requestOptimizer);
export const clearRequestCache = requestOptimizer.clearCache.bind(requestOptimizer);
export const getCacheStats = requestOptimizer.getCacheStats.bind(requestOptimizer);
export const forceRefreshItems = requestOptimizer.forceRefreshItems.bind(requestOptimizer);