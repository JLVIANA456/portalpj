import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 8080),
  gatewayToken: required('NFSE_FISCAL_GATEWAY_TOKEN'),
  encryptionKey: required('NFSE_CERTIFICATE_ENCRYPTION_KEY'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  schemaVersion: process.env.NFSE_SCHEMA_VERSION || '1.01',
  appVersion: process.env.NFSE_APP_VERSION || 'PORTALPJ_1.0',
  xsdDirectory: process.env.NFSE_XSD_DIRECTORY ||
    path.join(root, 'assets', 'xsd', 'Schemas', process.env.NFSE_SCHEMA_VERSION || '1.01'),
  endpoints: {
    homologacao: {
      sefin: process.env.NFSE_SEFIN_HOMOLOG_URL ||
        'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
      adn: process.env.NFSE_ADN_HOMOLOG_URL ||
        'https://adn.producaorestrita.nfse.gov.br/contribuintes',
    },
    producao: {
      sefin: process.env.NFSE_SEFIN_PRODUCAO_URL ||
        'https://sefin.nfse.gov.br/SefinNacional',
      adn: process.env.NFSE_ADN_PRODUCAO_URL ||
        'https://adn.nfse.gov.br/contribuintes',
    },
  },
};
