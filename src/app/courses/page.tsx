"use client";

import React, { useState, useEffect } from "react";
import { useApp, ShoppingItem } from "@/context/AppContext";
import { getFoodEmoji } from "@/lib/foodEmojis";
import { 
  Plus, 
  Trash2, 
  Layers, 
  ShoppingBag, 
  Check, 
  Trash, 
  Loader2, 
  ShoppingCart,
  AlertCircle,
  Camera,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function CoursesPage() {
  const { 
    foyer, 
    stock,
    shoppingList, 
    addShoppingItem, 
    toggleShoppingItem, 
    deleteShoppingItem, 
    clearCompletedShoppingItems 
  } = useApp();

  const [newItemName, setNewItemName] = useState("");
  const [newItemLocation, setNewItemLocation] = useState<"FRIGO_1" | "FRIGO_2" | "PLACARD">("FRIGO_1");
  const [loadingAction, setLoadingAction] = useState(false);

  // Apprentissage intelligent de la localisation des aliments
  useEffect(() => {
    if (!newItemName.trim() || stock.length === 0) return;
    
    const cleanName = newItemName.trim().toLowerCase();
    // Chercher un produit du même nom en stock
    const matchingItem = stock.find(item => item.name.toLowerCase().includes(cleanName));
    
    if (matchingItem) {
      setNewItemLocation(matchingItem.location);
    }
  }, [newItemName, stock]);

  // Séparer les articles en deux groupes
  const pendingItems = shoppingList.filter(item => !item.checked);
  const completedItems = shoppingList.filter(item => item.checked);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setLoadingAction(true);
      await addShoppingItem(newItemName.trim(), newItemLocation);
      setNewItemName("");
    } catch (err) {
      console.error("Erreur lors de l'ajout à la liste:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  if (!foyer) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-[var(--background)] text-[var(--foreground)] min-h-screen font-sans">
        <AlertCircle className="h-8 w-8 text-[var(--accent-primary)] mb-4" />
        <p className="text-xxs uppercase tracking-wider text-[#7c756c] max-w-xs text-center leading-relaxed">
          Veuillez d'abord initialiser un Foyer sur le tableau de bord principal.
        </p>
        <Link 
          href="/" 
          className="mt-8 h-10 px-6 btn-primary text-xxs tracking-widest font-bold flex items-center justify-center"
        >
          RETOUR AU STOCK
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-36 bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      
      {/* 1. Header Premium */}
      <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--card-border)] px-6 py-5 flex items-center justify-between">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black font-display tracking-tight text-[var(--foreground)]">Freshr</span>
          <span className="text-[7px] text-[var(--accent-primary)] tracking-widest border border-[var(--accent-border)] px-1.5 py-0.2 uppercase font-bold">COURSES</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] text-[var(--accent-primary)] tracking-widest font-bold uppercase border border-[var(--card-border)] px-3 py-1.5">{foyer.name}</span>
        </div>
      </header>

      <main className="px-6 py-8 space-y-12 max-w-xl mx-auto w-full animate-fade-in">
        
        {/* 2. Ajout rapide d'un article à la liste (Style Minimaliste) */}
        <section className="glass-panel p-6 space-y-6 bg-white">
          <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider font-display border-b border-[var(--card-border)] pb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[var(--accent-primary)]" /> Ajouter à ma liste
          </h2>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              placeholder="EX: 6 ŒUFS, CRÈME FRAÎCHE..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
              required
            />
            <button
              type="submit"
              disabled={loadingAction}
              className="h-11 px-6 btn-primary text-xxs tracking-widest font-bold flex items-center justify-center gap-1.5"
            >
              {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffffff]" /> : <Plus className="h-3.5 w-3.5" />} AJOUTER
            </button>
          </form>
        </section>

        {/* 3. Section À acheter (Bring!-style Visual Grid Tiles) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
            <h3 className="text-[10px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">
              À acheter ({pendingItems.length})
            </h3>
          </div>

          {pendingItems.length === 0 ? (
            <div className="border border-dashed border-[var(--card-border)] p-10 text-center text-xxs text-[#7c756c] uppercase tracking-wider font-semibold leading-relaxed">
              Votre liste de courses est vide. Bon appétit ! 🍎
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pendingItems.map((item) => {
                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleShoppingItem(item.id, true)}
                    className="bring-tile"
                  >
                    {/* Top Row : Status */}
                    <div className="flex items-start justify-end w-full">
                      <span className="text-[7px] text-[var(--accent-primary)] tracking-widest uppercase font-bold">
                        À ACHETER
                      </span>
                    </div>

                    {/* Middle : Product Large Food Emoji & Name */}
                    <div className="flex flex-col items-center justify-center w-full my-2 space-y-1">
                      <span className="text-3xl leading-none">{getFoodEmoji(item.name)}</span>
                      <span className="text-xxs font-bold text-[var(--foreground)] tracking-wide text-center uppercase truncate w-full">
                        {item.name}
                      </span>
                    </div>

                    {/* Bottom Row : Actions discrètes */}
                    <div className="flex items-center justify-between w-full border-t border-black/[0.03] pt-2">
                      <span className="text-[8px] font-bold text-[#627a6e] tracking-widest uppercase">
                        ACHETER ?
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteShoppingItem(item.id);
                        }}
                        className="text-[#7c756c] hover:text-red-600 transition-colors"
                        title="Retirer de la liste"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Section Achetés & FLUX MAGIQUE (Bring!-style Checked Tiles) */}
        {completedItems.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <h3 className="text-[10px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">
                Achetés & Transférés en Stock ({completedItems.length})
              </h3>
              <button
                onClick={clearCompletedShoppingItems}
                className="text-[9px] text-red-500 hover:underline flex items-center gap-1 font-bold uppercase tracking-widest"
              >
                <Trash className="h-3 w-3" /> Nettoyer la liste
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 opacity-50">
              {completedItems.map((item) => {
                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleShoppingItem(item.id, false)}
                    className="bring-tile bring-tile-active"
                  >
                    {/* Top Row : Validated status */}
                    <div className="flex items-start justify-end w-full">
                      <Check className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    </div>

                    {/* Middle : Product Large Food Emoji & Checked Strikethrough Name */}
                    <div className="flex flex-col items-center justify-center w-full my-2 space-y-1">
                      <span className="text-3xl leading-none">{getFoodEmoji(item.name)}</span>
                      <span className="text-xxs font-bold text-[var(--foreground)] line-through tracking-wide text-center uppercase truncate w-full">
                        {item.name}
                      </span>
                    </div>

                    {/* Bottom Row : Actions discrètes */}
                    <div className="flex items-center justify-between w-full border-t border-black/[0.03] pt-2">
                      <span className="text-[7px] text-[var(--accent-primary)] font-bold uppercase tracking-widest flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> STOCKÉ
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteShoppingItem(item.id);
                        }}
                        className="text-[#7c756c] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* 5. BOTTOM FLOATING NAVIGATION ISLAND (UX PREMIUM PWA) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 nav-dock rounded-none px-6 py-3 flex items-center justify-between max-w-sm w-[90%] shadow-2xl gap-2">
        <Link 
          href="/" 
          className="flex flex-col items-center gap-1.5 text-[#7c756c] hover:text-[var(--foreground)] hover:scale-105 transition-all flex-1"
        >
          <Layers className="h-4.5 w-4.5" />
          <span className="text-[7.5px] font-extrabold tracking-widest uppercase">Mon Stock</span>
        </Link>

        <Link 
          href="/?add=true"
          className="flex flex-col items-center gap-1.5 text-[#7c756c] hover:text-[var(--foreground)] hover:scale-105 transition-all flex-1"
        >
          <Plus className="h-4.5 w-4.5" />
          <span className="text-[7.5px] font-extrabold tracking-widest uppercase">Ajouter</span>
        </Link>

        <Link 
          href="/courses" 
          className="flex flex-col items-center gap-1.5 text-[var(--accent-primary)] hover:scale-105 transition-all flex-1"
        >
          <ShoppingBag className="h-4.5 w-4.5" />
          <span className="text-[7.5px] font-extrabold tracking-widest uppercase">Courses</span>
        </Link>

        <Link 
          href="/?recipes=true"
          className="flex flex-col items-center gap-1.5 text-[#7c756c] hover:text-[var(--foreground)] hover:scale-105 transition-all flex-1"
        >
          <Sparkles className="h-4.5 w-4.5" />
          <span className="text-[7.5px] font-extrabold tracking-widest uppercase">Recettes</span>
        </Link>
      </nav>

    </div>
  );
}
