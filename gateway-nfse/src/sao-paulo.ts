import crypto from 'node:crypto';
import https from 'node:https';
import { SignedXml } from 'xml-crypto';
import type { CertificateMaterial } from './certificate.js';

const SP_NAMESPACE = 'http://www.prefeitura.sp.gov.br/nfe';
const SP_ENDPOINT = 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx';
const SP_SCHEMA_VERSION = 1;

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function digits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function cents(value: unknown, size = 15) {
  return Math.round(Number(value || 0) * 100).toString().padStart(size, '0');
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00-03:00`);
}

function compactDate(value: string) {
  const date = formatDate(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function certificateRsaSigner(certificate: CertificateMaterial) {
  return (data: Buffer) =>
    crypto.sign('RSA-SHA1', data, {
      key: certificate.privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    });
}

/**
 * Assinatura proprietária do RPS paulistano.
 * A cadeia é mantida isolada porque difere da assinatura XMLDSig do lote.
 */
export function signPaulistanaRps(input: Record<string, any>, certificate: CertificateMaterial) {
  const emitter = input.nfse_emitentes || {};
  const customer = input.nfse_clientes || input.tomador_snapshot || {};
  const customerDocument = digits(customer.cpf_cnpj || customer.cnpj || customer.cpf);
  const customerIndicator = customerDocument.length === 11 ? '1' : customerDocument.length === 14 ? '2' : '3';
  const chain = [
    digits(emitter.inscricao_municipal).padStart(8, '0').slice(-8),
    String(input.serie || '1').padEnd(5, ' ').slice(0, 5),
    String(input.numero).padStart(12, '0').slice(-12),
    compactDate(input.competencia),
    input.tributacao?.tributacaoRps || 'T',
    'N',
    input.tributacao?.tpRetISSQN === '2' ? 'S' : 'N',
    cents(input.valor_servico),
    cents(input.valores?.valorDeducoes || 0),
    digits(input.codigo_servico_municipal || emitter.codigo_servico_municipal_padrao).padStart(5, '0').slice(-5),
    customerIndicator,
    customerDocument.padStart(14, '0').slice(-14),
  ].join('');
  return certificateRsaSigner(certificate)(Buffer.from(chain, 'latin1')).toString('base64');
}

export function buildPaulistanaRpsXml(input: Record<string, any>, certificate: CertificateMaterial) {
  const emitter = input.nfse_emitentes || {};
  const customer = input.nfse_clientes || input.tomador_snapshot || {};
  const customerDocument = digits(customer.cpf_cnpj || customer.cnpj || customer.cpf);
  const signature = signPaulistanaRps(input, certificate);
  const serviceCode = digits(input.codigo_servico_municipal || emitter.codigo_servico_municipal_padrao);
  if (!emitter.inscricao_municipal) throw new Error('Inscrição municipal obrigatória para a NFS-e paulistana.');
  if (serviceCode.length !== 5) throw new Error('Código de serviço municipal paulistano deve conter cinco dígitos.');

  return `<RPS xmlns="">
    <Assinatura>${signature}</Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${digits(emitter.inscricao_municipal)}</InscricaoPrestador>
      <SerieRPS>${escapeXml(input.serie || '1')}</SerieRPS>
      <NumeroRPS>${escapeXml(input.numero)}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${String(input.competencia).slice(0, 10)}</DataEmissao>
    <StatusRPS>N</StatusRPS>
    <TributacaoRPS>${input.tributacao?.tributacaoRps || 'T'}</TributacaoRPS>
    <ValorServicos>${Number(input.valor_servico).toFixed(2)}</ValorServicos>
    <ValorDeducoes>${Number(input.valores?.valorDeducoes || 0).toFixed(2)}</ValorDeducoes>
    <CodigoServico>${serviceCode}</CodigoServico>
    <AliquotaServicos>${Number(input.tributacao?.pAliq || 0).toFixed(4)}</AliquotaServicos>
    <ISSRetido>${input.tributacao?.tpRetISSQN === '2'}</ISSRetido>
    ${customerDocument ? `<CPFCNPJTomador><${customerDocument.length === 11 ? 'CPF' : 'CNPJ'}>${customerDocument}</${customerDocument.length === 11 ? 'CPF' : 'CNPJ'}></CPFCNPJTomador>` : ''}
    ${customer.razao_social || customer.nome ? `<RazaoSocialTomador>${escapeXml(customer.razao_social || customer.nome)}</RazaoSocialTomador>` : ''}
    ${customer.email ? `<EmailTomador>${escapeXml(customer.email)}</EmailTomador>` : ''}
    <Discriminacao>${escapeXml(input.descricao_servico)}</Discriminacao>
  </RPS>`;
}

function signPaulistanaMessage(xml: string, certificate: CertificateMaterial) {
  const signer = new SignedXml({
    privateKey: certificate.privateKeyPem,
    publicCert: certificate.certificatePem,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${certificate.certificateBase64}</X509Certificate></X509Data>`,
  });
  // URI="" + isEmptyUri: true → Reference URI="" sem adicionar atributo Id ao elemento
  // Schema da Prefeitura SP não declara Id em PedidoEnvioLoteRPS
  // xpath: '/*' é obrigatório no xml-crypto v6: sem ele, selectWithResolver recebe ""
  // (string vazia) e lança "XPath parse error".
  signer.addReference({
    uri: '',
    isEmptyUri: true,
    xpath: '/*',
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
  });
  // action 'append' evita /*[last()] que quebra em algumas versões do xpath interno
  signer.computeSignature(xml, {
    location: { reference: "/*[local-name()='PedidoEnvioLoteRPS']", action: 'append' },
  });
  return signer.getSignedXml();
}

