// EXEMPLO DE INTEGRACAO: Como usar o mapeamento NBS curado com seu codigo

import {
    SERVICO_NACIONAL_OPTIONS,
    ServicoNacionalItem
} from '../nfseOfficialTables';

import {
    MAPEAMENTO_CURADO_SERVICOS,
    MapeamentoNbsCurado,
    getNbsCorrelato,
    getDescricaoNbsCorrelata
} from './mapeamento_nbs';

export interface ServicoComMapeamentoNbs extends ServicoNacionalItem {
    nbsCorrelato?: string;
    descricaoNbs?: string;
    mapeamentoCurado?: MapeamentoNbsCurado;
}

export function enriquecerServicosComNbs(): ServicoComMapeamentoNbs[] {
    return SERVICO_NACIONAL_OPTIONS
        .map(servico => {
            const nbs = getNbsCorrelato(servico.codigo);
            const descricaoNbs = getDescricaoNbsCorrelata(servico.codigo);
            const mapeamento = MAPEAMENTO_CURADO_SERVICOS.find(
                m => m.lc116 === servico.codigo
            );

            return {
                ...servico,
                nbsCorrelato: nbs,
                descricaoNbs: descricaoNbs,
                mapeamentoCurado: mapeamento
            };
        })
        .filter(servico => servico.nbsCorrelato);
}

export function buscarServicoComNbs(lc116Codigo: string): ServicoComMapeamentoNbs | undefined {
    const servico = SERVICO_NACIONAL_OPTIONS.find(s => s.codigo === lc116Codigo);

    if (!servico) return undefined;

    const nbs = getNbsCorrelato(lc116Codigo);
    const descricaoNbs = getDescricaoNbsCorrelata(lc116Codigo);
    const mapeamento = MAPEAMENTO_CURADO_SERVICOS.find(
        m => m.lc116 === lc116Codigo
    );

    return {
        ...servico,
        nbsCorrelato: nbs,
        descricaoNbs: descricaoNbs,
        mapeamentoCurado: mapeamento
    };
}

export function buscarServicosPorTermo(termo: string): ServicoComMapeamentoNbs[] {
    const termoLower = termo.toLowerCase();

    return MAPEAMENTO_CURADO_SERVICOS
        .filter(m => m.termoComum.toLowerCase().includes(termoLower))
        .map(mapeamento => {
            const servico = SERVICO_NACIONAL_OPTIONS.find(
                s => s.codigo === mapeamento.lc116
            );

            return {
                ...servico!,
                nbsCorrelato: mapeamento.nbs,
                descricaoNbs: mapeamento.descricaoNbs,
                mapeamentoCurado: mapeamento
            };
        });
}

export interface DadosNotaFiscalServico {
    descricaoServico: string;
    lc116: string;
    nbs: string;
    descricaoNbs: string;
    termoComum: string;
}

export function gerarDadosNotaFiscal(lc116Codigo: string): DadosNotaFiscalServico | null {
    const mapeamento = MAPEAMENTO_CURADO_SERVICOS.find(m => m.lc116 === lc116Codigo);

    if (!mapeamento) return null;

    return {
        descricaoServico: mapeamento.termoComum,
        lc116: mapeamento.lc116,
        nbs: mapeamento.nbs,
        descricaoNbs: mapeamento.descricaoNbs,
        termoComum: mapeamento.termoComum
    };
}

export default {
    enriquecerServicosComNbs,
    buscarServicoComNbs,
    buscarServicosPorTermo,
    gerarDadosNotaFiscal
};
