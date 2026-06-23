import React, { createContext, useContext, useState } from 'react';

// ─── Initial states (uma por tab) ────────────────────────────────────────────

export const initialClienteState = {
  cliente_id: '', cliente_codigo_interno: '', cliente_razao_social: '',
  cliente_nome_fantasia: '', cliente_tipo_pessoa: '', cliente_cnpj_cpf: '',
  cliente_inscricao_municipal: '', cliente_inscricao_estadual: '',
  cliente_inscricao_suframa: '', cliente_nome_contato: '', cliente_ddd: '',
  cliente_telefone: '', cliente_ativo: true, cliente_tags: '',
  cliente_observacoes_internas: '', cliente_observacoes_detalhadas: '',
};

export const initialEnderecoState = {
  endereco_logradouro: '', endereco_numero: '', endereco_complemento: '',
  endereco_bairro: '', endereco_cep: '', endereco_municipio: '',
  endereco_codigo_municipio_ibge: '', endereco_uf: '',
  endereco_pais_codigo: '1058', endereco_pais_nome: 'BRASIL',
};

export const initialContatoState = {
  contato_email_principal: '', contato_emails_adicionais: '',
  contato_ddd_telefone_2: '', contato_telefone_2: '',
  contato_ddd_fax: '', contato_fax: '', contato_website: '',
  contato_enviar_email_automatico: true,
  contato_enviar_anexo_email: true,
  contato_enviar_link_portal: true,
};

export const initialBancarioState = {
  banco_codigo: '', banco_nome: '', banco_agencia: '', banco_conta_corrente: '',
  banco_tipo_conta: '', banco_chave_pix: '', banco_tipo_chave_pix: '',
  banco_cpf_cnpj_titular: '', banco_nome_titular: '',
};

export const initialFiscalState = {
  fiscal_inscricao_estadual: '', fiscal_inscricao_municipal: '',
  fiscal_inscricao_suframa: '', fiscal_optante_simples_nacional: false,
  fiscal_produtor_rural: false, fiscal_tipo_atividade: '',
  fiscal_cnae_principal: '', fiscal_cnae_descricao: '',
  fiscal_contribuinte_icms: '', fiscal_regime_tributario: '',
  fiscal_regime_especial_tributacao: '', fiscal_incentivo_fiscal: false,
  fiscal_observacoes_internas: '', fiscal_observacoes_detalhadas: '',
};

export const initialContratoState = {
  contrato_id: '', contrato_numero: '', contrato_status: '',
  contrato_cliente_id: '', contrato_vigencia_inicial: '', contrato_vigencia_final: '',
  contrato_tipo_faturamento: '', contrato_dia_faturamento: '',
  contrato_valor_total_servicos: '0', contrato_valor_desconto: '0',
  contrato_valor_produtos: '0', contrato_valor_despesas_reembolsaveis: '0',
  contrato_valor_total: '0', contrato_renovacao_automatica: true,
  contrato_ultima_fatura_gerada: '', contrato_proxima_fatura: '',
};

export const initialServicoTabState = {
  servico_id: '', servico_tributacao: '', servico_codigo_servico_municipal: '',
  servico_codigo_lc116: '', servico_codigo_cnae: '', servico_codigo_nbs: '',
  servico_descricao_nbs: '', servico_descricao: '',
  servico_quantidade: '1', servico_valor_unitario: '0', servico_valor_desconto: '0',
  servico_valor_total: '0', servico_valor_deducoes: '0', servico_base_calculo: '0',
  servico_aliquota_iss: '0', servico_valor_iss: '0', servico_iss_retido: false,
  servico_municipio_prestacao: '', servico_codigo_municipio_prestacao_ibge: '',
  servico_municipio_incidencia: '', servico_codigo_municipio_incidencia_ibge: '',
  servico_exigibilidade_iss: '', servico_natureza_operacao: '', servico_local_prestacao: '',
};

