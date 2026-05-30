"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp, StockItem } from "@/context/AppContext";
import { 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  Utensils, 
  Layers, 
  Eye, 
  EyeOff, 
  ShoppingBag, 
  AlertTriangle,
  Loader2,
  Camera,
  X
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import Link from "next/link";
import { getFoodEmoji } from "@/lib/foodEmojis";

export default function Home() {
  const { 
    user, 
    loading, 
    foyer, 
    stock, 
    createFoyer, 
    joinFoyer, 
    addStockItem, 
    updateStockItem, 
    deleteStockItem 
  } = useApp();

  // Navigation locale
  const [activeTab, setActiveTab] = useState<"ALL" | "FRIGO_1" | "FRIGO_2" | "PLACARD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // États de l'onboarding
  const [foyerName, setFoyerName] = useState("");
  const [joinFoyerId, setJoinFoyerId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // État du formulaire d'ajout
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLocation, setNewItemLocation] = useState<"FRIGO_1" | "FRIGO_2" | "PLACARD">("FRIGO_1");
  const [newItemStatus, setNewItemStatus] = useState<"PLEIN" | "MOYEN" | "PRESQUE_VIDE">("PLEIN");
  const [newItemExpDate, setNewItemExpDate] = useState("");
  
  // État du partage Foyer
  const [isCopied, setIsCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // États des recettes IA Mistral
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);

  // États du Scanner de Code-barres
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef(false);

  // Effet de copie d'ID Foyer
  const handleCopyFoyerId = () => {
    if (foyer) {
      navigator.clipboard.writeText(foyer.id);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 1. Initialiser/Démarrer le Scanner
  useEffect(() => {
    if (showScanner) {
      isProcessingScanRef.current = false;
      const startScanner = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          
          const html5QrCode = new Html5Qrcode("reader", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            verbose: false
          });
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            async (decodedText) => {
              if (isProcessingScanRef.current) return;
              isProcessingScanRef.current = true;

              // Retour haptique vibratoire si supporté (PWA UX)
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(100);
              }

              setScanStatus("Recherche du produit sur Open Food Facts...");
              await handleBarcodeScanned(decodedText);
            },
            (errorMessage) => {}
          );
        } catch (err) {
          console.error("Erreur de démarrage caméra:", err);
          setScanStatus("Erreur caméra : Vérifiez les autorisations.");
          isProcessingScanRef.current = false;
        }
      };

      startScanner();
    } else {
      isProcessingScanRef.current = false;
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current = null;
          }).catch(err => console.error("Erreur d'arrêt caméra:", err));
        } else {
          html5QrCodeRef.current = null;
        }
      }
      setScanStatus(null);
    }

    return () => {
      isProcessingScanRef.current = false;
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Clean up camera error:", err));
      }
    };
  }, [showScanner]);

  // 2. Traitement du code-barres scanné via Open Food Facts API
  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const productName = data.product.product_name || data.product.product_name_fr || "Produit Inconnu";
        setNewItemName(productName);
        setScanStatus(`Produit trouvé : ${productName} !`);
        
        setTimeout(() => {
          setShowScanner(false);
          isProcessingScanRef.current = false;
        }, 1500);
      } else {
        setScanStatus("Produit inconnu. Remplissage manuel...");
        setNewItemName(`Produit (${barcode})`);
        
        setTimeout(() => {
          setShowScanner(false);
          isProcessingScanRef.current = false;
        }, 2000);
      }
    } catch (err) {
      console.error("Erreur de fetch Open Food Facts:", err);
      setScanStatus("Impossible de joindre Open Food Facts (Hors-ligne).");
      
      setNewItemName(`Produit scanné (${barcode})`);
      setTimeout(() => {
        setShowScanner(false);
        isProcessingScanRef.current = false;
      }, 2000);
    }
  };

  // 3. Soumission du formulaire d'ajout
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setActionLoading(true);
      await addStockItem({
        name: newItemName.trim(),
        location: newItemLocation,
        status: newItemStatus,
        expiration_date: newItemExpDate ? newItemExpDate : null,
        is_opened: false,
        barcode: null,
        image_url: null,
      });

      setNewItemName("");
      setNewItemExpDate("");
      setIsAddDrawerOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'aliment:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Empreinte du stock pour le cache IA
  const getStockFingerprint = () => {
    return stock
      .map(i => `${i.id}-${i.status}-${i.is_opened}-${i.expiration_date}`)
      .sort()
      .join("|");
  };

  // Charger le cache au démarrage
  useEffect(() => {
    if (stock.length === 0) return;
    const cachedFp = localStorage.getItem("freshr_recipes_fp");
    const cachedData = localStorage.getItem("freshr_recipes_cache");
    if (cachedFp && cachedData) {
      const currentFp = getStockFingerprint();
      if (cachedFp === currentFp) {
        setRecipes(JSON.parse(cachedData));
      }
    }
  }, [stock]);

  // 4. Génération de recettes Mistral IA
  const handleGenerateRecipes = async () => {
    if (stock.length === 0) {
      setRecipesError("Vous devez avoir des aliments en stock pour générer des recettes !");
      return;
    }

    const currentFp = getStockFingerprint();

    // Vérifier si on a déjà un cache valide pour éviter l'appel API inutile
    const cachedFp = localStorage.getItem("freshr_recipes_fp");
    const cachedData = localStorage.getItem("freshr_recipes_cache");
    if (cachedFp === currentFp && cachedData) {
      setRecipes(JSON.parse(cachedData));
      return;
    }

    try {
      setLoadingRecipes(true);
      setRecipesError(null);
      setRecipes([]);

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockItems: stock }),
      });

      const data = await response.json();

      if (response.ok && data.recipes) {
        setRecipes(data.recipes);
        // Mettre en cache
        localStorage.setItem("freshr_recipes_fp", currentFp);
        localStorage.setItem("freshr_recipes_cache", JSON.stringify(data.recipes));
      } else {
        setRecipesError(data.error || "Impossible de générer des recettes.");
      }
    } catch (err) {
      console.error("Erreur génération de recettes:", err);
      setRecipesError("Une erreur réseau s'est produite.");
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Filtre et recherche du stock
  const filteredStock = stock.filter((item) => {
    const matchesTab = activeTab === "ALL" || item.location === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Produits urgents / périmés pour l'alerte haute-couture (Bring! missing feature)
  const urgentItems = stock.filter(item => {
    if (!item.expiration_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(item.expiration_date);
    expiration.setHours(0, 0, 0, 0);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3; // Périmé ou expire sous 3 jours
  });

  // Calcul du niveau d'urgence d'un produit pour l'alerte visuelle
  const getExpirationStatus = (expDate: string | null) => {
    if (!expDate) return { text: "", style: "hidden", days: 999 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(expDate);
    expiration.setHours(0, 0, 0, 0);
    
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `PÉRIME (-${Math.abs(diffDays)}j)`, style: "text-red-700 font-bold border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] tracking-wide", days: diffDays };
    } else if (diffDays === 0) {
      return { text: "AUJOURD'HUI", style: "text-red-700 font-bold border border-red-300 bg-red-50 px-2 py-0.5 text-[9px] tracking-wide animate-pulse", days: diffDays };
    } else if (diffDays === 1) {
      return { text: "DEMAIN", style: "text-amber-800 font-semibold border border-amber-250 bg-amber-50 px-2 py-0.5 text-[9px] tracking-wide", days: diffDays };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} JOURS`, style: "text-amber-800 font-medium border border-amber-200 bg-amber-50/50 px-2 py-0.5 text-[9px] tracking-wide", days: diffDays };
    } else {
      return { text: `${diffDays} j`, style: "text-[#7c756c] border border-black/[0.04] px-1.5 py-0.5 text-[9px]", days: diffDays };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <Loader2 className="h-6 w-6 text-[var(--accent-primary)] animate-spin" />
        <p className="mt-4 text-xs font-mono tracking-widest text-[var(--accent-primary)]">FRESHR</p>
      </div>
    );
  }

  // VUE 1 : ONBOARDING (L'utilisateur n'a pas encore de Foyer)
  if (!foyer) {
    return (
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-16 bg-[var(--background)] text-[var(--foreground)]">
        <div className="w-full max-w-md text-center mb-14">
          <div className="flex justify-center items-baseline space-x-2.5 mb-2">
            <span className="text-4xl font-extrabold tracking-tight font-display bg-gradient-to-r from-[var(--foreground)] to-[var(--accent-primary)] bg-clip-text text-transparent">Freshr</span>
            <span className="border border-[var(--accent-border)] text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest text-[var(--accent-primary)]">PWA</span>
          </div>
          <p className="text-[var(--accent-primary)] font-display italic text-xs">Gérez vos réfrigérateurs en couple, évitez le gaspillage, cuisinez malin.</p>
        </div>

        <div className="w-full max-w-md space-y-12 animate-fade-in">
          {/* Créer un foyer */}
          <div className="glass-panel p-8">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-2 uppercase tracking-wider font-display border-b border-[var(--card-border)] pb-3">
              Créer un nouveau Foyer
            </h2>
            <p className="text-[#7c756c] text-xxs mb-8 leading-relaxed font-sans">Initialisez un foyer partagé et obtenez un identifiant unique de synchronisation.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!foyerName.trim()) return;
              try {
                setActionLoading(true);
                setAuthError(null);
                await createFoyer(foyerName.trim());
              } catch (err: any) {
                setAuthError(err.message || "Une erreur est survenue lors de la création.");
              } finally {
                setActionLoading(false);
              }
            }} className="space-y-6">
              <input
                type="text"
                placeholder="EX: FOYER PHILIBERT"
                value={foyerName}
                onChange={(e) => setFoyerName(e.target.value)}
                className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                required
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full h-11 btn-primary text-xxs tracking-widest flex items-center justify-center"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#ffffff]" /> : "CRÉER LE FOYER"}
              </button>
            </form>
          </div>

          {/* Rejoindre un foyer */}
          <div className="glass-panel p-8">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-2 uppercase tracking-wider font-display border-b border-[var(--card-border)] pb-3">
              Rejoindre un Foyer
            </h2>
            <p className="text-[#7c756c] text-xxs mb-8 leading-relaxed font-sans">Saisissez l'identifiant partagé par votre partenaire pour synchroniser vos écrans.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!joinFoyerId.trim()) return;
              try {
                setActionLoading(true);
                setAuthError(null);
                await joinFoyer(joinFoyerId.trim());
              } catch (err: any) {
                setAuthError(err.message || "Impossible de rejoindre le foyer.");
              } finally {
                setActionLoading(false);
              }
            }} className="space-y-6">
              <input
                type="text"
                placeholder="COLLEZ L'ID UNIQUE"
                value={joinFoyerId}
                onChange={(e) => setJoinFoyerId(e.target.value)}
                className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                required
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full h-11 btn-secondary text-xxs tracking-widest flex items-center justify-center"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground)]" /> : "REJOINDRE LE FOYER"}
              </button>
            </form>
          </div>

          {authError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xxs flex items-center gap-3 animate-fade-in uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="font-semibold">{authError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VUE 2 : DASHBOARD PRINCIPAL (L'utilisateur appartient à un Foyer actif)
  return (
    <div className="flex-1 flex flex-col pb-36 bg-[var(--background)] text-[var(--foreground)]">
      
      {/* 1. Header Haute-Couture */}
      <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--card-border)] px-6 py-5 flex items-center justify-between">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black font-display tracking-tight text-[var(--foreground)]">Freshr</span>
          <span className="text-[7px] text-[var(--accent-primary)] tracking-widest border border-[var(--accent-border)] px-1.5 py-0.2 uppercase font-bold">LIVE</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-[9px] text-[var(--accent-primary)] tracking-widest font-bold uppercase border border-[var(--card-border)] px-3 py-1.5">{foyer.name}</span>
          <button 
            onClick={() => setShowShareModal(true)}
            className="p-2 btn-secondary border-none text-[var(--accent-primary)] hover:text-[var(--foreground)] transition-all duration-200"
            title="Partager le Foyer"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="btn-primary h-8 px-4 text-[9px] tracking-widest font-bold flex items-center gap-1.5"
          >
            <Plus className="h-3 w-3" /> AJOUTER
          </button>
        </div>
      </header>

      <main className="px-6 py-8 space-y-12 max-w-4xl mx-auto w-full animate-fade-in">
        
        {/* 2. Barre de Recherche & Filtrage (Minimaliste) */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-3.5 h-4 w-4 text-[var(--accent-primary)]" />
            <input
              type="text"
              placeholder="RECHERCHER UN ALIMENT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-7 pr-4 glass-input text-xxs uppercase tracking-wider font-semibold"
            />
          </div>
          <div className="flex overflow-x-auto gap-3 pb-1 md:pb-0 scrollbar-none">
            {(["ALL", "FRIGO_1", "FRIGO_2", "PLACARD"] as const).map((tab) => {
              const label = 
                tab === "ALL" ? "TOUT" :
                tab === "FRIGO_1" ? "FRIGO 1 🔵" :
                tab === "FRIGO_2" ? "FRIGO 2 🟣" : "PLACARD 🟡";
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-11 px-4 text-[9px] tracking-widest font-bold transition-all duration-300 ${
                    active 
                      ? "border-b-2 border-[var(--accent-primary)] text-[var(--foreground)]" 
                      : "text-[#7c756c] hover:text-[var(--foreground)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. ALERTE DE PÉREMPTION (Bring! Missing Feature) */}
        {urgentItems.length > 0 && searchQuery === "" && activeTab === "ALL" && (
          <section className="animate-fade-in border border-red-200 bg-red-50/50 p-6">
            <div className="flex items-center space-x-2.5 mb-4 border-b border-red-200 pb-3">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              <h2 className="text-[10px] font-extrabold tracking-widest text-red-600 uppercase font-sans">
                ALERTE PÉREMPTION : À CONSOMMER D'URGENCE
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xxs font-sans text-[var(--foreground)]">
                <thead>
                  <tr className="border-b border-black/[0.04] text-[9px] text-[var(--accent-primary)] tracking-wider uppercase font-bold">
                    <th className="py-2.5">Produit</th>
                    <th className="py-2.5">Localisation</th>
                    <th className="py-2.5 text-right">Statut</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {urgentItems.map((item) => {
                    const status = getExpirationStatus(item.expiration_date);
                    return (
                      <tr key={item.id} className="hover:bg-black/[0.01] transition-colors">
                        <td className="py-3 flex items-center font-bold">
                          <span className="mr-2 text-sm leading-none">{getFoodEmoji(item.name)}</span>
                          <span>{item.name}</span>
                          {item.is_opened && <span className="ml-2 text-[8px] border border-amber-600/30 text-amber-700 px-1 font-bold">OUVERT</span>}
                        </td>
                        <td className="py-3 text-[#7c756c] uppercase font-bold text-[9px]">
                          {item.location === "FRIGO_1" ? "Frigo 1 🔵" : item.location === "FRIGO_2" ? "Frigo 2 🟣" : "Placard 🟡"}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`${status.style} font-bold`}>{status.text}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => deleteStockItem(item.id)}
                            className="text-[var(--accent-primary)] hover:text-red-600 transition-colors uppercase text-[9px] font-bold"
                          >
                            Consommé
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. BRING! STYLE : GRILLE DE STOCK TACTILE (Visual Grid Tiles) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--foreground)] tracking-wider uppercase font-display flex items-baseline gap-2.5">
              <span>Inventaire du Stock</span>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-normal">({filteredStock.length})</span>
            </h2>
          </div>

          {filteredStock.length === 0 ? (
            <div className="border border-dashed border-[var(--card-border)] p-12 text-center">
              <p className="text-[#7c756c] text-xxs font-medium uppercase tracking-wider">Aucun aliment ne correspond dans cette zone.</p>
              <button 
                onClick={() => setIsAddDrawerOpen(true)}
                className="mt-6 text-xxs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1.5 font-bold uppercase tracking-widest"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un aliment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredStock.map((item) => {
                const expStatus = getExpirationStatus(item.expiration_date);
                const locationLabel = 
                  item.location === "FRIGO_1" ? "🔵" :
                  item.location === "FRIGO_2" ? "🟣" : "🟡";

                // Couleur de la tuile si le produit est ouvert ou critique
                const isCritique = expStatus.days !== 999 && expStatus.days <= 1;
                
                return (
                  <div 
                    key={item.id} 
                    className={`bring-tile group ${isCritique ? "border-red-300 bg-red-50/20" : ""} ${item.is_opened ? "bring-tile-active" : ""}`}
                  >
                    {/* Top Row : Compartiment & Expiration */}
                    <div className="flex items-start justify-between w-full">
                      <span className="text-[10px]" title={item.location}>
                        {locationLabel}
                      </span>
                      {item.expiration_date && (
                        <span className={`text-[8px] font-bold px-1 py-0.2 uppercase border ${
                          expStatus.days <= 0 
                            ? "text-red-700 border-red-200 bg-red-50" 
                            : expStatus.days <= 3 
                            ? "text-amber-800 border-amber-250 bg-amber-50" 
                            : "text-[#7c756c] border-black/[0.04]"
                        }`}>
                          {expStatus.days <= 0 ? "PÉRIMÉ" : `${expStatus.days}j`}
                        </span>
                      )}
                    </div>

                    {/* Middle : Central Large Food Emoji & Name */}
                    <div className="flex flex-col items-center justify-center w-full my-3 space-y-1">
                      <span className="text-3xl leading-none">{getFoodEmoji(item.name)}</span>
                      <span className="text-xxs font-bold text-[var(--foreground)] tracking-wide text-center uppercase truncate w-full">
                        {item.name}
                      </span>
                    </div>

                    {/* Bottom Row : Actions tactiles discrètes */}
                    <div className="flex items-center justify-between w-full border-t border-black/[0.03] pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newOpened = !item.is_opened;
                          const updates: any = { is_opened: newOpened };
                          
                          if (newOpened) {
                            const threeDaysFromNow = new Date();
                            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                            const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];
                            
                            if (item.expiration_date) {
                              updates.expiration_date = item.expiration_date < threeDaysStr ? item.expiration_date : threeDaysStr;
                            } else {
                              updates.expiration_date = threeDaysStr;
                            }
                          }
                          
                          updateStockItem(item.id, updates);
                        }}
                        className={`text-[8px] font-bold tracking-widest uppercase hover:text-[var(--foreground)] transition-colors ${
                          item.is_opened ? "text-[var(--accent-primary)]" : "text-[#7c756c]"
                        }`}
                        title={item.is_opened ? "Marquer fermé" : "Marquer ouvert"}
                      >
                        {item.is_opened ? "OUVERT" : "FERMÉ"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStockItem(item.id);
                        }}
                        className="text-[#7c756c] hover:text-red-600 transition-colors"
                        title="Consommé (Retirer)"
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

        {/* 5. RECOMMANDATION DU CHEF : CHRONIQUE GASTRONOMIQUE IA (Chef IA Anti-Gaspi) */}
        <section className="glass-panel p-10 space-y-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-6 border-b border-[var(--card-border)] pb-5">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[var(--foreground)] tracking-wider uppercase font-display flex items-baseline gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" /> Recommandation du Chef
              </h2>
              <p className="text-[var(--accent-primary)] text-xxs font-display italic">Chroniques et recettes sur-mesure d'après vos produits proches de la date de péremption.</p>
            </div>
            <button
              onClick={handleGenerateRecipes}
              disabled={loadingRecipes}
              className="btn-primary h-10 px-6 text-[9px] tracking-widest font-bold"
            >
              {loadingRecipes ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffffff]" /> INSPIRATION...
                </div>
              ) : (
                "ÉCRIRE 3 RECETTES"
              )}
            </button>
          </div>

          {/* Loader Recettes */}
          {loadingRecipes && (
            <div className="space-y-4 py-8 animate-pulse">
              <div className="h-4 bg-black/[0.02] w-1/3"></div>
              <div className="h-28 bg-black/[0.01] w-full"></div>
            </div>
          )}

          {/* Erreur Recettes */}
          {recipesError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xxs uppercase tracking-wider font-semibold">
              {recipesError}
            </div>
          )}

          {/* Affichage des Recettes en Colonnes Éditoriales */}
          {recipes.length > 0 && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[var(--card-border)]">
                {recipes.map((recipe, index) => (
                  <div key={index} className={`space-y-5 flex flex-col justify-between ${index > 0 ? "md:pl-8 pt-6 md:pt-0" : ""}`}>
                    <div className="space-y-3.5">
                      <span className="text-[8px] font-bold text-[var(--accent-primary)] uppercase tracking-widest">
                        {recipe.prepTime} • {recipe.difficulty}
                      </span>
                      <h4 className="text-lg font-bold text-[var(--foreground)] leading-snug font-display italic tracking-tight">
                        {recipe.title}
                      </h4>
                      
                      {/* Ingrédients */}
                      <div className="pt-2">
                        <span className="text-[9px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">Ingrédients du Stock :</span>
                        <ul className="text-xxs text-[#7c756c] space-y-1 mt-1.5 font-sans">
                          {recipe.ingredientsUsed.map((ing: string, i: number) => (
                            <li key={i} className="truncate">• {ing}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Étapes */}
                    <div className="pt-4 border-t border-black/[0.03]">
                      <span className="text-[9px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">Préparation :</span>
                      <ol className="text-xxs text-[#7c756c] space-y-2 mt-1.5 font-sans leading-relaxed">
                        {recipe.steps.map((step: string, i: number) => (
                          <li key={i}>
                            <span className="text-[#a68d63] font-bold mr-1">{i + 1}.</span> {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* 6. MODAL DE PARTAGE FOYER (Sharp laitonné) */}
      {showShareModal && foyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="glass-panel w-full max-w-sm p-8 space-y-6 bg-white">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">PARTAGER MON FOYER</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 text-[var(--accent-primary)] hover:text-[var(--foreground)] transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <p className="text-[#7c756c] text-xxs leading-relaxed font-sans">
              Pour connecter votre conjoint, partagez-lui cet identifiant de foyer unique. Il devra le coller à l'ouverture de son application.
            </p>
            <div className="flex items-center gap-3 p-3.5 bg-black/[0.02] border border-[var(--card-border)]">
              <span className="text-xxs font-mono text-[var(--foreground)] flex-1 truncate font-bold uppercase">{foyer.id}</span>
              <button
                onClick={handleCopyFoyerId}
                className="p-1 text-[var(--foreground)] hover:text-[var(--accent-primary)] transition-all duration-200"
              >
                {isCopied ? <Check className="h-4 w-4 text-[var(--accent-primary)]" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {isCopied && <p className="text-[8px] text-[var(--accent-primary)] text-center font-bold tracking-widest uppercase">Copié dans le presse-papier !</p>}
          </div>
        </div>
      )}

      {/* 7. DRAWER D'AJOUT D'ALIMENT (Sharp laitonné) */}
      {isAddDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md p-8 rounded-none space-y-6 max-h-[95vh] overflow-y-auto border-t border-[var(--accent-border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--accent-primary)]" /> Ajouter un aliment
              </h3>
              <button 
                onClick={() => setIsAddDrawerOpen(false)}
                className="p-1 text-[var(--accent-primary)] hover:text-[var(--foreground)] transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* SCANNER DE CODES-BARRES */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className={`w-full h-11 border text-xxs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-300 ${
                  showScanner 
                    ? "bg-red-50 border-red-200 text-red-700" 
                    : "bg-black/[0.02] border-[var(--card-border)] text-[var(--foreground)] hover:bg-black/[0.04]"
                }`}
              >
                <Camera className="h-4 w-4" /> 
                {showScanner ? "FERMER LE SCANNER" : "SCANNER UN CODE-BARRES"}
              </button>

              {showScanner && (
                <div className="border border-black/[0.04] relative bg-black overflow-hidden">
                  <div id="reader" className="w-full"></div>
                  
                  {/* Overlay de ciblage laser PWA Premium */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-[250px] h-[150px] relative flex items-center justify-center">
                      {/* Faisceau laser rouge pulsé */}
                      <div className="absolute left-1 right-1 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-laser-scan"></div>
                      
                      {/* Coins laiton patinés haut de gamme */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--accent-primary)]"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--accent-primary)]"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--accent-primary)]"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--accent-primary)]"></div>
                    </div>
                  </div>

                  {scanStatus && (
                    <div className="p-3 bg-black/[0.01] text-center text-xxs font-bold text-[var(--accent-primary)] border-t border-black/[0.04] uppercase tracking-wider relative z-10">
                      {scanStatus}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AJOUT EXPRESS (FRAIS / RESTES) */}
            <div className="space-y-2 border-t border-b border-black/[0.03] py-4">
              <label className="text-[8px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest block">Ajout Express (Frais / Restes)</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    const exp = new Date();
                    exp.setDate(exp.getDate() + 2);
                    const expStr = exp.toISOString().split("T")[0];
                    setActionLoading(true);
                    await addStockItem({
                      name: "Restes de repas",
                      location: "FRIGO_1",
                      status: "PLEIN",
                      expiration_date: expStr,
                      is_opened: true,
                      barcode: null,
                      image_url: null,
                    });
                    setActionLoading(false);
                    setIsAddDrawerOpen(false);
                  }}
                  className="bg-black/[0.01] border border-[var(--card-border)] hover:bg-black/[0.03] p-3 text-center flex flex-col items-center justify-center space-y-1 transition-all"
                >
                  <span className="text-xl">🍲</span>
                  <span className="text-[8px] font-bold text-[var(--foreground)] tracking-wider uppercase">Restes (2j)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const exp = new Date();
                    exp.setDate(exp.getDate() + 3);
                    const expStr = exp.toISOString().split("T")[0];
                    setActionLoading(true);
                    await addStockItem({
                      name: "Viande / Poisson",
                      location: "FRIGO_1",
                      status: "PLEIN",
                      expiration_date: expStr,
                      is_opened: false,
                      barcode: null,
                      image_url: null,
                    });
                    setActionLoading(false);
                    setIsAddDrawerOpen(false);
                  }}
                  className="bg-black/[0.01] border border-[var(--card-border)] hover:bg-black/[0.03] p-3 text-center flex flex-col items-center justify-center space-y-1 transition-all"
                >
                  <span className="text-xl">🥩</span>
                  <span className="text-[8px] font-bold text-[var(--foreground)] tracking-wider uppercase">Frais (3j)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setActionLoading(true);
                    await addStockItem({
                      name: "Fruits / Légumes",
                      location: "FRIGO_2",
                      status: "PLEIN",
                      expiration_date: null,
                      is_opened: false,
                      barcode: null,
                      image_url: null,
                    });
                    setActionLoading(false);
                    setIsAddDrawerOpen(false);
                  }}
                  className="bg-black/[0.01] border border-[var(--card-border)] hover:bg-black/[0.03] p-3 text-center flex flex-col items-center justify-center space-y-1 transition-all"
                >
                  <span className="text-xl">🥦</span>
                  <span className="text-[8px] font-bold text-[var(--foreground)] tracking-wider uppercase">F&L (F2 🟣)</span>
                </button>
              </div>
            </div>

            {/* FORMULAIRE CLASSIQUE */}
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[8px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">Nom de l'aliment</label>
                <input
                  type="text"
                  placeholder="EX: LAIT DEMI-ÉCRÉMÉ"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">Rangement</label>
                  <select
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value as any)}
                    className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                  >
                    <option value="FRIGO_1" className="bg-white">Frigo 1 🔵</option>
                    <option value="FRIGO_2" className="bg-white">Frigo 2 🟣</option>
                    <option value="PLACARD" className="bg-white">Placard 🟡</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">Quantité / État</label>
                  <select
                    value={newItemStatus}
                    onChange={(e) => setNewItemStatus(e.target.value as any)}
                    className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                  >
                    <option value="PLEIN" className="bg-white">Plein</option>
                    <option value="MOYEN" className="bg-white">Moyen</option>
                    <option value="PRESQUE_VIDE" className="bg-white">Presque vide</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-extrabold text-[var(--accent-primary)] uppercase tracking-widest">Date de péremption</label>
                <input
                  type="date"
                  value={newItemExpDate}
                  onChange={(e) => setNewItemExpDate(e.target.value)}
                  className="w-full h-11 px-0 glass-input text-xs font-semibold uppercase tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full h-11 btn-primary text-xxs tracking-widest font-bold"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#ffffff]" /> : "AJOUTER EN STOCK"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. BOTTOM FLOATING NAVIGATION ISLAND (UX PREMIUM PWA) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 nav-dock rounded-none px-10 py-4 flex justify-around max-w-sm w-[90%] shadow-2xl">
        <Link 
          href="/" 
          className="flex flex-col items-center gap-1.5 text-[var(--accent-primary)] hover:scale-105 transition-all"
        >
          <Layers className="h-4.5 w-4.5" />
          <span className="text-[8px] font-extrabold tracking-widest uppercase">Mon Stock</span>
        </Link>
        <Link 
          href="/courses" 
          className="flex flex-col items-center gap-1.5 text-[#7c756c] hover:text-[var(--foreground)] hover:scale-105 transition-all"
        >
          <ShoppingBag className="h-4.5 w-4.5" />
          <span className="text-[8px] font-extrabold tracking-widest uppercase">Courses</span>
        </Link>
      </nav>

    </div>
  );
}
