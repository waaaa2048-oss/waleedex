"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { ProductDTO } from "@/lib/types";

export type SelectedCartOption = {
  modifierName: string;
  value: string;
  label: string;
  priceDelta: number;
};

export type CartLine = {
  id: number;
  key?: string;
  productId?: number;
  storeId?: number;
  storeSlug?: string;
  storeType?: string;
  selectedOptions?: SelectedCartOption[];
  name: string;
  price: number;
  imageUrl?: string | null;
  image?: string | null;
  category: string;
  product?: { image?: string | null };
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  isReady: boolean;
  favorites: number[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  lastAdded: number | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    product: Pick<ProductDTO, "id" | "name" | "price" | "imageUrl" | "category" | "storeId" | "storeType">,
    quantity?: number,
    selectedOptions?: SelectedCartOption[],
  ) => void;
  setQuantity: (id: number | string, quantity: number) => void;
  removeItem: (id: number | string) => void;
  clear: () => void;
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const FAV_KEY = "waleedex.favorites.v1";

function getCartKeyForSlug(storeSlug: string): string {
  return `waleedex.cart.${storeSlug}.v1`;
}

export function CartProvider({
  children,
  storeId,
  storeSlug = "",
}: {
  children: ReactNode;
  storeId: number;
  storeSlug: string;
}) {
  const pathname = usePathname();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [loadedStoreSlug, setLoadedStoreSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const storedCart = window.localStorage.getItem(getCartKeyForSlug(storeSlug));
        const parsedCart = storedCart ? (JSON.parse(storedCart) as unknown) : [];
        const storeLines = Array.isArray(parsedCart)
          ? parsedCart.filter(
              (line): line is CartLine =>
                Boolean(line) &&
                typeof line === "object" &&
                (line as CartLine).storeId === storeId &&
                (line as CartLine).storeSlug === storeSlug,
            )
          : [];
        setLines(storeLines);
        const storedFav = window.localStorage.getItem(FAV_KEY);
        if (storedFav) {
          const parsedFavorites = JSON.parse(storedFav) as unknown;
          if (Array.isArray(parsedFavorites)) {
            setFavorites(parsedFavorites.filter((id): id is number => Number.isInteger(id)));
          }
        }
      } catch {
        setLines([]);
      }
      window.sessionStorage.setItem("waleedex.last-store-slug", storeSlug);
      document.cookie = `waleedex.last-store-slug=${encodeURIComponent(storeSlug)}; Path=/; SameSite=Lax`;
      setLoadedStoreSlug(storeSlug);
    });
    return () => {
      active = false;
    };
  }, [pathname, storeId, storeSlug]);

  useEffect(() => {
    if (loadedStoreSlug !== storeSlug) return;
    try {
      window.localStorage.setItem(getCartKeyForSlug(storeSlug), JSON.stringify(lines));
    } catch (error) {
      console.error("Could not save this store's cart:", error);
    }
  }, [lines, loadedStoreSlug, storeSlug]);

  useEffect(() => {
    if (loadedStoreSlug !== storeSlug) return;
    try {
      window.localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Could not save favorites:", error);
    }
  }, [favorites, loadedStoreSlug, storeSlug]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    (product, quantity = 1, selectedOptions = []) => {
      if (product.storeId !== storeId) {
        window.alert("لا يمكن إضافة منتج من متجر آخر إلى سلة هذا المتجر.");
        return;
      }

      const optionKey = selectedOptions.map((option) => `${option.modifierName}:${option.value}`).sort().join("|");
      const key = `${product.id}:${optionKey}`;
      const unitPrice = product.price + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

      setLines((current) => {
        const existing = current.find((line) => (line.key ?? String(line.id)) === key);
        if (existing) {
          return current.map((line) =>
            (line.key ?? String(line.id)) === key
              ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
              : line,
          );
        }

        return [
          ...current,
          {
            id: product.id,
            key,
            productId: product.id,
            storeId,
            storeSlug,
            storeType: product.storeType,
            name: product.name,
            price: unitPrice,
            selectedOptions,
            imageUrl: product.imageUrl,
            image: product.imageUrl,
            category: product.category,
            product: { image: product.imageUrl },
            quantity,
          },
        ];
      });
      setLastAdded(product.id);
      setTimeout(() => setLastAdded(null), 1800);
    },
    [storeId, storeSlug],
  );

  const setQuantity = useCallback((id: number | string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => (line.key ?? String(line.id)) !== String(id))
        : current.map((line) => ((line.key ?? String(line.id)) === String(id) ? { ...line, quantity: Math.min(99, quantity) } : line)),
    );
  }, []);

  const removeItem = useCallback((id: number | string) => {
    setLines((current) => current.filter((line) => (line.key ?? String(line.id)) !== String(id)));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    try {
      window.localStorage.removeItem(getCartKeyForSlug(storeSlug));
    } catch {
      // ignore
    }
  }, [storeSlug]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const visibleLines = loadedStoreSlug === storeSlug ? lines : [];
    const count = visibleLines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = visibleLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    return {
      lines: visibleLines,
      isReady: loadedStoreSlug === storeSlug,
      favorites,
      count,
      subtotal,
      isOpen,
      lastAdded,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clear,
      toggleFavorite,
      isFavorite: (id: number) => favorites.includes(id),
    };
  }, [lines, loadedStoreSlug, storeSlug, favorites, isOpen, lastAdded, addItem, setQuantity, removeItem, clear, toggleFavorite]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