export const initialImpostosState = {
  retencao_aliquota_iss: '0', retencao_valor_iss: '0', retencao_iss_retido: false,
  retencao_aliquota_ir: '0', retencao_valor_ir: '0', retencao_ir_retido: false,
  retencao_aliquota_csll: '0', retencao_valor_csll: '0', retencao_csll_retido: false,
  retencao_aliquota_inss: '0', retencao_valor_inss: '0', retencao_inss_retido: false,
  retencao_aliquota_pis: '0', retencao_valor_pis: '0', retencao_pis_retido: false,
  retencao_aliquota_cofins: '0', retencao_valor_cofins: '0', retencao_cofins_retido: false,
  retencao_informar_valor_manual: false, retencao_deduz_iss_base_pis_cofins: false,
};

export const initialTransparenciaState = {
  transparencia_carga_federal: '0', transparencia_carga_estadual: '0',
  transparencia_carga_municipal: '0', transparencia_fonte: '',
  transparencia_texto_exibicao_nfse: '',
};

export const initialReformaState = {
  reforma_cst_ibs_cbs: '', reforma_classificacao_tributaria: '', reforma_indicador_operacao: '',
  reforma_destinatario_diferente_tomador: false, reforma_destinatario_nome: '',
  reforma_destinatario_cpf_cnpj: '', reforma_destinatario_inscricao_municipal: '',
  reforma_destinatario_email: '', reforma_destinatario_telefone: '',
  reforma_uso_consumo_pessoal: false, reforma_base_calculo_ibs_cbs: '0',
  reforma_aliquota_ibs_municipal: '0', reforma_valor_ibs_municipal: '0', reforma_reducao_aliquota_ibs_municipal: '0',
  reforma_aliquota_ibs_estadual: '0', reforma_valor_ibs_estadual: '0', reforma_reducao_aliquota_ibs_estadual: '0',
  reforma_aliquota_cbs: '0', reforma_valor_cbs: '0', reforma_reducao_aliquota_cbs: '0',
  reforma_informar_valor_manual: false,
};

export const initialDpsState = {
  dps_ambiente: '', dps_numero: '', dps_serie: '', dps_data_emissao: '',
  dps_competencia: '', dps_tipo_emitente: '',
  dps_codigo_municipio_emissao: '', dps_codigo_municipio_prestacao: '',
  dps_codigo_municipio_incidencia: '', dps_prestador_cnpj: '',
  dps_prestador_inscricao_municipal: '', dps_tomador_cpf_cnpj: '',
  dps_tomador_razao_social: '', dps_tomador_email: '', dps_tomador_telefone: '',
  dps_intermediario_existe: false, dps_intermediario_cpf_cnpj: '',
  dps_intermediario_razao_social: '',
  dps_servico_codigo_lc116: '', dps_servico_codigo_municipal: '',
  dps_servico_codigo_cnae: '', dps_servico_codigo_nbs: '', dps_servico_descricao: '',
  dps_valor_servico: '0', dps_valor_deducoes: '0',
  dps_valor_desconto_incondicionado: '0', dps_valor_desconto_condicionado: '0',
  dps_valor_liquido: '0', dps_iss_retido: false, dps_exigibilidade_iss: '',
  dps_regime_especial_tributacao: '', dps_optante_simples_nacional: false,
  dps_incentivo_fiscal: false,
};

export const initialPrestadorState = {
  prestador_id: '', prestador_cnpj: '', prestador_razao_social: '',
  prestador_nome_fantasia: '', prestador_inscricao_municipal: '',
  prestador_inscricao_estadual: '', prestador_regime_tributario: '',
  prestador_crt: '', prestador_optante_simples_nacional: false,
  prestador_certificado_a1_arquivo: '', prestador_certificado_a1_senha: '',
  prestador_ambiente_emissao: 'Homologação', prestador_logradouro: '', prestador_numero: '',
  prestador_complemento: '', prestador_bairro: '', prestador_municipio: '',
  prestador_codigo_municipio_ibge: '', prestador_uf: '', prestador_cep: '',
  prestador_email: '', prestador_telefone: '',
};

