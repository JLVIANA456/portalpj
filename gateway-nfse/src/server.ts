import crypto from 'node:crypto';
import express from 'express';
import { config } from './config.js';
import { loadCertificate } from './supabase.js';
import {
  buildCancellationXml,
  buildDpsXml,
  makeDpsId,
  signXml,
  validateXml,
} from './xml.js';
import {
  consultNfse,
  gunzipBase64,
  issueNfse,
  registerEvent,
} from './national-client.js';
import {
  buildPaulistanaBatchXml,
  callPaulistana,
  extractPaulistanaReturn,
} from './sao-paulo.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    schemaVersion: config.schemaVersion,
    productionEnabled: process.env.NFSE_ENABLE_PRODUCTION === 'true',
  });
});

app.use((req, res, next) => {
  if (req.headers.authorization !== `Bearer ${config.gatewayToken}`) {
    res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', errorMessage: 'Não autorizado.' });
    return;
  }
  next();
});

app.post('/v1/nfse/execute', async (req, res) => {
  try {
    const { operation, environment, certificate: reference, payload } = req.body || {};
    if (!['homologacao', 'producao'].includes(environment)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ENVIRONMENT', errorMessage: 'Ambiente inválido.' });
      return;
    }
    if (environment === 'producao' && process.env.NFSE_ENABLE_PRODUCTION !== 'true') {
      res.status(403).json({ success: false, errorCode: 'PRODUCTION_DISABLED', errorMessage: 'Produção bloqueada até concluir a homologação.' });
      return;
    }
    if (!reference?.encryptedStoragePath || !reference?.passwordSecretId) {
      res.status(400).json({ success: false, errorCode: 'CERTIFICATE_REQUIRED', errorMessage: 'Referência do certificado ausente.' });
      return;
    }

    const certificate = await loadCertificate(
      reference.encryptedStoragePath,
      reference.passwordSecretId,
    );
    if (certificate.validTo.getTime() <= Date.now()) throw new Error('Certificado digital expirado.');

    if (operation === 'emitir') {
      const dps = payload.dps || payload;
      const emitter = dps.nfse_emitentes || {};

      // Roteamento para São Paulo (Nota Fiscal Paulistana / SOAP)
      if (emitter.provedor_nfse === 'sao_paulo') {
        const batchXml = buildPaulistanaBatchXml(dps, certificate);
        const testOnly = !emitter.habilitado_producao;
        const spResponse = await callPaulistana(
          testOnly ? 'TesteEnvioLoteRPS' : 'EnvioLoteRPS',
          batchXml,
          certificate,
        );
        const municipalReturn = extractPaulistanaReturn(spResponse.body);
        const hasError = spResponse.statusCode < 200 ||
          spResponse.statusCode >= 300 ||
          /<Erro\b|<CodigoErro\b|<Fault\b/i.test(municipalReturn);

        if (hasError) {
          res.status(422).json({
            success: false,
            errorCode: 'SP_NFSE',
            errorMessage: municipalReturn.slice(0, 500),
            raw: { municipalReturn },
          });
          return;
        }

        const nfseNumberMatch = municipalReturn.match(/<NumeroNFe>(\d+)<\/NumeroNFe>/);
        const verificationCodeMatch = municipalReturn.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/);
        const nfseNumber = nfseNumberMatch?.[1];
        // Em teste não há número real; usa chave sintética para rastreamento
        const accessKey = nfseNumber || `SP-TESTE-${crypto.randomUUID()}`;

        res.status(200).json({
          success: true,
          accessKey,
          nfseNumber: nfseNumber,
          verificationCode: verificationCodeMatch?.[1],
          spTestMode: testOnly,
          raw: { municipalReturn },
        });
        return;
      }

      // Fluxo nacional (SEFIN)
      const xml = buildDpsXml(dps);
      const signedXml = signXml(xml, makeDpsId(dps), certificate);
      validateXml(signedXml, 'DPS_v1.01.xsd');
      const response = await issueNfse(environment, signedXml, certificate);
      const nfseXml = gunzipBase64(response.body.nfseXmlGZipB64);
      const success = response.statusCode >= 200 && response.statusCode < 300;
      res.status(success ? 200 : response.statusCode).json({
        success,
        statusCode: response.statusCode,
        accessKey: response.body.chaveAcesso || response.body.chaveAcessoNfse,
        nfseNumber: response.body.numeroNfse,
        verificationCode: response.body.codigoVerificacao,
        issuedAt: response.body.dataEmissao,
        nfseXmlBase64: nfseXml ? Buffer.from(nfseXml).toString('base64') : undefined,
        raw: response.body,
        errorCode: response.body.codigo || response.body.erros?.[0]?.codigo,
        errorMessage: response.body.mensagem || response.body.erros?.[0]?.descricao,
      });
      return;
    }

    if (operation === 'consultar') {
      const response = await consultNfse(environment, payload.accessKey, certificate);
      const xml = gunzipBase64(response.body.nfseXmlGZipB64);
      res.status(response.statusCode).json({
        success: response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode,
        accessKey: payload.accessKey,
        nfseXmlBase64: xml ? Buffer.from(xml).toString('base64') : undefined,
        raw: response.body,
      });
      return;
    }

    if (operation === 'cancelar') {
      const xml = buildCancellationXml({ ...payload, environment });
      const idMatch = xml.match(/<infPedReg Id="([^"]+)"/);
      if (!idMatch) throw new Error('Id do pedido de evento não encontrado.');
      const signedXml = signXml(xml, idMatch[1], certificate);
      validateXml(signedXml, 'pedRegEvento_v1.01.xsd');
      const response = await registerEvent(environment, payload.accessKey, signedXml, certificate);
      const eventXml = gunzipBase64(
        response.body.eventoXmlGZipB64 || response.body.pedidoRegistroEventoXmlGZipB64,
      );
      res.status(response.statusCode).json({
        success: response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode,
        eventXmlBase64: eventXml ? Buffer.from(eventXml).toString('base64') : undefined,
        raw: response.body,
        errorCode: response.body.codigo || response.body.erros?.[0]?.codigo,
        errorMessage: response.body.mensagem || response.body.erros?.[0]?.descricao,
      });
      return;
    }

    res.status(400).json({ success: false, errorCode: 'UNSUPPORTED_OPERATION', errorMessage: 'Operação não suportada.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      errorCode: 'GATEWAY_FAILURE',
      errorMessage: error instanceof Error ? error.message : 'Erro interno.',
    });
  }
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Gateway fiscal NFS-e ouvindo na porta ${config.port}.`);
});
