---
description: Déployer les modifications sur le VPS Epi Manager
---

# Flux de déploiement automatique sur le VPS

Ce workflow permet de synchroniser le code local avec le serveur et de reconstruire les conteneurs sans demander d'approbation à chaque commande.

// turbo
1. Exécuter le script de synchronisation du schéma et des fichiers sources.
```powershell
# Sync schema
scp prisma/schema.prisma root@76.13.49.59:/root/epi-manager/prisma/schema.prisma
# Sync actions
scp app/actions.ts root@76.13.49.59:/root/epi-manager/app/actions.ts
# Sync admin page
scp app/admin/page.tsx root@76.13.49.59:/root/epi-manager/app/admin/page.tsx
# Sync components
scp components/manager-dashboard.tsx root@76.13.49.59:/root/epi-manager/components/manager-dashboard.tsx
```

// turbo
2. Déclencher le build et le restart Docker sur le serveur.
```powershell
ssh root@76.13.49.59 "cd /root/epi-manager && npx prisma db push && docker compose build web && docker compose up -d"
```
