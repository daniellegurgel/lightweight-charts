/**
 * nt-line-primitive — Objeto da reta (dados + estado).
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Só guarda dados e permite mutação controlada.
 * Não desenha, não faz hit test, não conhece canvas.
 */

import { PointWorld } from '../../nt-geometry';

/** Estilo visual da reta */
export interface NtLineStyle {
	color: string;
	width: number;
	dash: 'solid' | 'dashed' | 'dotted';
}

/** Estilo padrão */
export const NT_LINE_DEFAULT_STYLE: NtLineStyle = {
	color: '#2962FF',
	width: 2,
	dash: 'solid',
};

/** Dados completos de uma reta */
export interface NtLineData {
	id: string;
	point1: PointWorld;
	point2: PointWorld;
	style: NtLineStyle;
	visible: boolean;
	locked: boolean;
}

/** Gera ID único pra uma reta */
export function gerarIdReta(): string {
	return `nt-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Cria uma reta com defaults seguros */
export function criarReta(
	point1: PointWorld,
	point2: PointWorld,
	style?: Partial<NtLineStyle>
): NtLineData {
	return {
		id: gerarIdReta(),
		point1,
		point2,
		style: { ...NT_LINE_DEFAULT_STYLE, ...style },
		visible: true,
		locked: false,
	};
}

/** Move a reta inteira por delta em coordenadas mundo */
export function moverReta(
	reta: NtLineData,
	deltaTime: number,
	deltaPrice: number
): NtLineData {
	if (reta.locked) return reta;
	return {
		...reta,
		point1: {
			timeSec: reta.point1.timeSec + deltaTime,
			price: reta.point1.price + deltaPrice,
		},
		point2: {
			timeSec: reta.point2.timeSec + deltaTime,
			price: reta.point2.price + deltaPrice,
		},
	};
}

/** Move uma ponta específica da reta */
export function moverPonta(
	reta: NtLineData,
	ponta: 'start' | 'end',
	novoMundo: PointWorld
): NtLineData {
	if (reta.locked) return reta;
	if (ponta === 'start') {
		return { ...reta, point1: novoMundo };
	}
	return { ...reta, point2: novoMundo };
}

// ============================================================================
// Conversão de tempo robusta
// ============================================================================

/**
 * Converte qualquer formato de tempo do Lightweight Charts pra segundos Unix.
 * Aceita: number (epoch seconds), string ("YYYY-MM-DD"), BusinessDay ({year, month, day}).
 * Copiado de lightweight-charts-drawing (MIT) — base-line.ts
 */
export function timeToSeconds(time: unknown): number {
	if (typeof time === 'number') return time;
	if (typeof time === 'string') return new Date(time).getTime() / 1000;
	if (typeof time === 'object' && time !== null && 'year' in time) {
		const bd = time as { year: number; month: number; day: number };
		return new Date(bd.year, bd.month - 1, bd.day).getTime() / 1000;
	}
	return 0;
}

// ============================================================================
// Serialização
// ============================================================================

/** Serializa uma reta pra JSON (persistência) */
export function retaToJSON(reta: NtLineData): object {
	return {
		id: reta.id,
		type: 'trend-line',
		point1: reta.point1,
		point2: reta.point2,
		style: reta.style,
		visible: reta.visible,
		locked: reta.locked,
	};
}

/** Reconstrói uma reta a partir de JSON */
export function retaFromJSON(data: any): NtLineData | null {
	if (!data || !data.point1 || !data.point2) return null;

	return {
		id: data.id || gerarIdReta(),
		point1: { timeSec: data.point1.timeSec, price: data.point1.price },
		point2: { timeSec: data.point2.timeSec, price: data.point2.price },
		style: {
			color: data.style?.color ?? NT_LINE_DEFAULT_STYLE.color,
			width: data.style?.width ?? NT_LINE_DEFAULT_STYLE.width,
			dash: data.style?.dash ?? NT_LINE_DEFAULT_STYLE.dash,
		},
		visible: data.visible ?? true,
		locked: data.locked ?? false,
	};
}
