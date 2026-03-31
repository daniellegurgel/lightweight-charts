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
 * Distância mínima de um ponto (px, py) a um segmento de reta (x1,y1)→(x2,y2).
 *
 * Usa projeção ortogonal clamped em [0,1] pra não extrapolar
 * além das extremidades do segmento.
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