export function buildPaulistanaBatchXml(input: Record<string, any>, certificate: CertificateMaterial) {
  const emitter = input.nfse_emitentes || {};
  const rps = buildPaulistanaRpsXml(input, certificate);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioLoteRPS xmlns="${SP_NAMESPACE}">
  <Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente><CNPJ>${digits(emitter.cnpj)}</CNPJ></CPFCNPJRemetente>
    <transacao>true</transacao>
    <dtInicio>${String(input.competencia).slice(0, 10)}</dtInicio>
    <dtFim>${String(input.competencia).slice(0, 10)}</dtFim>
    <QtdRPS>1</QtdRPS>
    <ValorTotalServicos>${Number(input.valor_servico).toFixed(2)}</ValorTotalServicos>
    <ValorTotalDeducoes>${Number(input.valores?.valorDeducoes || 0).toFixed(2)}</ValorTotalDeducoes>
  </Cabecalho>
  ${rps}
</PedidoEnvioLoteRPS>`;
  return signPaulistanaMessage(xml, certificate);
}

function soapEnvelope(operation: 'TesteEnvioLoteRPS' | 'EnvioLoteRPS', messageXml: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${operation}Request xmlns="${SP_NAMESPACE}">
      <VersaoSchema>${SP_SCHEMA_VERSION}</VersaoSchema>
      <MensagemXML>${escapeXml(messageXml)}</MensagemXML>
    </${operation}Request>
  </soap:Body>
</soap:Envelope>`;
}

export async function callPaulistana(
  operation: 'TesteEnvioLoteRPS' | 'EnvioLoteRPS',
  messageXml: string,
  certificate: CertificateMaterial,
) {
  const action = operation === 'TesteEnvioLoteRPS'
    ? 'http://www.prefeitura.sp.gov.br/nfe/ws/testeenvio'
    : 'http://www.prefeitura.sp.gov.br/nfe/ws/envioLoteRPS';
  const body = soapEnvelope(operation, messageXml);
  return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = https.request(SP_ENDPOINT, {
      method: 'POST',
      key: certificate.privateKeyPem,
      cert: certificate.certificatePem,
      minVersion: 'TLSv1.2',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${action}"`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        statusCode: response.statusCode || 500,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

export function extractPaulistanaReturn(soapXml: string) {
  const match = soapXml.match(/<RetornoXML[^>]*>([\s\S]*?)<\/RetornoXML>/i);
  if (!match) return soapXml;
  return match[1]
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}
