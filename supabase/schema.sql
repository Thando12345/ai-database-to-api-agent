-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'readonly')),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schemas table
CREATE TABLE public.schemas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  relationships JSONB DEFAULT '[]'::jsonb,
  sql TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Specifications table
CREATE TABLE public.api_specs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  schema_id UUID REFERENCES public.schemas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  endpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  openapi_spec JSONB,
  deployment_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'deployed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployments table
CREATE TABLE public.deployments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  api_spec_id UUID REFERENCES public.api_specs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('azure', 'aws', 'local')),
  url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'deployed', 'failed')),
  config JSONB,
  logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Schemas policies
CREATE POLICY "Users can view own schemas" ON public.schemas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create schemas" ON public.schemas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schemas" ON public.schemas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schemas" ON public.schemas
  FOR DELETE USING (auth.uid() = user_id);

-- API specs policies
CREATE POLICY "Users can view own API specs" ON public.api_specs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemas 
      WHERE schemas.id = api_specs.schema_id 
      AND schemas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create API specs" ON public.api_specs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemas 
      WHERE schemas.id = api_specs.schema_id 
      AND schemas.user_id = auth.uid()
    )
  );

-- Functions for RPC calls
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  IF sql_query ~* '^(CREATE TABLE|ALTER TABLE|INSERT INTO)' THEN
    EXECUTE sql_query;
    result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
  ELSE
    result := jsonb_build_object('success', false, 'error', 'Only CREATE TABLE, ALTER TABLE, and INSERT statements are allowed');
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION execute_query(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  rec RECORD;
  results JSONB[] := '{}';
BEGIN
  IF query ~* '^SELECT' THEN
    FOR rec IN EXECUTE query LOOP
      results := array_append(results, to_jsonb(rec));
    END LOOP;
    result := jsonb_build_object('success', true, 'data', to_jsonb(results));
  ELSE
    result := jsonb_build_object('success', false, 'error', 'Only SELECT statements are allowed');
  END IF;
  
  RETURN result;
END;
$$;