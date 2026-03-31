/**
 * nt-geometry — Funções de geometria pura para hit test e desenho.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Cálculos matemáticos sem dependência de chart, canvas ou React.
 * Usado por nt-line-hit-test e nt-line-renderer.
 */

/** Ponto em pixels (coordenadas do canvas) */
export interface PointPx {
	x: number;
	y: number;
}

/** Ponto no mundo do chart (tempo em segundos + preço) */
export interface PointWorld {
	timeSec: number;
	price: number;
}

/**
 * Distância euclidiana entre dois pontos.
 */
export function distanciaPonto(ax: number, ay: number, bx: number, by: number): number {
	const dx = ax - bx;
	const dy = ay - by;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distância mínima de um ponto a um SEGMENTO de reta (finito).
 * Usa projeção ortogonal clamped em [0,1].
 */
export function distanciaAoSegmento(
	px: number, py: number,
	x1: number, y1: number,
	x2: number, y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;

	if (lenSq === 0) {
		return distanciaPonto(px, py, x1, y1);
	}

	let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));

	return distanciaPonto(px, py, x1 + t * dx, y1 + t * dy);
}

/**
 * Distância mínima de um ponto a uma LINHA infinita.
 * Usa fórmula de produto vetorial (cross product).
 * Copiado de lightweight-charts-drawing (MIT) — geometry.ts
 */
export function distanciaALinha(
	px: number, py: number,
	x1: number, y1: number,
	x2: number, y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;

	if (lenSq === 0) {
		return distanciaPonto(px, py, x1, y1);
	}

	const numerador = Math.abs(
		dy * px - dx * py + x2 * y1 - y2 * x1
	);

	return numerador / Math.sqrt(lenSq);
}

/**
 * Verifica se dois pontos estão próximos (dentro de threshold pixels).
 * Copiado de lightweight-charts-drawing (MIT)
 */
export function pontosProximos(
	ax: number, ay: number,
	bx: number, by: number,
	threshold: number
): boolean {
	return distanciaPonto(ax, ay, bx, by) <= threshold;
}

/**
 * Ponto médio entre dois pontos.
 * Copiado de lightweight-charts-drawing (MIT)
 */
export function pontoMedio(
	x1: number, y1: number,
	x2: number, y2: number
): PointPx {
	return {
		x: (x1 + x2) / 2,
		y: (y1 + y2) / 2,
	};
}

/**
 * Ângulo da reta em graus.
 * Copiado de lightweight-charts-drawing (MIT)
 */
export function anguloEmGraus(
	x1: number, y1: number,
	x2: number, y2: number
): number {
	return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

/**
 * Estende uma reta até as bordas do viewport.
 * Copiado de lightweight-charts-drawing (MIT) — extendLineToViewport
 *
 * Pra linhas com extendLeft/extendRight — calcula onde a reta
 * cruza as bordas do viewport usando slope/intercept.
 */
export function estenderRetaAoViewport(
	x1: number, y1: number,
	x2: number, y2: number,
	vpWidth: number, vpHeight: number,
	extendLeft: boolean,
	extendRight: boolean
): { x1: number; y1: number; x2: number; y2: number } {
	const dx = x2 - x1;
	const dy = y2 - y1;

	let nx1 = x1;
	let ny1 = y1;
	let nx2 = x2;
	let ny2 = y2;

	if (dx === 0) {
		// Reta vertical
		if (extendLeft) { nx1 = x1; ny1 = 0; }
		if (extendRight) { nx2 = x2; ny2 = vpHeight; }
		return { x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
	}

	const slope = dy / dx;
	const intercept = y1 - slope * x1;

	if (extendLeft) {
		const yAtX0 = intercept;
		if (yAtX0 >= 0 && yAtX0 <= vpHeight) {
			nx1 = 0; ny1 = yAtX0;
		} else if (yAtX0 < 0) {
			nx1 = -intercept / slope; ny1 = 0;
		} else {
			nx1 = (vpHeight - intercept) / slope; ny1 = vpHeight;
		}
	}

	if (extendRight) {
		const yAtXMax = slope * vpWidth + intercept;
		if (yAtXMax >= 0 && yAtXMax <= vpHeight) {
			nx2 = vpWidth; ny2 = yAtXMax;
		} else if (yAtXMax < 0) {
			nx2 = -intercept / slope; ny2 = 0;
		} else {
			nx2 = (vpHeight - intercept) / slope; ny2 = vpHeight;
		}
	}

	return { x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
}