export const initialIntermediarioState = {
  intermediario_existe: false, intermediario_cpf_cnpj: '',
  intermediario_razao_social: '', intermediario_inscricao_municipal: '',
  intermediario_email: '', intermediario_telefone: '',
  intermediario_logradouro: '', intermediario_numero: '', intermediario_complemento: '',
  intermediario_bairro: '', intermediario_municipio: '',
  intermediario_codigo_municipio_ibge: '', intermediario_uf: '', intermediario_cep: '',
};

export const initialPagamentoState = {
  pagamento_forma_pagamento: '', pagamento_data_vencimento: '',
  pagamento_valor_cobrado: '0', pagamento_valor_pago: '0', pagamento_status: '',
  pagamento_boleto_emitido: false, pagamento_pix_emitido: false,
  pagamento_chave_pix: '', pagamento_link_pagamento: '',
  pagamento_data_pagamento: '', pagamento_observacao: '',
};

export const initialEmailClienteState = {
  email_destinatarios: '', email_copia: '', email_copia_oculta: '',
  email_assunto: '', email_corpo: '',
  email_enviar_xml: true, email_enviar_pdf: true, email_enviar_link_portal: true,
  email_enviado: false, email_data_envio: '',
};

export const initialXmlState = {
  api_status: '', api_ambiente: '', api_protocolo: '', api_chave_acesso_nfse: '',
  api_numero_nfse: '', api_codigo_verificacao: '', api_link_danfse: '',
  api_xml_dps_enviado: '', api_xml_nfse_retorno: '',
  api_json_enviado: '', api_json_retorno: '',
  api_codigo_erro: '', api_mensagem_retorno: '',
  api_data_envio: '', api_data_autorizacao: '', api_usuario_envio: '',
};

export const initialCancelamentoState = {
  nfse_cancelada: false, nfse_data_cancelamento: '', nfse_motivo_cancelamento: '',
  nfse_protocolo_cancelamento: '', nfse_usuario_cancelamento: '',
  nfse_substituida: false, nfse_chave_substituida: '', nfse_numero_substituida: '',
  nfse_motivo_substituicao: '', nfse_data_substituicao: '', nfse_usuario_substituicao: '',
};

export const initialAnexosState = {
  anexo_id: '', anexo_cliente_id: '', anexo_nfse_id: '', anexo_nome_arquivo: '',
  anexo_tipo: '', anexo_url: '', anexo_descricao: '',
  anexo_usuario_upload: '', anexo_data_upload: '',
};

export const initialHistoricoFinanceiroState = {
  historico_financeiro_id: '', historico_cliente_id: '', historico_contrato_id: '',
  historico_nfse_id: '', historico_data_emissao: '', historico_data_vencimento: '',
  historico_data_pagamento: '', historico_valor: '0', historico_valor_pago: '0',
  historico_status: '', historico_observacao: '',
};

export const initialUsuariosState = {
  usuario_id: '', usuario_nome: '', usuario_email: '', usuario_perfil: '',
  usuario_ativo: true, usuario_departamento: '',
  usuario_permissao_emitir_nfse: false,
  usuario_permissao_cancelar_nfse: false,
  usuario_permissao_alterar_cadastro: false,
};

export const initialControleState = {
  nfse_id: '', nfse_cliente_id: '', nfse_contrato_id: '', nfse_prestador_id: '',
  nfse_numero: '', nfse_serie: '', nfse_chave_acesso: '', nfse_codigo_verificacao: '',
  nfse_status: '', nfse_competencia: '', nfse_data_emissao: '',
  nfse_valor_servico: '0', nfse_valor_deducoes: '0', nfse_valor_desconto: '0',
  nfse_valor_iss: '0', nfse_valor_ir: '0', nfse_valor_csll: '0',
  nfse_valor_inss: '0', nfse_valor_pis: '0', nfse_valor_cofins: '0',
  nfse_valor_ibs_municipal: '0', nfse_valor_ibs_estadual: '0',
  nfse_valor_cbs: '0', nfse_valor_liquido: '0', nfse_observacao: '',
};

