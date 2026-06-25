import fs from 'node:fs';
import path from 'node:path';
import libxml from 'libxmljs2';
import { SignedXml } from 'xml-crypto';
import { config } from './config.js';
import type { CertificateMaterial } from './certificate.js';

const namespace = 'http://www.sped.fazenda.gov.br/nfse';
const signatureNamespace = 'http://www.w3.org/2000/09/xmldsig#';
let normalizedSchemaDirectory: string | null = null;

function getNormalizedSchemaDirectory() {
  if (normalizedSchemaDirectory) return normalizedSchemaDirectory;
  const target = path.join(process.cwd(), '.cache', `xsd-${config.schemaVersion}`);
  fs.mkdirSync(target, { recursive: true });
  for (const name of fs.readdirSync(config.xsdDirectory)) {
    if (!name.endsWith('.xsd')) continue;
    const source = fs.readFileSync(path.join(config.xsdDirectory, name), 'utf8');
    // XML Schema regex já é implicitamente ancorada. Alguns artefatos oficiais
    // trazem ^ e $, que libxml interpreta como caracteres literais.
    const normalized = source.replace(
      /(<xs:pattern\s+value=")\^([^"]*?)\$("\s*\/>)/g,
      '$1$2$3',
    );
    fs.writeFileSync(path.join(target, name), normalized);
  }
  normalizedSchemaDirectory = target;
  return target;
}

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

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function enumCode(value: unknown, allowed: readonly string[], fallback: string) {
  const code = String(value ?? '').trim().charAt(0);
  return allowed.includes(code) ? code : fallback;
}

function buildTotTribXml(totTrib: Record<string, unknown> | null | undefined): string {
  if (!totTrib) return '<indTotTrib>0</indTotTrib>';
  const federal = Number(totTrib.p_tot_trib_fed || 0);
  const estadual = Number(totTrib.p_tot_trib_est || 0);
  const municipal = Number(totTrib.p_tot_trib_mun || 0);
  if (federal <= 0 && estadual <= 0 && municipal <= 0) {
    return '<indTotTrib>0</indTotTrib>';
  }
  return `<pTotTrib>
            <pTotTribFed>${money(federal)}</pTotTribFed>
            <pTotTribEst>${money(estadual)}</pTotTribEst>
            <pTotTribMun>${money(municipal)}</pTotTribMun>
          </pTotTrib>`;
}

