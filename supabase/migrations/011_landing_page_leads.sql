-- Criação da tabela de leads para captação da landing page
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    cnpj TEXT,
    perfil TEXT CHECK (perfil IN ('empresa', 'contador', 'advogado', 'outro')),
    mensagem TEXT,
    origem TEXT DEFAULT 'landing_page',
    status TEXT DEFAULT 'novo',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler os leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'leads_admin_select'
    ) THEN
        CREATE POLICY leads_admin_select ON leads
            FOR SELECT USING (
                (auth.jwt()->'app_metadata'->>'op_tipo') = 'admin'
            );
    END IF;
END $$;