// ─── Context type ─────────────────────────────────────────────────────────────

interface PortalNacionalCtx {
  cliente: typeof initialClienteState;
  setCliente: React.Dispatch<React.SetStateAction<typeof initialClienteState>>;
  endereco: typeof initialEnderecoState;
  setEndereco: React.Dispatch<React.SetStateAction<typeof initialEnderecoState>>;
  contato: typeof initialContatoState;
  setContato: React.Dispatch<React.SetStateAction<typeof initialContatoState>>;
  bancario: typeof initialBancarioState;
  setBancario: React.Dispatch<React.SetStateAction<typeof initialBancarioState>>;
  fiscal: typeof initialFiscalState;
  setFiscal: React.Dispatch<React.SetStateAction<typeof initialFiscalState>>;
  contrato: typeof initialContratoState;
  setContrato: React.Dispatch<React.SetStateAction<typeof initialContratoState>>;
  servico: typeof initialServicoTabState;
  setServico: React.Dispatch<React.SetStateAction<typeof initialServicoTabState>>;
  impostos: typeof initialImpostosState;
  setImpostos: React.Dispatch<React.SetStateAction<typeof initialImpostosState>>;
  transparencia: typeof initialTransparenciaState;
  setTransparencia: React.Dispatch<React.SetStateAction<typeof initialTransparenciaState>>;
  reforma: typeof initialReformaState;
  setReforma: React.Dispatch<React.SetStateAction<typeof initialReformaState>>;
  dps: typeof initialDpsState;
  setDps: React.Dispatch<React.SetStateAction<typeof initialDpsState>>;
  prestador: typeof initialPrestadorState;
  setPrestador: React.Dispatch<React.SetStateAction<typeof initialPrestadorState>>;
  intermediario: typeof initialIntermediarioState;
  setIntermediario: React.Dispatch<React.SetStateAction<typeof initialIntermediarioState>>;
  pagamento: typeof initialPagamentoState;
  setPagamento: React.Dispatch<React.SetStateAction<typeof initialPagamentoState>>;
  emailCliente: typeof initialEmailClienteState;
  setEmailCliente: React.Dispatch<React.SetStateAction<typeof initialEmailClienteState>>;
  xml: typeof initialXmlState;
  setXml: React.Dispatch<React.SetStateAction<typeof initialXmlState>>;
  cancelamento: typeof initialCancelamentoState;
  setCancelamento: React.Dispatch<React.SetStateAction<typeof initialCancelamentoState>>;
  anexos: typeof initialAnexosState;
  setAnexos: React.Dispatch<React.SetStateAction<typeof initialAnexosState>>;
  historicoFinanceiro: typeof initialHistoricoFinanceiroState;
  setHistoricoFinanceiro: React.Dispatch<React.SetStateAction<typeof initialHistoricoFinanceiroState>>;
  usuarios: typeof initialUsuariosState;
  setUsuarios: React.Dispatch<React.SetStateAction<typeof initialUsuariosState>>;
  controle: typeof initialControleState;
  setControle: React.Dispatch<React.SetStateAction<typeof initialControleState>>;
  save: () => void;
}

// ─── Context object ───────────────────────────────────────────────────────────

const PortalNacionalContext = createContext<PortalNacionalCtx | null>(null);

export function usePortal(): PortalNacionalCtx {
  const ctx = useContext(PortalNacionalContext);
  if (!ctx) throw new Error('usePortal deve ser usado dentro de PortalNacionalProvider');
  return ctx;
}

// ─── Helper hook: usado em cada tab para manter o padrão s()/sb() ────────────