function utcTimestamp(value?: string) {
  const date = new Date(value || Date.now());
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

export function makeDpsId(input: Record<string, any>) {
  const emitter = input.nfse_emitentes || input.prestador_snapshot || {};
  const municipality = digits(emitter.codigo_municipio_ibge || input.municipio_incidencia_ibge);
  const document = digits(emitter.cnpj || emitter.cpf).padStart(14, '0');
  const series = String(input.serie).padStart(5, '0');
  // numero deve ter exatamente 15 dígitos no ID (schema DPS[0-9]{42})
  const numStr = String(input.numero);
  const number = numStr.length <= 15 ? numStr.padStart(15, '0') : numStr.slice(-15);
  return `DPS${municipality}2${document}${series}${number}`;
}

export function buildDpsXml(input: Record<string, any>) {
  if (input.xml) return String(input.xml);

  const emitter = input.nfse_emitentes || input.prestador_snapshot || {};
  const customer = input.nfse_clientes || input.tomador_snapshot || {};
  const tax = input.tributacao || {};
  const values = input.valores || {};
  const id = makeDpsId(input);
  const emitterDocument = digits(emitter.cnpj || emitter.cpf);
  const customerDocument = digits(customer.cpf_cnpj || customer.cnpj || customer.cpf);
  const customerTag = customerDocument.length === 11 ? 'CPF' : 'CNPJ';
  const environment = input.ambiente === 'producao' ? '1' : '2';
  const simpleOption = tax.opSimpNac || emitter.opSimpNac ||
    (emitter.optante_simples ? '3' : '1');
  const typeIssuer = enumCode(input.payload?.tipo_emitente, ['1', '2', '3'], '1');
  const retentionType = enumCode(tax.tpRetISSQN || tax.tp_ret_issqn, ['1', '2', '3'], '1');
  const customerNoNif = enumCode(customer.c_nao_nif, ['0', '1', '2'], '0');
  const nationalTaxCode = digits(input.codigo_servico_nacional || emitter.codigo_tributacao_nacional_padrao);
  if (nationalTaxCode.length !== 6) throw new Error('cTribNac inválido: informe exatamente 6 dígitos.');
  const nbs = digits(input.payload?.cNBS || input.codigo_nbs);
  if (nbs && nbs.length !== 9) throw new Error('cNBS inválido: informe um código final com exatamente 9 dígitos.');
  const municipalTaxCodeRaw =
    input.codigo_servico_municipal || emitter.codigo_tributacao_municipal_padrao || '';
  const municipalTaxCode = digits(municipalTaxCodeRaw);
  if (municipalTaxCodeRaw && municipalTaxCode.length !== 3) {
    throw new Error('cTribMun inválido: no Portal Nacional o código deve ter exatamente 3 dígitos.');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="${namespace}" versao="${config.schemaVersion}">
  <infDPS Id="${id}">
    <tpAmb>${environment}</tpAmb>
    <dhEmi>${utcTimestamp(input.data_emissao)}</dhEmi>
    <verAplic>${escapeXml(config.appVersion)}</verAplic>
    <serie>${String(input.serie).padStart(5, '0')}</serie>
    <nDPS>${String(input.numero).slice(-15)}</nDPS>
    <dCompet>${String(input.competencia).slice(0, 10)}</dCompet>
    <tpEmit>${typeIssuer}</tpEmit>
    <cLocEmi>${digits(input.payload?.codigo_localidade_emissao || emitter.codigo_municipio_ibge)}</cLocEmi>
    <prest>
      <${emitterDocument.length === 11 ? 'CPF' : 'CNPJ'}>${emitterDocument}</${emitterDocument.length === 11 ? 'CPF' : 'CNPJ'}>
      ${emitter.inscricao_municipal && !input.payload?.omitirInscricaoMunicipal ? `<IM>${escapeXml(emitter.inscricao_municipal)}</IM>` : ''}
      <xNome>${escapeXml(emitter.razao_social)}</xNome>
      ${emitter.telefone ? `<fone>${digits(emitter.telefone)}</fone>` : ''}
      ${emitter.email ? `<email>${escapeXml(emitter.email)}</email>` : ''}
      <regTrib>
        <opSimpNac>${simpleOption}</opSimpNac>
        ${tax.regApTribSN || emitter.simples_regime_apuracao ? `<regApTribSN>${tax.regApTribSN || emitter.simples_regime_apuracao}</regApTribSN>` : ''}
        <regEspTrib>${tax.regEspTrib || emitter.regime_tributario || '0'}</regEspTrib>
      </regTrib>
    </prest>
    ${customerDocument ? `<toma>
      <${customerTag}>${customerDocument}</${customerTag}>
      <xNome>${escapeXml(customer.razao_social || customer.nome)}</xNome>
      ${customer.email ? `<email>${escapeXml(customer.email)}</email>` : ''}
    </toma>` : `<toma>
      <cNaoNIF>${customerNoNif}</cNaoNIF>
      <xNome>${escapeXml(customer.razao_social || customer.nome)}</xNome>
      ${customer.email ? `<email>${escapeXml(customer.email)}</email>` : ''}
    </toma>`}
    <serv>
      <locPrest><cLocPrestacao>${digits(input.municipio_incidencia_ibge)}</cLocPrestacao></locPrest>
      <cServ>
        <cTribNac>${nationalTaxCode}</cTribNac>
        ${municipalTaxCode ? `<cTribMun>${municipalTaxCode}</cTribMun>` : ''}
        <xDescServ>${escapeXml(input.descricao_servico)}</xDescServ>
        ${nbs ? `<cNBS>${nbs}</cNBS>` : ''}
      </cServ>
    </serv>
    <valores>
      <vServPrest><vServ>${money(input.valor_servico)}</vServ></vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>${tax.tribISSQN || '1'}</tribISSQN>
          <tpRetISSQN>${retentionType}</tpRetISSQN>
          ${tax.pAliq ? `<pAliq>${money(tax.pAliq)}</pAliq>` : ''}
        </tribMun>
        <totTrib>${buildTotTribXml(input.payload?.tot_trib || values.tot_trib)}</totTrib>
      </trib>
    </valores>
  </infDPS>
</DPS>`;
}

export function buildCancellationXml(input: Record<string, any>) {
  if (input.xml) return String(input.xml);
  const environment = input.environment === 'producao' ? '1' : '2';
  const document = digits(input.authorDocument || input.cnpj);
  const id = `PRE${input.accessKey}101101`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento xmlns="${namespace}" versao="${config.schemaVersion}">
  <infPedReg Id="${id}">
    <tpAmb>${environment}</tpAmb>
    <verAplic>${escapeXml(config.appVersion)}</verAplic>
    <dhEvento>${utcTimestamp()}</dhEvento>
    <${document.length === 11 ? 'CPFAutor' : 'CNPJAutor'}>${document}</${document.length === 11 ? 'CPFAutor' : 'CNPJAutor'}>
    <chNFSe>${escapeXml(input.accessKey)}</chNFSe>
    <e101101>
      <xDesc>Cancelamento de NFS-e</xDesc>
      <cMotivo>${escapeXml(input.reasonCode || '9')}</cMotivo>
      <xMotivo>${escapeXml(input.justification)}</xMotivo>
    </e101101>
  </infPedReg>
</pedRegEvento>`;
}

export function signXml(xml: string, referenceId: string, certificate: CertificateMaterial) {
  const signer = new SignedXml({
    privateKey: certificate.privateKeyPem,
    publicCert: certificate.certificatePem,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${certificate.certificateBase64}</X509Certificate></X509Data>`,
  });
  signer.addReference({
    xpath: `//*[@Id='${referenceId}']`,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
  });
  signer.computeSignature(xml, {
    location: { reference: "/*[local-name()='DPS' or local-name()='pedRegEvento']/*[1]", action: 'after' },
    existingPrefixes: { ds: signatureNamespace },
  });
  return signer.getSignedXml();
}

export function validateXml(xml: string, schemaFile: 'DPS_v1.01.xsd' | 'pedRegEvento_v1.01.xsd') {
  const schemaPath = path.join(getNormalizedSchemaDirectory(), schemaFile);
  if (!fs.existsSync(schemaPath)) throw new Error(`XSD não encontrado: ${schemaPath}`);
  const document = libxml.parseXml(xml);
  const schema = libxml.parseXml(fs.readFileSync(schemaPath, 'utf8'), {
    baseUrl: schemaPath,
  });
  if (!document.validate(schema)) {
    throw new Error(`XML inválido: ${document.validationErrors.map((error) => error.message.trim()).join('; ')}`);
  }
}
