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

import { PointPx } from '../../nt-geometry';
import { NtLineStyle } from './nt-trend-line-primitive';

/** Parâmetros pra desenhar uma reta definitiva */
export interface NtLineRenderParams {
	p1: PointPx;
	p2: PointPx;
	style: NtLineStyle;
	selected: boolean;
	selectedColor?: string;
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
	const { p1, p2, style, selected, selectedColor } = params;
	const cor = selected && selectedColor ? selectedColor : style.color;

	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = cor;
	ctx.lineWidth = style.width;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	aplicarDash(ctx, style.dash);
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();
	ctx.restore();

	if (selected) {
		desenharHandle(ctx, p1, cor);
		desenharHandle(ctx, p2, cor);
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
