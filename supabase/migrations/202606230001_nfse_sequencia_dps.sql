-- Tabela de sequência de numeração DPS por emitente
CREATE TABLE IF NOT EXISTS public.nfse_sequencias_dps (
  emitente_id   uuid    PRIMARY KEY REFERENCES public.nfse_emitentes(id) ON DELETE CASCADE,
  ultimo_numero bigint  NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nfse_sequencias_dps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso via emitente do tenant"
  ON public.nfse_sequencias_dps
  USING (
    emitente_id IN (
      SELECT id FROM public.nfse_emitentes
    )
  );

-- Função: retorna o próximo número DPS para um emitente (atômica, com lock por linha)
CREATE OR REPLACE FUNCTION public.nfse_proximo_numero_dps(p_emitente_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero bigint;
BEGIN
  INSERT INTO public.nfse_sequencias_dps (emitente_id, ultimo_numero)
  VALUES (p_emitente_id, 1)
  ON CONFLICT (emitente_id) DO UPDATE
    SET ultimo_numero = nfse_sequencias_dps.ultimo_numero + 1,
        atualizado_em = now()
  RETURNING ultimo_numero INTO v_numero;

  RETURN v_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nfse_proximo_numero_dps(uuid)
  TO authenticated, service_role;
