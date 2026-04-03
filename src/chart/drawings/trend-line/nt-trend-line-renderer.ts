/**
 * nt-trend-line-renderer — Desenha a reta no canvas.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Só desenha. Não faz hit test, não gerencia estado.
 * Recebe coordenadas em media space (pixels CSS).
 *
 * IMPORTANTE: como a primitiva usa useMediaCoordinateSpace,
 * o canvas já está escalado por pixelRatio. NÃO multiplicar
 * coordenadas por pixelRatio — só espessuras e raios.
 */

import { PointPx, pontoMedio, estenderRetaAoViewport } from '../../nt-geometry';
import { NtLineStyle, NtLineConfig, NtLineLabel } from './nt-trend-line-primitive';

/** Parâmetros pra desenhar uma reta definitiva */
export interface NtLineRenderParams {
	p1: PointPx;
	p2: PointPx;
	style: NtLineStyle;
	config: NtLineConfig;
	label: NtLineLabel;
	selected: boolean;
	selectedColor?: string;
	/** ID da reta (pra cache de ângulo) */
	lineId?: string;
	/** Largura do viewport (pra extensão) */
	vpWidth?: number;
	/** Altura do viewport (pra extensão) */
	vpHeight?: number;
}

/** Parâmetros pra desenhar o preview durante criação */
export interface NtLinePreviewParams {
	origin: PointPx;
	cursor: PointPx;
	style: NtLineStyle;
}

/** Raio visual dos handles */
const HANDLE_RADIUS = 4;
/** Raio visual da âncora durante preview */
const ANCHOR_RADIUS = 3;

/**
 * Desenha uma reta definitiva no canvas.
 * Se selecionada, desenha handles nas pontas.
 */
export function desenharReta(
	ctx: CanvasRenderingContext2D,
	params: NtLineRenderParams
): void {
	const { p1, p2, style, config, label, selected, selectedColor, lineId, vpWidth, vpHeight } = params;
	const cor = selected && selectedColor ? selectedColor : style.color;

	// Calcular pontos de desenho (com extensão se configurado)
	let drawP1 = p1;
	let drawP2 = p2;

	if ((config.extendLeft || config.extendRight) && vpWidth && vpHeight) {
		const ext = estenderRetaAoViewport(
			p1.x, p1.y, p2.x, p2.y,
			vpWidth, vpHeight,
			config.extendLeft, config.extendRight
		);
		drawP1 = { x: ext.x1, y: ext.y1 };
		drawP2 = { x: ext.x2, y: ext.y2 };
	}

	// Desenhar a reta
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = cor;
	ctx.lineWidth = style.width;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	aplicarDash(ctx, style.dash);
	ctx.moveTo(drawP1.x, drawP1.y);
	ctx.lineTo(drawP2.x, drawP2.y);
	ctx.stroke();
	ctx.restore();

	// Handles nas pontas (quando selecionada)
	if (selected) {
		desenharHandle(ctx, p1, cor);
		desenharHandle(ctx, p2, cor);
	}

	// Ponto central (handle no meio da reta original, não da extensão)
	if (config.showMiddlePoint) {
		const mid = pontoMedio(p1.x, p1.y, p2.x, p2.y);
		desenharHandle(ctx, mid, cor);
	}

	// Texto na reta (opacidade reduzida se não selecionada — reduz poluição visual)
	if (label.enabled && label.text) {
		if (!selected) {
			ctx.save();
			ctx.globalAlpha = 0.6;
		}
		desenharTexto(ctx, label, p1, p2, cor, lineId ?? '');
		if (!selected) {
			ctx.restore();
		}
	}
}

/**
 * Desenha o preview da reta durante criação.
 * Âncora fixa no ponto de origem + linha tracejada até o cursor.
 */
