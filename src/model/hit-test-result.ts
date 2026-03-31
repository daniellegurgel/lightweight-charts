/**
 * HitTestEnrichedResult — Resultado enriquecido do hit test.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Junta o que o RENDERER sabe (parte, índice) com o que o MODEL sabe (identidade estável).
 * A identidade usa sourceType + seriesIndex (estável durante a vida da série).
 *
 * Isso permite que o selection-manager e o app identifiquem
 * o objeto selecionado sem depender de referência de memória.
 */

import { HitTestObjectData, HitTestObjectType, HitTestPart } from './hit-test-data';

/**
 * Identidade estável de um objeto no gráfico.
 * Não depende de referência de memória — pode ser serializada e comparada.
 */
export interface SelectableObjectId {
	/** Tipo do source que contém o objeto */
	sourceType: 'series' | 'pane' | 'primitive';
	/** Índice da série no pane (estável enquanto a série existir) */
	seriesIndex: number;
	/** Tipo do objeto acertado (vem do renderer) */
	objectType: HitTestObjectType;
	/** ID externo do plugin/primitiva, se aplicável */
	externalId?: string;
}

/**
 * Resultado completo do hit test — identidade + detalhe do hit.
 */
export interface HitTestEnrichedResult {
	/** Identidade estável do objeto */
	id: SelectableObjectId;
	/** Parte do objeto acertada */
	part: HitTestPart;
	/** Índice do item dentro da série (barra, segmento, marcador) */
	itemIndex: number;
	/** Estilo do cursor a exibir */
	cursorStyle: string;
}

/**
 * Cria um HitTestEnrichedResult a partir dos dados do renderer + contexto do model.
 *
 * @param hitData - Dados retornados pelo renderer (HitTestObjectData)
 * @param seriesIndex - Índice da série no pane
 * @param cursorStyle - Estilo do cursor (default: 'pointer')
 * @param externalId - ID externo do plugin (opcional)
 */
export function createEnrichedHitResult(
	hitData: HitTestObjectData,
	seriesIndex: number,
	cursorStyle: string = 'pointer',
	externalId?: string
): HitTestEnrichedResult {
	return {
		id: {
			sourceType: 'series',
			seriesIndex,
			objectType: hitData.objectType,
			externalId,
		},
		part: hitData.part,
		itemIndex: hitData.itemIndex,
		cursorStyle,
	};
}

/**
 * Compara dois SelectableObjectId pra saber se apontam pro mesmo objeto.
 */
export function isSameObject(a: SelectableObjectId, b: SelectableObjectId): boolean {
	return (
		a.sourceType === b.sourceType &&
		a.seriesIndex === b.seriesIndex &&
		a.objectType === b.objectType &&
		a.externalId === b.externalId
	);
}
