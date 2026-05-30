import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { stockItems } = await request.json();

    if (!stockItems || !Array.isArray(stockItems) || stockItems.length === 0) {
      return NextResponse.json(
        { error: "La liste des aliments en stock est vide ou invalide." },
        { status: 400 }
      );
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    const model = process.env.NVIDIA_MODEL || "mistralai/mistral-large-3-675b-instruct-2512";
    const baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé d'API NVIDIA manquante sur le serveur." },
        { status: 500 }
      );
    }

    // Initialisation du client OpenAI-compatible (NVIDIA NIM)
    const client = new OpenAI({
      apiKey,
      baseURL,
    });

    // Préparation de la liste d'ingrédients
    const stockListText = stockItems
      .map((item: any) => {
        const daysLeft = item.expiration_date
          ? Math.ceil((new Date(item.expiration_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          : null;
        
        const urgency = daysLeft !== null && daysLeft <= 2
          ? "À CONSOMMER D'URGENCE"
          : daysLeft !== null && daysLeft <= 5
          ? "Bientôt périmé"
          : "Frais";
          
        return `- ${item.name} (Quantité/État: ${item.status}, Localisation: ${item.location}, Ouvert: ${item.is_opened ? "Oui" : "Non"}, Date de péremption: ${item.expiration_date || "Non spécifiée"} [${urgency}])`;
      })
      .join("\n");

    const systemPrompt = `Tu es un chef cuisinier gastronomique français spécialisé dans la lutte contre le gaspillage alimentaire.
Ton objectif est de créer exactement 3 recettes gourmandes, simples et créatives en utilisant EN PRIORITÉ ABSOLUE les aliments du frigo ou placard proches de leur date de péremption fournis par l'utilisateur.

RÈGLES D'INGÉNIERIE STRICTES :
1. Utilise en priorité les aliments marqués "À CONSOMMER D'URGENCE" ou "Bientôt périmé".
2. Tu es autorisé à ajouter des ingrédients basiques du placard (sel, poivre, eau, huile d'olive, vinaigre, sucre, beurre, farine de blé), mais N'AJOUTE AUCUN autre ingrédient frais ou majeur qui ne figure pas dans le stock fourni.
3. Sois très réaliste sur les portions et les associations.
4. Chaque recette doit contenir des étapes claires, séquentielles et numérotées.
5. Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.

STRUCTURE JSON ATTENDUE :
{
  "recipes": [
    {
      "title": "Nom accrocheur et gourmand de la recette",
      "prepTime": "Temps estimé (ex: 20 min)",
      "difficulty": "Facile | Moyen | Difficile",
      "ingredientsUsed": ["Nom de l'ingrédient 1 utilisé avec sa quantité estimée", "Ingrédient 2..."],
      "steps": [
        "Étape 1 : Explication claire...",
        "Étape 2 : Suite...",
        "Étape 3 : Fin et dressage..."
      ]
    }
  ]
}`;

    const userPrompt = `Voici le contenu actuel de mes réfrigérateurs et placards :
${stockListText}

Propose-moi 3 recettes magiques anti-gaspillage en respectant scrupuleusement les règles et le format JSON.`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "L'IA n'a renvoyé aucune réponse." },
        { status: 500 }
      );
    }

    // Extraction du JSON (gestion des cas où le modèle ajoute du texte autour)
    let jsonStr = content.trim();
    
    // Si le modèle enveloppe dans ```json ... ```, extraire le contenu
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const recipeData = JSON.parse(jsonStr);

    return NextResponse.json(recipeData);
  } catch (err: any) {
    console.error("Erreur NVIDIA/Mistral API:", err);
    return NextResponse.json(
      { error: "Une erreur s'est produite lors de la génération des recettes par l'IA." },
      { status: 500 }
    );
  }
}