export function desenharPreview(
	ctx: CanvasRenderingContext2D,
	params: NtLinePreviewParams
): void {
	const { origin, cursor, style } = params;

	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width;
	ctx.lineCap = 'round';
	ctx.globalAlpha = 0.6;
	ctx.setLineDash([5, 5]);
	ctx.moveTo(origin.x, origin.y);
	ctx.lineTo(cursor.x, cursor.y);
	ctx.stroke();
	ctx.restore();

	ctx.save();
	ctx.beginPath();
	ctx.fillStyle = style.color;
	ctx.arc(origin.x, origin.y, ANCHOR_RADIUS, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

// --- Auxiliares ---

function desenharHandle(ctx: CanvasRenderingContext2D, p: PointPx, cor: string): void {
	ctx.beginPath();
	ctx.fillStyle = '#131722';
	ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
	ctx.fill();

	ctx.beginPath();
	ctx.strokeStyle = cor;
	ctx.lineWidth = 1.5;
	ctx.arc(p.x, p.y, HANDLE_RADIUS - 0.75, 0, Math.PI * 2);
	ctx.stroke();
}

function aplicarDash(ctx: CanvasRenderingContext2D, dash: string): void {
	if (dash === 'dashed') ctx.setLineDash([6, 6]);
	else if (dash === 'dotted') ctx.setLineDash([2, 4]);
	else ctx.setLineDash([]);
}

/** Margem vertical entre o texto e a reta (em pixels) */
const TEXT_OFFSET_PX = 8;

/**
 * Cache de ângulo por reta — evita recalcular atan2 em todo frame.
 * Invalida quando os pontos mudam (compara por posição).
 */
const _angleCache = new Map<string, { p1x: number; p1y: number; p2x: number; p2y: number; angle: number }>();

function calcularAngulo(id: string, p1: PointPx, p2: PointPx): number {
	const cached = _angleCache.get(id);
	if (cached && cached.p1x === p1.x && cached.p1y === p1.y && cached.p2x === p2.x && cached.p2y === p2.y) {
		return cached.angle;
	}
	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	_angleCache.set(id, { p1x: p1.x, p1y: p1.y, p2x: p2.x, p2y: p2.y, angle });
	return angle;
}

/**
 * Desenha texto associado à reta.
 * Posição horizontal: esquerda (p1), centro (meio), direita (p2).
 * Posição vertical: acima, centro ou abaixo da reta.
 * Se followAngle: rotaciona o texto pra acompanhar a inclinação.
 */
function desenharTexto(
	ctx: CanvasRenderingContext2D,
	label: NtLineLabel,
	p1: PointPx,
	p2: PointPx,
	cor: string,
	lineId: string
): void {
	// Ponto âncora do texto (esquerda, centro ou direita da reta)
	let anchorX: number;
	let anchorY: number;
	let textAlign: CanvasTextAlign;

	if (label.positionOnChart === 'left') {
		anchorX = p1.x;
		anchorY = p1.y;
		textAlign = 'left';
	} else if (label.positionOnChart === 'right') {
		anchorX = p2.x;
		anchorY = p2.y;
		textAlign = 'right';
	} else {
		anchorX = (p1.x + p2.x) / 2;
		anchorY = (p1.y + p2.y) / 2;
		textAlign = 'center';
	}

	// Offset vertical (acima, centro, abaixo)
	let offsetY = 0;
	if (label.positionOnLine === 'above') offsetY = -TEXT_OFFSET_PX;
	else if (label.positionOnLine === 'below') offsetY = TEXT_OFFSET_PX + 12;

	// Ângulo da reta (cacheado pra evitar atan2 em todo frame)
	const angle = label.followAngle ? calcularAngulo(lineId, p1, p2) : 0;

	ctx.save();
	ctx.translate(anchorX, anchorY + offsetY);
	if (angle !== 0) ctx.rotate(angle);
	ctx.font = '12px sans-serif';
	ctx.fillStyle = cor;
	ctx.textAlign = textAlign;
	ctx.textBaseline = 'middle';
	ctx.fillText(label.text, 0, 0);
	ctx.restore();
}
