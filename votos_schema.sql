-- Agregar columna de votos a opciones (contador simple)
ALTER TABLE opciones ADD COLUMN IF NOT EXISTS votos INTEGER DEFAULT 0;

-- Crear tabla de votos detallados (para evitar votos duplicados)
CREATE TABLE IF NOT EXISTS votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opcion_id UUID NOT NULL REFERENCES opciones(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL, -- Identificador del usuario (puede ser IP, session, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(opcion_id, usuario_id)
);

-- Desactivar RLS
ALTER TABLE votos DISABLE ROW LEVEL SECURITY;