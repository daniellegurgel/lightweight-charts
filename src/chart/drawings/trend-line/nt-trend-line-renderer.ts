/**
 * nt-trend-line-renderer — Desenha a reta no canvas.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Só desenha. Não faz hit test, não gerencia estado.
 * Recebe coordenadas em pixels já convertidas.
 *
 * pixelRatio: todas as coordenadas são escaladas por pixelRatio
 * pra renderização correta em telas retina/HiDPI.
 * Pattern copiado de lightweight-charts-drawing (MIT) — canvas-utils.ts
 */

import { PointPx } from '../../nt-geometry';
import { NtLineStyle } from './nt-trend-line-primitive';

/** Parâmetros pra desenhar uma reta definitiva */
export interface NtLineRenderParams {
	p1: PointPx;
	p2: PointPx;
	style: NtLineStyle;
	selected: boolean;
	selectedColor?: string;
	/** Ratio de pixels do dispositivo (window.devicePixelRatio). Default: 1 */
	pixelRatio?: number;
}

/** Parâmetros pra desenhar o preview durante criação */
export interface NtLinePreviewParams {
	origin: PointPx;
	cursor: PointPx;
	style: NtLineStyle;
	pixelRatio?: number;
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
	const { p1, p2, style, selected, selectedColor } = params;
	const pr = params.pixelRatio ?? 1;
	const cor = selected && selectedColor ? selectedColor : style.color;

	// Linha
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = cor;
	ctx.lineWidth = style.width * pr;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	aplicarDash(ctx, style.dash, pr);
	ctx.moveTo(p1.x * pr, p1.y * pr);
	ctx.lineTo(p2.x * pr, p2.y * pr);
	ctx.stroke();
	ctx.restore();

	// Handles (só quando selecionada)
	if (selected) {
		desenharHandle(ctx, p1, cor, pr);
		desenharHandle(ctx, p2, cor, pr);
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
	const pr = params.pixelRatio ?? 1;

	// Linha preview (tracejada, mais transparente)
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = style.color;
	ctx.lineWidth = style.width * pr;
	ctx.lineCap = 'round';
	ctx.globalAlpha = 0.6;
	ctx.setLineDash([5 * pr, 5 * pr]);
	ctx.moveTo(origin.x * pr, origin.y * pr);
	ctx.lineTo(cursor.x * pr, cursor.y * pr);
	ctx.stroke();
	ctx.restore();

	// Âncora no ponto de origem
	ctx.save();
	ctx.beginPath();
	ctx.fillStyle = style.color;
	ctx.arc(origin.x * pr, origin.y * pr, ANCHOR_RADIUS * pr, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

// --- Auxiliares ---

/**
 * Desenha handle no estilo TradingView (centro escuro + anel colorido).
 * Pattern copiado de lightweight-charts-drawing (MIT) — canvas-utils.ts
 */
function desenharHandle(ctx: CanvasRenderingContext2D, p: PointPx, cor: string, pr: number): void {
	const x = p.x * pr;
	const y = p.y * pr;
	const radius = HANDLE_RADIUS * pr;

	// Centro escuro
	ctx.beginPath();
	ctx.fillStyle = '#131722';
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();

	// Anel colorido
	ctx.beginPath();
	ctx.strokeStyle = cor;
	ctx.lineWidth = 1.5 * pr;
	ctx.arc(x, y, radius - (0.75 * pr), 0, Math.PI * 2);
	ctx.stroke();
}

function aplicarDash(ctx: CanvasRenderingContext2D, dash: string, pr: number): void {
	if (dash === 'dashed') ctx.setLineDash([6 * pr, 6 * pr]);
	else if (dash === 'dotted') ctx.setLineDash([2 * pr, 4 * pr]);
	else ctx.setLineDash([]);
}
