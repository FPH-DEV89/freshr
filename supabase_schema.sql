-- SQL Migration Script for Freshr
-- Database Schema for Supabase
-- Target project: ZenFlow / Freshr shared DB (ref: doavmwjdozziqqulwdiy)

-- Création de la table foyers
CREATE TABLE IF NOT EXISTS public.foyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Activation de RLS sur la table foyers
ALTER TABLE public.foyers ENABLE ROW LEVEL SECURITY;

-- Création de la table foyer_members
CREATE TABLE IF NOT EXISTS public.foyer_members (
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role = ANY (ARRAY['admin', 'member'])),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (foyer_id, user_id)
);

-- Activation de RLS sur foyer_members
ALTER TABLE public.foyer_members ENABLE ROW LEVEL SECURITY;

-- Création de la table stock_items
CREATE TABLE IF NOT EXISTS public.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL CHECK (location = ANY (ARRAY['FRIGO_1', 'FRIGO_2', 'PLACARD'])),
    status TEXT NOT NULL DEFAULT 'PLEIN' CHECK (status = ANY (ARRAY['PLEIN', 'MOYEN', 'PRESQUE_VIDE'])),
    expiration_date DATE,
    is_opened BOOLEAN DEFAULT false NOT NULL,
    barcode TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Activation de RLS sur stock_items
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- Création de la table shopping_list
CREATE TABLE IF NOT EXISTS public.shopping_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id UUID REFERENCES public.foyers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    checked BOOLEAN DEFAULT false NOT NULL,
    target_location TEXT NOT NULL DEFAULT 'FRIGO_1' CHECK (target_location = ANY (ARRAY['FRIGO_1', 'FRIGO_2', 'PLACARD'])),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Activation de RLS sur shopping_list
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- POLITIQUES RLS (Row Level Security)

-- Foyers : un utilisateur peut voir/modifier un foyer s'il en est membre
CREATE POLICY foyer_read_policy ON public.foyers
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_members.foyer_id = id AND foyer_members.user_id = auth.uid()
    ));

CREATE POLICY foyer_write_policy ON public.foyers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_members.foyer_id = id AND foyer_members.user_id = auth.uid() AND foyer_members.role = 'admin'
    ));

-- Foyer Members : un utilisateur peut voir les membres s'il appartient lui-même à ce foyer
CREATE POLICY foyer_members_read_policy ON public.foyer_members
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members AS fm
        WHERE fm.foyer_id = foyer_id AND fm.user_id = auth.uid()
    ));

CREATE POLICY foyer_members_write_policy ON public.foyer_members
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members AS fm
        WHERE fm.foyer_id = foyer_id AND fm.user_id = auth.uid() AND fm.role = 'admin'
    ));

-- Stock Items : les membres d'un foyer peuvent lire et modifier les éléments du stock
CREATE POLICY stock_items_all_policy ON public.stock_items
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_members.foyer_id = foyer_id AND foyer_members.user_id = auth.uid()
    ));

-- Shopping List : les membres d'un foyer peuvent lire et modifier la liste de courses
CREATE POLICY shopping_list_all_policy ON public.shopping_list
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.foyer_members
        WHERE foyer_members.foyer_id = foyer_id AND foyer_members.user_id = auth.uid()
    ));
