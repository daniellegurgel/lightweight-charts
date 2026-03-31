/**
 * LineRendererBase — Renderer base para séries de linha.
 *
 * Arquivo MODIFICADO pelo fork Neurotrading — Danielle Gurgel
 * Alteração: adicionado hitTest() e distanciaAoSegmento() para detecção nativa de clique/hover em linhas.
 *
 * O hitTest usa cálculo de distância ponto-a-segmento (geometria exata).
 * Quando o cursor está a menos de (lineWidth/2 + 4px) de qualquer segmento
 * visível da linha, retorna HoveredObject com cursorStyle: 'pointer'.
 *
 * Isso permite que o sistema de eventos do chart (crosshair, hover, click)
 * identifique qual série de linha está sob o cursor sem heurística.
 */

import { BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { HoveredObject } from '../model/chart-model';
import { Coordinate } from '../model/coordinate';
import { HitTestObjectData } from '../model/hit-test-data';
import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { BitmapCoordinatesPaneRenderer } from './bitmap-coordinates-pane-renderer';
import { getDashPatternLength, LinePoint, LineStyle, LineType, LineWidth, setLineStyle } from './draw-line';
import { drawSeriesPointMarkers } from './draw-series-point-markers';
import { walkLine } from './walk-line';

export type LineItemBase = TimedValue & PricedValue & LinePoint;

export interface PaneRendererLineDataBase<TItem extends LineItemBase = LineItemBase> {
	lineType?: LineType;

	items: TItem[];

	barWidth: number;

	lineWidth: LineWidth;
	lineStyle: LineStyle;

	visibleRange: SeriesItemsIndexesRange | null;

	pointMarkersRadius?: number;
}

function finishStyledArea(scope: BitmapCoordinatesRenderingScope, style: CanvasRenderingContext2D['strokeStyle']): void {
	const ctx = scope.context;
	ctx.strokeStyle = style;
	ctx.stroke();
}

export abstract class PaneRendererLineBase<TData extends PaneRendererLineDataBase> extends BitmapCoordinatesPaneRenderer {
	protected _data: TData | null = null;

	public setData(data: TData): void {
		this._data = data;
	}

	public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		const { items, visibleRange, lineWidth } = this._data;
		const tolerance = (lineWidth / 2) + 4;

		for (let i = visibleRange.from; i < visibleRange.to - 1; i++) {
			const p1 = items[i];
			const p2 = items[i + 1];

			if (distanciaAoSegmento(x, y, p1.x, p1.y, p2.x, p2.y) <= tolerance) {
				const data: HitTestObjectData = {
					objectType: 'series',
					part: 'body',
					itemIndex: i,
				};
				return {
					cursorStyle: 'pointer',
					hitTestData: data,
				};
			}
		}

		return null;
	}

	protected _drawImpl(renderingScope: BitmapCoordinatesRenderingScope): void {
		if (this._data === null) {
			return;
		}

		const { items, visibleRange, barWidth, lineType, lineWidth, lineStyle, pointMarkersRadius } = this._data;

		if (visibleRange === null) {
			return;
		}

		const ctx = renderingScope.context;

		ctx.lineCap = 'butt';
		ctx.lineWidth = lineWidth * renderingScope.verticalPixelRatio;

		const dashPattern = setLineStyle(ctx, lineStyle);

		ctx.lineJoin = 'round';

		const styleGetter = this._strokeStyle.bind(this);

		const dashPatternLength = getDashPatternLength(dashPattern);

		if (lineType !== undefined) {
			walkLine(renderingScope, items, lineType, visibleRange, barWidth, styleGetter, finishStyledArea, dashPatternLength);
		}

		if (pointMarkersRadius) {
			drawSeriesPointMarkers(renderingScope, items, pointMarkersRadius, visibleRange, styleGetter);
		}
	}

	protected abstract _strokeStyle(renderingScope: BitmapCoordinatesRenderingScope, item: TData['items'][0]): CanvasRenderingContext2D['strokeStyle'];
}

/**
 * Calcula a distância mínima de um ponto (px, py) a um segmento de reta (x1,y1)→(x2,y2).
 *
 * Usa projeção ortogonal do ponto sobre o segmento, limitada (clamped) entre 0 e 1
 * pra não extrapolar além das extremidades.
 *
 * Retorna a distância em pixels — se menor que a tolerância do hitTest,
 * o cursor está "sobre" a linha.
 */
function distanciaAoSegmento(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;

	if (lenSq === 0) {
		// Segmento degenerado (ponto único)
		const ddx = px - x1;
		const ddy = py - y1;
		return Math.sqrt(ddx * ddx + ddy * ddy);
	}

	// Projeção do ponto no segmento, clamped em [0,1]
	let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));

	const projX = x1 + t * dx;
	const projY = y1 + t * dy;
	const ddx = px - projX;
	const ddy = py - projY;

	return Math.sqrt(ddx * ddx + ddy * ddy);
}
