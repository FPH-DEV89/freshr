# 🧠 Résumé Global du Projet : Freshr (Moteur Ruflo)

Ce document sert de **base de connaissances ultra-légère** pour les assistants IA. Il permet de comprendre instantanément l'architecture, l'état actuel et les spécificités de Freshr afin d'économiser votre quota de tokens lors de l'ouverture de nouvelles discussions.

---

## 🎯 1. Directives de Comportement (Toujours Appliquées)

*   **Précision Chirurgicale :** Faites exactement ce qui est demandé, ni plus, ni moins.
*   **Économie de Fichiers :** Ne créez JAMAIS de nouveaux fichiers à moins que ce ne soit strictement nécessaire pour atteindre l'objectif. Privilégiez systématiquement l'édition de fichiers existants.
*   **Documentation Contrôlée :** Ne créez jamais de fichiers de documentation (`*.md`, `README`) de votre propre initiative, sauf demande explicite.
*   **Organisation Structurée :** Ne sauvegardez jamais de fichiers de travail temporaires, de brouillons ou de tests à la racine du projet. Utilisez les dossiers dédiés (`/src`, `/tests`, `/docs`, `/config`, `/scripts`).
*   **Règle d'Or :** Toujours LIRE un fichier dans son intégralité avec `view_file` avant de le modifier.
*   **Sécurité Maximale :** Ne commitez JAMAIS de secrets, de clés d'API ou de fichiers `.env`.

---

## 🧠 2. Règles Spécifiques au Projet Freshr (Next.js & Supabase)

*   **Directive 'use client' (CRITIQUE) :** Toujours ajouter `'use client'` en première ligne de tout composant React utilisant des hooks (`useState`, `useEffect`, `useRouter`, etc.). L'oublier provoquera un plantage.
*   **Next.js 15+ Standards :** Ce projet utilise des conventions Next.js récentes. Vérifiez les signatures d'APIs dans les documentations locales si nécessaire.
*   **Sécurité Supabase :** Toute nouvelle table ou vue SQL doit être configurée avec des politiques de sécurité strictes (RLS) et l'option `security_invoker = true` pour éviter toute fuite de données inter-utilisateurs.

---

## 🤝 3. Orchestration Multi-Agents (Mémoire Partagée & Bus)

*   **Coordination par la Mémoire :** Pour les tâches complexes impliquant plusieurs sous-agents, utilisez l'espace mémoire partagé (`memory_store` / `memory_search`) comme bus de communication.
*   **Règle de Spawning :** Ne lancez des sous-agents en parallèle que si leurs tâches sont 100 % indépendantes. Pour les tâches séquentielles, attendez la validation de l'étape précédente avant de lancer l'agent suivant.
*   **Modes SPARC disponibles via le CLI Ruflo :**
    *   **Sécurité :** `npx claude-flow sparc run security-review "auditer [cible]"`
    *   **Design / UI :** `npx claude-flow sparc run designer "créer [composant]"`
    *   **Innovation :** `npx claude-flow sparc run innovator "solutions pour [problème]"`
    *   **Supabase Admin :** `npx claude-flow sparc run supabase-admin "requête"`

---

## 🛠️ 4. Validation & Qualité

*   **Tests Systématiques :** Après toute modification de code, exécutez les tests locaux pour valider le comportement.
*   **Vérification de Build :** Assurez-vous que le build de production compile correctement avant de finaliser la tâche :
    ```bash
    npm run build
    ```
