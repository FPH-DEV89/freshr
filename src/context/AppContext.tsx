"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export interface Foyer {
  id: string;
  name: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  foyer_id: string;
  name: string;
  location: "FRIGO_1" | "FRIGO_2" | "PLACARD";
  status: "PLEIN" | "MOYEN" | "PRESQUE_VIDE";
  expiration_date: string | null;
  is_opened: boolean;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  foyer_id: string;
  name: string;
  checked: boolean;
  target_location: "FRIGO_1" | "FRIGO_2" | "PLACARD";
  created_at: string;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  foyer: Foyer | null;
  stock: StockItem[];
  shoppingList: ShoppingItem[];
  isLocalMode: boolean;
  createFoyer: (name: string) => Promise<void>;
  joinFoyer: (foyerId: string) => Promise<void>;
  leaveFoyer: () => void;
  addStockItem: (item: Omit<StockItem, "id" | "foyer_id" | "created_at">) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<Omit<StockItem, "id" | "foyer_id" | "created_at">>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  addShoppingItem: (name: string, target_location?: "FRIGO_1" | "FRIGO_2" | "PLACARD") => Promise<void>;
  toggleShoppingItem: (id: string, checked: boolean) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  clearCompletedShoppingItems: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [foyer, setFoyer] = useState<Foyer | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // 1. Initialisation de l'authentification anonyme avec repli local si indisponible
  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsLocalMode(false);
        } else {
          // Essayer d'abord la connexion anonyme native
          try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (!error && data?.user) {
              setUser(data.user);
              setIsLocalMode(false);
              return;
            }
          } catch (e) {
            // Continuer vers l'autre repli
          }

          // Repli robuste par compte invité persistant
          let guestEmail = localStorage.getItem("freshr_guest_email");
          let guestPassword = localStorage.getItem("freshr_guest_password");

          if (!guestEmail || !guestPassword) {
            const uuid = Math.random().toString(36).substring(2, 15);
            guestEmail = `guest-${uuid}@freshr.app`;
            guestPassword = `GuestPass-${uuid}-${Math.random().toString(36).substring(2, 10)}`;
            localStorage.setItem("freshr_guest_email", guestEmail);
            localStorage.setItem("freshr_guest_password", guestPassword);
          }

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: guestEmail,
            password: guestPassword,
          });

          if (signInError) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: guestEmail,
              password: guestPassword,
            });

            if (signUpError) throw signUpError;
            if (signUpData?.user) {
              setUser(signUpData.user);
              setIsLocalMode(false);
            }
          } else if (signInData?.user) {
            setUser(signInData.user);
            setIsLocalMode(false);
          }
        }
      } catch (err) {
        console.warn("Supabase indisponible ou restreint, bascule en mode Local/Offline.");
        // Basculer sur l'authentification locale
        const localUser = {
          id: "local-guest-user",
          email: "local@freshr.app",
          aud: "authenticated",
          role: "authenticated",
          created_at: new Date().toISOString()
        } as any;
        setUser(localUser);
        setIsLocalMode(true);
      } finally {
        setLoading(false);
      }
    }
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsLocalMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Chargement du foyer de l'utilisateur (Gestion Hybride Supabase / LocalStorage)
  useEffect(() => {
    if (!user) {
      setFoyer(null);
      return;
    }

    async function loadFoyer() {
      if (!user) return;

      if (isLocalMode || user.id === "local-guest-user") {
        // Mode Local
        const savedFoyer = localStorage.getItem("freshr_local_foyer");
        if (savedFoyer) {
          setFoyer(JSON.parse(savedFoyer));
        } else {
          setFoyer(null);
        }
        return;
      }

      try {
        const { data: members, error: memError } = await supabase
          .from("foyer_members")
          .select("foyer_id")
          .eq("user_id", user.id);

        if (memError) throw memError;

        if (members && members.length > 0) {
          const foyerId = members[0].foyer_id;
          const { data: foyerData, error: foyError } = await supabase
            .from("foyers")
            .select("*")
            .eq("id", foyerId)
            .single();

          if (foyError) throw foyError;
          setFoyer(foyerData);
        } else {
          // Aucun foyer trouvé, tenter de chercher dans le cache local
          const savedFoyer = localStorage.getItem("freshr_local_foyer");
          if (savedFoyer) {
            setFoyer(JSON.parse(savedFoyer));
          } else {
            setFoyer(null);
          }
        }
      } catch (err) {
        console.warn("Erreur de connexion Supabase pour charger le foyer, repli local.");
        const savedFoyer = localStorage.getItem("freshr_local_foyer");
        if (savedFoyer) {
          setFoyer(JSON.parse(savedFoyer));
        }
      }
    }

    loadFoyer();
  }, [user, isLocalMode]);

  // 3. Abonnement temps réel ou gestion locale du Stock et de la Liste de Courses
  useEffect(() => {
    if (!foyer) {
      setStock([]);
      setShoppingList([]);
      return;
    }

    const foyerId = foyer.id;

    // Gestion Locale
    if (isLocalMode || foyerId.startsWith("local-")) {
      const savedStock = localStorage.getItem("freshr_local_stock");
      const savedShopping = localStorage.getItem("freshr_local_shopping");
      setStock(savedStock ? JSON.parse(savedStock) : []);
      setShoppingList(savedShopping ? JSON.parse(savedShopping) : []);
      return;
    }

    // Gestion Supabase
    async function loadInitialData() {
      try {
        const [stockRes, shoppingRes] = await Promise.all([
          supabase.from("stock_items").select("*").eq("foyer_id", foyerId).order("name", { ascending: true }),
          supabase.from("shopping_list").select("*").eq("foyer_id", foyerId).order("created_at", { ascending: false })
        ]);

        if (stockRes.error) throw stockRes.error;
        if (shoppingRes.error) throw shoppingRes.error;

        setStock(stockRes.data || []);
        setShoppingList(shoppingRes.data || []);
      } catch (err) {
        console.warn("Impossible de charger les données Supabase, chargement du cache local.");
        const savedStock = localStorage.getItem("freshr_local_stock");
        const savedShopping = localStorage.getItem("freshr_local_shopping");
        setStock(savedStock ? JSON.parse(savedStock) : []);
        setShoppingList(savedShopping ? JSON.parse(savedShopping) : []);
      }
    }

    loadInitialData();

    // S'abonner aux changements en temps réel
    const stockChannel = supabase
      .channel(`stock-changes-${foyerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_items", filter: `foyer_id=eq.${foyerId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setStock((prev) => [...prev, payload.new as StockItem].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === "UPDATE") {
            setStock((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as StockItem) : item))
            );
          } else if (payload.eventType === "DELETE") {
            setStock((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const shoppingChannel = supabase
      .channel(`shopping-changes-${foyerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_list", filter: `foyer_id=eq.${foyerId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setShoppingList((prev) => [payload.new as ShoppingItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setShoppingList((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as ShoppingItem) : item))
            );
          } else if (payload.eventType === "DELETE") {
            setShoppingList((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(shoppingChannel);
    };
  }, [foyer, isLocalMode]);

  // 4. Actions du Foyer
  const createFoyer = async (name: string) => {
    if (!user) throw new Error("Utilisateur non authentifié");

    // Mode Local / Repli direct si user est local
    if (isLocalMode || user.id === "local-guest-user") {
      const localFoyer = {
        id: "local-foyer-" + Math.random().toString(36).substring(2, 15),
        name,
        created_at: new Date().toISOString()
      };
      localStorage.setItem("freshr_local_foyer", JSON.stringify(localFoyer));
      setFoyer(localFoyer);
      return;
    }

    try {
      // 1. Créer le foyer dans Supabase
      const { data: foyerData, error: foyerError } = await supabase
        .from("foyers")
        .insert([{ name }])
        .select()
        .single();

      if (foyerError) throw foyerError;

      // 2. S'ajouter en admin
      const { error: memberError } = await supabase
        .from("foyer_members")
        .insert([{ foyer_id: foyerData.id, user_id: user.id, role: "admin" }]);

      if (memberError) throw memberError;

      setFoyer(foyerData);
      localStorage.setItem("freshr_local_foyer", JSON.stringify(foyerData));
    } catch (err) {
      console.warn("Échec de création Supabase, bascule et création en mode Local.");
      setIsLocalMode(true);
      const localFoyer = {
        id: "local-foyer-" + Math.random().toString(36).substring(2, 15),
        name,
        created_at: new Date().toISOString()
      };
      localStorage.setItem("freshr_local_foyer", JSON.stringify(localFoyer));
      setFoyer(localFoyer);
    }
  };

  const joinFoyer = async (foyerId: string) => {
    if (!user) throw new Error("Utilisateur non authentifié");

    if (isLocalMode || user.id === "local-guest-user" || foyerId.startsWith("local-")) {
      const mockFoyer = {
        id: foyerId,
        name: "Foyer Invité Local",
        created_at: new Date().toISOString()
      };
      localStorage.setItem("freshr_local_foyer", JSON.stringify(mockFoyer));
      setFoyer(mockFoyer);
      return;
    }

    try {
      const { data: foyerData, error: foyerError } = await supabase
        .from("foyers")
        .select("*")
        .eq("id", foyerId)
        .single();

      if (foyerError) throw new Error("Foyer introuvable. Veuillez vérifier l'identifiant.");

      const { error: memberError } = await supabase
        .from("foyer_members")
        .insert([{ foyer_id: foyerId, user_id: user.id, role: "member" }]);

      if (memberError) throw memberError;

      setFoyer(foyerData);
      localStorage.setItem("freshr_local_foyer", JSON.stringify(foyerData));
    } catch (err) {
      console.warn("Impossible de rejoindre le foyer distant, repli local.");
      const mockFoyer = {
        id: foyerId,
        name: "Foyer Invité Local",
        created_at: new Date().toISOString()
      };
      localStorage.setItem("freshr_local_foyer", JSON.stringify(mockFoyer));
      setFoyer(mockFoyer);
    }
  };

  const leaveFoyer = () => {
    setFoyer(null);
    setStock([]);
    setShoppingList([]);
    localStorage.removeItem("freshr_local_foyer");
    localStorage.removeItem("freshr_local_stock");
    localStorage.removeItem("freshr_local_shopping");
  };

  // 5. Actions du Stock (Hybride)
  const addStockItem = async (item: Omit<StockItem, "id" | "foyer_id" | "created_at">) => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-")) {
      const newItem: StockItem = {
        ...item,
        id: "local-item-" + Math.random().toString(36).substring(2, 15),
        foyer_id: foyer.id,
        created_at: new Date().toISOString()
      };
      const updated = [...stock, newItem].sort((a, b) => a.name.localeCompare(b.name));
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("stock_items")
        .insert([{ ...item, foyer_id: foyer.id }]);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec d'ajout Supabase, action exécutée localement.");
      const newItem: StockItem = {
        ...item,
        id: "local-item-" + Math.random().toString(36).substring(2, 15),
        foyer_id: foyer.id,
        created_at: new Date().toISOString()
      };
      const updated = [...stock, newItem].sort((a, b) => a.name.localeCompare(b.name));
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
    }
  };

  const updateStockItem = async (id: string, updates: Partial<Omit<StockItem, "id" | "foyer_id" | "created_at">>) => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-") || id.startsWith("local-")) {
      const updated = stock.map((item) => (item.id === id ? { ...item, ...updates } : item));
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("stock_items")
        .update(updates)
        .eq("id", id)
        .eq("foyer_id", foyer.id);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec d'update Supabase, action exécutée localement.");
      const updated = stock.map((item) => (item.id === id ? { ...item, ...updates } : item));
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
    }
  };

  const deleteStockItem = async (id: string) => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-") || id.startsWith("local-")) {
      const updated = stock.filter((item) => item.id !== id);
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("stock_items")
        .delete()
        .eq("id", id)
        .eq("foyer_id", foyer.id);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec de suppression Supabase, action exécutée localement.");
      const updated = stock.filter((item) => item.id !== id);
      setStock(updated);
      localStorage.setItem("freshr_local_stock", JSON.stringify(updated));
    }
  };

  // 6. Actions de la Liste de Courses (Hybride)
  const addShoppingItem = async (name: string, target_location: "FRIGO_1" | "FRIGO_2" | "PLACARD" = "FRIGO_1") => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-")) {
      const newItem: ShoppingItem = {
        id: "local-shop-" + Math.random().toString(36).substring(2, 15),
        foyer_id: foyer.id,
        name,
        checked: false,
        target_location,
        created_at: new Date().toISOString()
      };
      const updated = [newItem, ...shoppingList];
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("shopping_list")
        .insert([{ name, checked: false, target_location, foyer_id: foyer.id }]);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec d'ajout de course Supabase, action exécutée localement.");
      const newItem: ShoppingItem = {
        id: "local-shop-" + Math.random().toString(36).substring(2, 15),
        foyer_id: foyer.id,
        name,
        checked: false,
        target_location,
        created_at: new Date().toISOString()
      };
      const updated = [newItem, ...shoppingList];
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
    }
  };

  const toggleShoppingItem = async (id: string, checked: boolean) => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-") || id.startsWith("local-")) {
      // 1. Mettre à jour l'élément
      const updated = shoppingList.map((item) => (item.id === id ? { ...item, checked } : item));
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));

      // 2. Flux magique local : Ajouter au stock si coché
      if (checked) {
        const item = shoppingList.find((i) => i.id === id);
        if (item) {
          await addStockItem({
            name: item.name,
            location: item.target_location,
            status: "PLEIN",
            expiration_date: null,
            is_opened: false,
            barcode: null,
            image_url: null,
          });
        }
      }
      return;
    }

    try {
      const { data: updatedItem, error: updateError } = await supabase
        .from("shopping_list")
        .update({ checked })
        .eq("id", id)
        .eq("foyer_id", foyer.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (checked && updatedItem) {
        await addStockItem({
          name: updatedItem.name,
          location: updatedItem.target_location,
          status: "PLEIN",
          expiration_date: null,
          is_opened: false,
          barcode: null,
          image_url: null,
        });
      }
    } catch (err) {
      console.warn("Échec de toggle de course Supabase, action exécutée localement.");
      const updated = shoppingList.map((item) => (item.id === id ? { ...item, checked } : item));
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
      if (checked) {
        const item = shoppingList.find((i) => i.id === id);
        if (item) {
          await addStockItem({
            name: item.name,
            location: item.target_location,
            status: "PLEIN",
            expiration_date: null,
            is_opened: false,
            barcode: null,
            image_url: null,
          });
        }
      }
    }
  };

  const deleteShoppingItem = async (id: string) => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-") || id.startsWith("local-")) {
      const updated = shoppingList.filter((item) => item.id !== id);
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id)
        .eq("foyer_id", foyer.id);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec de suppression de course Supabase, action exécutée localement.");
      const updated = shoppingList.filter((item) => item.id !== id);
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
    }
  };

  const clearCompletedShoppingItems = async () => {
    if (!foyer) return;

    if (isLocalMode || foyer.id.startsWith("local-")) {
      const updated = shoppingList.filter((item) => !item.checked);
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("foyer_id", foyer.id)
        .eq("checked", true);
      if (error) throw error;
    } catch (err) {
      console.warn("Échec de nettoyage des courses Supabase, action exécutée localement.");
      const updated = shoppingList.filter((item) => !item.checked);
      setShoppingList(updated);
      localStorage.setItem("freshr_local_shopping", JSON.stringify(updated));
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        foyer,
        stock,
        shoppingList,
        isLocalMode,
        createFoyer,
        joinFoyer,
        leaveFoyer,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        clearCompletedShoppingItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
