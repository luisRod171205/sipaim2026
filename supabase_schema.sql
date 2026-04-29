-- Crear tabla actividades
CREATE TABLE actividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('inactivo', 'pendiente', 'confirmado')) DEFAULT 'inactivo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla opciones
CREATE TABLE opciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad_id UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    extra JSONB,
    seleccionada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at en actividades
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_actividades_updated_at
    BEFORE UPDATE ON actividades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Desactivar Row Level Security (RLS)
ALTER TABLE actividades DISABLE ROW LEVEL SECURITY;
ALTER TABLE opciones DISABLE ROW LEVEL SECURITY;
<parameter name="filePath">c:\Users\saidj\Desktop\GICC\supabase_schema.sql