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

import { distanciaPonto, distanciaAoSegmento, distanciaALinha, pontoMedio } from '../../nt-geometry';
import { NtLineConfig, NtLineLabel } from './nt-trend-line-primitive';

/** Parte da reta que foi acertada */
export type NtLineHitPart = 'body' | 'start' | 'end' | 'middle';

/** Resultado do hit test */
export interface NtLineHitResult {
	/** ID da reta acertada */
	lineId: string;
	/** Parte acertada */
	part: NtLineHitPart;
	/** Cursor CSS sugerido */
	cursor: string;
}

/** Raio de detecção dos handles (pontas e ponto central) em pixels */
const HANDLE_RADIUS = 8;

/** Margem extra de detecção no corpo da linha em pixels */
const BODY_MARGIN = 7;

/** Margem de detecção do texto em pixels */
const TEXT_HIT_MARGIN = 6;

/** Altura estimada do texto em pixels (12px font) */
const TEXT_HEIGHT = 14;

/**
 * Testa se o cursor (cursorX, cursorY) está sobre uma reta
 * definida por (x1,y1)→(x2,y2) com espessura lineWidth.
 *
 * Prioridade: handles > ponto central > texto > corpo.
 * Handles são menores e mais difíceis de acertar — testados primeiro.
 *
 * @param cursorX - X do cursor em pixels
 * @param cursorY - Y do cursor em pixels
 * @param x1 - X do ponto 1 em pixels
 * @param y1 - Y do ponto 1 em pixels
 * @param x2 - X do ponto 2 em pixels
 * @param y2 - Y do ponto 2 em pixels
 * @param lineWidth - Espessura da linha
 * @param lineId - ID da reta
 * @param config - Configuração da reta (ponto central, extensão)
 * @param label - Texto da reta
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
	lineId: string,
	config?: NtLineConfig,
	label?: NtLineLabel
): NtLineHitResult | null {
	// 1. Handle do ponto 1 (start) — prioridade máxima
	if (distanciaPonto(cursorX, cursorY, x1, y1) <= HANDLE_RADIUS) {
		return { lineId, part: 'start', cursor: 'grab' };
	}

	// 2. Handle do ponto 2 (end)
	if (distanciaPonto(cursorX, cursorY, x2, y2) <= HANDLE_RADIUS) {
		return { lineId, part: 'end', cursor: 'grab' };
	}

	// 3. Ponto central (se ativo)
	if (config?.showMiddlePoint) {
		const mid = pontoMedio(x1, y1, x2, y2);
		if (distanciaPonto(cursorX, cursorY, mid.x, mid.y) <= HANDLE_RADIUS) {
			return { lineId, part: 'middle', cursor: 'grab' };
		}
	}

	// 4. Texto (se ativo) — bounding box simples
	if (label?.enabled && label.text) {
		const textHit = hitTestTexto(cursorX, cursorY, x1, y1, x2, y2, label);
		if (textHit) {
			return { lineId, part: 'body', cursor: 'move' };
		}
	}

	// 5. Corpo da linha (ou linha infinita se tem extensão)
	const tolerance = (lineWidth / 2) + BODY_MARGIN;
	const hasExtension = config?.extendLeft || config?.extendRight;
	const dist = hasExtension
		? distanciaALinha(cursorX, cursorY, x1, y1, x2, y2)
		: distanciaAoSegmento(cursorX, cursorY, x1, y1, x2, y2);
	if (dist <= tolerance) {
		return { lineId, part: 'body', cursor: 'move' };
	}

	return null;
}

/**
 * Hit test simplificado do texto — bounding box retangular.
 * Não rotaciona o bbox (simplificação aceitável pra v1).
 */
function hitTestTexto(
	cursorX: number, cursorY: number,
	x1: number, y1: number, x2: number, y2: number,
	label: NtLineLabel
): boolean {
	// Ponto âncora do texto (mesma lógica do renderer)
	let anchorX: number;
	let anchorY: number;

	if (label.positionOnChart === 'left') {
		anchorX = x1; anchorY = y1;
	} else if (label.positionOnChart === 'right') {
		anchorX = x2; anchorY = y2;
	} else {
		anchorX = (x1 + x2) / 2; anchorY = (y1 + y2) / 2;
	}

	// Offset vertical (mesma lógica do renderer)
	let offsetY = 0;
	if (label.positionOnLine === 'above') offsetY = -8;
	else if (label.positionOnLine === 'below') offsetY = 20;

	// Largura estimada do texto (6px por caractere, fonte 12px)
	const textWidth = label.text.length * 7;

	// Bounding box
	const left = anchorX - TEXT_HIT_MARGIN;
	const right = anchorX + textWidth + TEXT_HIT_MARGIN;
	const top = anchorY + offsetY - TEXT_HEIGHT / 2 - TEXT_HIT_MARGIN;
	const bottom = anchorY + offsetY + TEXT_HEIGHT / 2 + TEXT_HIT_MARGIN;

	return cursorX >= left && cursorX <= right && cursorY >= top && cursorY <= bottom;
}
