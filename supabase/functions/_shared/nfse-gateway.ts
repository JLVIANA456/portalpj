export interface FiscalGatewayRequest {
  operation: 'emitir' | 'consultar' | 'cancelar' | 'sincronizar_adn';
  environment: 'homologacao' | 'producao';
  tenantId: string;
  emitterId: string;
  certificate: {
    encryptedStoragePath: string;
    passwordSecretId: string;
  };
  payload: Record<string, unknown>;
}

export interface FiscalGatewayResponse {
  success: boolean;
  statusCode?: number;
  accessKey?: string;
  nfseNumber?: string;
  verificationCode?: string;
  issuedAt?: string;
  nfseXmlBase64?: string;
  eventXmlBase64?: string;
  danfsePdfBase64?: string;
  raw?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export async function callFiscalGateway(
  request: FiscalGatewayRequest,
): Promise<FiscalGatewayResponse> {
  const gatewayUrl = Deno.env.get('NFSE_FISCAL_GATEWAY_URL');
  const gatewayToken = Deno.env.get('NFSE_FISCAL_GATEWAY_TOKEN');
  if (!gatewayUrl || !gatewayToken) {
    throw new Error('Gateway fiscal mTLS não configurado.');
  }

  const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/v1/nfse/execute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(request),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      errorCode: body.errorCode || 'GATEWAY_ERROR',
      errorMessage: body.errorMessage || body.message || 'Falha no gateway fiscal.',
      raw: body,
    };
  }
  return body as FiscalGatewayResponse;
}
