/**
 * nt-line-primitive — Objeto da reta (dados + estado).
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Só guarda dados e permite mutação controlada.
 * Não desenha, não faz hit test, não conhece canvas.
 */

import { PointWorld } from './nt-geometry';

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
