/**
 * AreaRendererBase — Renderer base para séries de área (linha + preenchimento).
 *
 * Arquivo MODIFICADO pelo fork Neurotrading — Danielle Gurgel
 * Alteração: adicionado hitTest() para detecção nativa de clique/hover na área.
 *
 * O hitTest verifica se o cursor está dentro da região preenchida:
 * entre a linha da série e a base do preenchimento (baseLevelCoordinate).
 * Também detecta clique na linha em si (mesma lógica de distância ponto-segmento).
 */

import { BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { HoveredObject } from '../model/chart-model';
import { Coordinate } from '../model/coordinate';
import { HitTestObjectData } from '../model/hit-test-data';
import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { BitmapCoordinatesPaneRenderer } from './bitmap-coordinates-pane-renderer';
import { LinePoint, LineStyle, LineType, LineWidth, setLineStyle } from './draw-line';
import { walkLine } from './walk-line';

export type AreaFillItemBase = TimedValue & PricedValue & LinePoint;
export interface PaneRendererAreaDataBase<TItem extends AreaFillItemBase = AreaFillItemBase> {
	items: TItem[];
	lineType: LineType;
	lineWidth: LineWidth;
	lineStyle: LineStyle;

	baseLevelCoordinate: Coordinate | null;
	invertFilledArea: boolean;

	barWidth: number;

	visibleRange: SeriesItemsIndexesRange | null;
}

function finishStyledArea(
	baseLevelCoordinate: Coordinate,
	scope: BitmapCoordinatesRenderingScope,
	style: CanvasRenderingContext2D['fillStyle'],
	areaFirstItem: LinePoint,
	newAreaFirstItem: LinePoint
): void {
	const { context, horizontalPixelRatio, verticalPixelRatio } = scope;
	context.lineTo(newAreaFirstItem.x * horizontalPixelRatio, baseLevelCoordinate * verticalPixelRatio);
	context.lineTo(areaFirstItem.x * horizontalPixelRatio, baseLevelCoordinate * verticalPixelRatio);
	context.closePath();
	context.fillStyle = style;
	context.fill();
}

export abstract class PaneRendererAreaBase<TData extends PaneRendererAreaDataBase> extends BitmapCoordinatesPaneRenderer {
	protected _data: TData | null = null;

	public setData(data: TData): void {
		this._data = data;
	}

	/**
	 * Hit test para séries de área.
	 *
	 * Verifica se o cursor está entre a linha da série e a base do preenchimento.
	 * Pra cada par de pontos consecutivos, checa se X está no intervalo
	 * e se Y está entre a linha interpolada e o baseLevelCoordinate.
	 *
	 * @param x - Coordenada X do cursor (pixels)
	 * @param y - Coordenada Y do cursor (pixels)
	 * @returns HoveredObject ou null
	 */
	public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		const { items, visibleRange, baseLevelCoordinate, invertFilledArea } = this._data;
		// Base do preenchimento: se não definida, topo (invertida) ou fundo do painel
		const base = baseLevelCoordinate ?? (invertFilledArea ? 0 : 10000) as Coordinate;

		for (let i = visibleRange.from; i < visibleRange.to - 1; i++) {
			const p1 = items[i];
			const p2 = items[i + 1];

			// Cursor fora do intervalo horizontal deste segmento
			if (x < Math.min(p1.x, p2.x) || x > Math.max(p1.x, p2.x)) {
				continue;
			}

			// Interpolar Y da linha no ponto X do cursor
			const t = (p2.x - p1.x) !== 0 ? (x - p1.x) / (p2.x - p1.x) : 0;
			const lineY = p1.y + t * (p2.y - p1.y);

			// Verificar se Y está entre a linha e a base
			const top = Math.min(lineY, base);
			const bottom = Math.max(lineY, base);

			if (y >= top && y <= bottom) {
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

		const { items, visibleRange, barWidth, lineWidth, lineStyle, lineType } = this._data;
		const baseLevelCoordinate =
			this._data.baseLevelCoordinate ??
				(this._data.invertFilledArea ? 0 : renderingScope.mediaSize.height) as Coordinate;

		if (visibleRange === null) {
			return;
		}

		const ctx = renderingScope.context;

		ctx.lineCap = 'butt';
		ctx.lineJoin = 'round';
		ctx.lineWidth = lineWidth;
		setLineStyle(ctx, lineStyle);

		// walk lines with width=1 to have more accurate gradient's filling
		ctx.lineWidth = 1;

		walkLine(renderingScope, items, lineType, visibleRange, barWidth, this._fillStyle.bind(this), finishStyledArea.bind(null, baseLevelCoordinate));
	}

	protected abstract _fillStyle(renderingScope: BitmapCoordinatesRenderingScope, item: TData['items'][0]): CanvasRenderingContext2D['fillStyle'];
}
