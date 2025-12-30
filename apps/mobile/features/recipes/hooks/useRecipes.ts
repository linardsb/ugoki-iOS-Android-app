/**
 * Recipe hooks for fetching and managing recipes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { Recipe, RecipeSummary, RecipeFilter, MealType, DietTag } from '../types';

// ============ Query Keys ============
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: RecipeFilter) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  saved: () => [...recipeKeys.all, 'saved'] as const,
  featured: () => [...recipeKeys.all, 'featured'] as const,
};

// ============ List Recipes ============
interface UseRecipesOptions {
  meal_type?: MealType;
  diet_tags?: DietTag[];
  max_prep_time?: number;
  max_calories?: number;
  min_protein?: number;
  is_featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { identity } = useAuthStore();
  const { enabled = true, limit = 50, offset = 0, ...filters } = options;

  return useQuery({
    queryKey: recipeKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (identity?.id) params.append('identity_id', identity.id);
      if (filters.meal_type) params.append('meal_type', filters.meal_type);
      if (filters.diet_tags?.length) {
        filters.diet_tags.forEach(tag => params.append('diet_tags', tag));
      }
      if (filters.max_prep_time) params.append('max_prep_time', String(filters.max_prep_time));
      if (filters.max_calories) params.append('max_calories', String(filters.max_calories));
      if (filters.min_protein) params.append('min_protein', String(filters.min_protein));
      if (filters.is_featured !== undefined) params.append('is_featured', String(filters.is_featured));
      if (filters.search) params.append('search', filters.search);
      params.append('limit', String(limit));
      params.append('offset', String(offset));

      const { data } = await apiClient.get<RecipeSummary[]>(`/content/recipes?${params}`);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Featured Recipes ============
export function useFeaturedRecipes() {
  return useRecipes({ is_featured: true, limit: 10 });
}

// ============ Single Recipe ============
export function useRecipe(recipeId: string | null) {
  return useQuery({
    queryKey: recipeKeys.detail(recipeId || ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Recipe>(`/content/recipes/${recipeId}`);
      return data;
    },
    enabled: !!recipeId,
  });
}

// ============ Saved Recipes ============
export function useSavedRecipes(limit = 50, offset = 0) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: recipeKeys.saved(),
    queryFn: async () => {
      const params = new URLSearchParams({
        identity_id: identity?.id || '',
        limit: String(limit),
        offset: String(offset),
      });
      const { data } = await apiClient.get<RecipeSummary[]>(`/content/recipes/saved/list?${params}`);
      return data;
    },
    enabled: !!identity?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============ Save Recipe ============
export function useSaveRecipe() {
  const queryClient = useQueryClient();
  const { identity } = useAuthStore();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { data } = await apiClient.post('/content/recipes/saved', {
        recipe_id: recipeId,
      }, {
        params: { identity_id: identity?.id },
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate saved recipes and recipe lists to update is_saved status
      queryClient.invalidateQueries({ queryKey: recipeKeys.saved() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// ============ Unsave Recipe ============
export function useUnsaveRecipe() {
  const queryClient = useQueryClient();
  const { identity } = useAuthStore();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      await apiClient.delete(`/content/recipes/saved/${recipeId}`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.saved() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// ============ Toggle Save Recipe ============
export function useToggleSaveRecipe() {
  const saveRecipe = useSaveRecipe();
  const unsaveRecipe = useUnsaveRecipe();

  return {
    toggleSave: (recipeId: string, isSaved: boolean) => {
      if (isSaved) {
        return unsaveRecipe.mutateAsync(recipeId);
      } else {
        return saveRecipe.mutateAsync(recipeId);
      }
    },
    isLoading: saveRecipe.isPending || unsaveRecipe.isPending,
  };
}