export function usePortalTab<T extends Record<string, unknown>>(
  value: T,
  set: React.Dispatch<React.SetStateAction<T>>
) {
  const s = (k: keyof T) => (v: string) => set(p => ({ ...p, [k]: v }));
  const sb = (k: keyof T) => (v: boolean) => set(p => ({ ...p, [k]: v }));
  return { f: value, s, sb };
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_PREFIX = 'portal_nacional_v1_';

function lsLoad<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PortalNacionalProvider({ children }: { children: React.ReactNode }) {
  const [cliente, setCliente] = useState(() => lsLoad('cliente', initialClienteState));
  const [endereco, setEndereco] = useState(() => lsLoad('endereco', initialEnderecoState));
  const [contato, setContato] = useState(() => lsLoad('contato', initialContatoState));
  const [bancario, setBancario] = useState(() => lsLoad('bancario', initialBancarioState));
  const [fiscal, setFiscal] = useState(() => lsLoad('fiscal', initialFiscalState));
  const [contrato, setContrato] = useState(() => lsLoad('contrato', initialContratoState));
  const [servico, setServico] = useState(() => lsLoad('servico', initialServicoTabState));
  const [impostos, setImpostos] = useState(() => lsLoad('impostos', initialImpostosState));
  const [transparencia, setTransparencia] = useState(() => lsLoad('transparencia', initialTransparenciaState));
  const [reforma, setReforma] = useState(() => lsLoad('reforma', initialReformaState));
  const [dps, setDps] = useState(() => lsLoad('dps', initialDpsState));
  const [prestador, setPrestador] = useState(() => lsLoad('prestador', initialPrestadorState));
  const [intermediario, setIntermediario] = useState(() => lsLoad('intermediario', initialIntermediarioState));
  const [pagamento, setPagamento] = useState(() => lsLoad('pagamento', initialPagamentoState));
  const [emailCliente, setEmailCliente] = useState(() => lsLoad('emailCliente', initialEmailClienteState));
  const [xml, setXml] = useState(() => lsLoad('xml', initialXmlState));
  const [cancelamento, setCancelamento] = useState(() => lsLoad('cancelamento', initialCancelamentoState));
  const [anexos, setAnexos] = useState(() => lsLoad('anexos', initialAnexosState));
  const [historicoFinanceiro, setHistoricoFinanceiro] = useState(() => lsLoad('historicoFinanceiro', initialHistoricoFinanceiroState));
  const [usuarios, setUsuarios] = useState(() => lsLoad('usuarios', initialUsuariosState));
  const [controle, setControle] = useState(() => lsLoad('controle', initialControleState));

  const save = () => {
    const entries: [string, unknown][] = [
      ['cliente', cliente], ['endereco', endereco], ['contato', contato],
      ['bancario', bancario], ['fiscal', fiscal], ['contrato', contrato],
      ['servico', servico], ['impostos', impostos], ['transparencia', transparencia],
      ['reforma', reforma], ['dps', dps], ['prestador', prestador],
      ['intermediario', intermediario], ['pagamento', pagamento],
      ['emailCliente', emailCliente], ['xml', xml], ['cancelamento', cancelamento],
      ['anexos', anexos], ['historicoFinanceiro', historicoFinanceiro],
      ['usuarios', usuarios], ['controle', controle],
    ];
    entries.forEach(([key, data]) => {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
    });
  };

  return (
    <PortalNacionalContext.Provider value={{
      cliente, setCliente,
      endereco, setEndereco,
      contato, setContato,
      bancario, setBancario,
      fiscal, setFiscal,
      contrato, setContrato,
      servico, setServico,
      impostos, setImpostos,
      transparencia, setTransparencia,
      reforma, setReforma,
      dps, setDps,
      prestador, setPrestador,
      intermediario, setIntermediario,
      pagamento, setPagamento,
      emailCliente, setEmailCliente,
      xml, setXml,
      cancelamento, setCancelamento,
      anexos, setAnexos,
      historicoFinanceiro, setHistoricoFinanceiro,
      usuarios, setUsuarios,
      controle, setControle,
      save,
    }}>
      {children}
    </PortalNacionalContext.Provider>
  );
}
