/**
 * nt-line-hit-test — Detecção de clique/hover na reta.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Verifica se o cursor está sobre a reta e em qual parte:
 *   - 'start'  → handle do ponto 1
 *   - 'end'    → handle do ponto 2
 *   - 'body'   → corpo da linha
 *   - null     → não acertou
 *
 * Prioridade: handles primeiro (são menores e mais difíceis de acertar).
 */

import { distanciaPonto, distanciaAoSegmento } from './nt-geometry';

/** Parte da reta que foi acertada */
export type NtLineHitPart = 'body' | 'start' | 'end';

/** Resultado do hit test */
export interface NtLineHitResult {
	/** ID da reta acertada */
	lineId: string;
	/** Parte acertada */
	part: NtLineHitPart;
	/** Cursor CSS sugerido */
	cursor: string;
}

/** Raio de detecção dos handles (pontas) em pixels */
const HANDLE_RADIUS = 8;

/** Margem extra de detecção no corpo da linha em pixels */
const BODY_MARGIN = 7;

/**
 * Testa se o cursor (cursorX, cursorY) está sobre uma reta
 * definida por (x1,y1)→(x2,y2) com espessura lineWidth.
 *
 * @param cursorX - X do cursor em pixels
 * @param cursorY - Y do cursor em pixels
 * @param x1 - X do ponto 1 em pixels
 * @param y1 - Y do ponto 1 em pixels
 * @param x2 - X do ponto 2 em pixels
 * @param y2 - Y do ponto 2 em pixels
 * @param lineWidth - Espessura da linha
 * @param lineId - ID da reta
 * @returns NtLineHitResult ou null
 */
export function hitTestReta(
	cursorX: number,
	cursorY: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	lineWidth: number,
	lineId: string
): NtLineHitResult | null {
	// 1. Handle do ponto 1 (start)
	if (distanciaPonto(cursorX, cursorY, x1, y1) <= HANDLE_RADIUS) {
		return { lineId, part: 'start', cursor: 'grab' };
	}

	// 2. Handle do ponto 2 (end)
	if (distanciaPonto(cursorX, cursorY, x2, y2) <= HANDLE_RADIUS) {
		return { lineId, part: 'end', cursor: 'grab' };
	}

	// 3. Corpo da linha
	const tolerance = (lineWidth / 2) + BODY_MARGIN;
	if (distanciaAoSegmento(cursorX, cursorY, x1, y1, x2, y2) <= tolerance) {
		return { lineId, part: 'body', cursor: 'move' };
	}

	return null;
}
