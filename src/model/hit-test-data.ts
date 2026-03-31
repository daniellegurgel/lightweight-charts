/**
 * HitTestObjectData — Tipo estruturado do retorno de hitTest dos renderers.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Todo renderer que implementa hitTest() deve retornar este objeto
 * dentro de HoveredObject.hitTestData. Isso permite que a camada
 * superior (pane-hit-test, selection-manager) identifique
 * qual tipo de objeto foi acertado, qual parte e o índice do item.
 */

/**
 * Partes clicáveis de um objeto no gráfico.
 * - body: corpo principal (linha, candle, barra, área)
 * - start: extremidade inicial (futuro: Fibo, trend line)
 * - end: extremidade final
 * - handle: ponto de arraste/redimensionamento
 */
export type HitTestPart = 'body' | 'start' | 'end' | 'handle';

/**
 * Tipos de objeto que podem ser acertados pelo hitTest.
 * - series: série de dados (linha, candle, barra, área, histograma)
 * - marker: marcador de série (seta, círculo, texto)
 * - drawing: desenho do usuário (futuro: Fibo, canal, retângulo)
 * - priceline: linha de preço horizontal
 */
export type HitTestObjectType = 'series' | 'marker' | 'drawing' | 'priceline';

/**
 * Dados estruturados retornados pelo hitTest de um renderer.
 *
 * Vai dentro de HoveredObject.hitTestData (que é unknown).
 * A camada que consome faz cast pra este tipo.
 */
export interface HitTestObjectData {
	/** Tipo do objeto acertado */
	objectType: HitTestObjectType;
	/** Qual parte do objeto foi acertada */
	part: HitTestPart;
	/** Índice do item dentro da série (barra, segmento, marcador) */
	itemIndex: number;
}
