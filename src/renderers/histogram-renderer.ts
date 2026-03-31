/**
 * HistogramRenderer — Renderer de histograma (barras verticais de volume, etc.).
 *
 * Arquivo MODIFICADO pelo fork Neurotrading — Danielle Gurgel
 * Alteração: adicionado hitTest() para detecção nativa de clique/hover em barras do histograma.
 *
 * O hitTest verifica se o cursor está dentro da área da barra
 * (entre histogramBase e o topo da barra, dentro da largura do barSpacing).
 */

import { BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { HoveredObject } from '../model/chart-model';
import { Coordinate } from '../model/coordinate';
import { HitTestObjectData } from '../model/hit-test-data';
import { PricedValue } from '../model/price-scale';
import { SeriesItemsIndexesRange, TimedValue, TimePointIndex } from '../model/time-data';

import { BitmapCoordinatesPaneRenderer } from './bitmap-coordinates-pane-renderer';

const showSpacingMinimalBarWidth = 1;
const alignToMinimalWidthLimit = 4;

export interface HistogramItem extends PricedValue, TimedValue {
	barColor: string;
}

export interface PaneRendererHistogramData {
	items: HistogramItem[];

	barSpacing: number;
	histogramBase: number;

	visibleRange: SeriesItemsIndexesRange | null;
}

interface PrecalculatedItemCoordinates {
	left: number;
	right: number;
	roundedCenter: number;
	center: number;
	time: TimePointIndex;
}

export class PaneRendererHistogram extends BitmapCoordinatesPaneRenderer {
	private _data: PaneRendererHistogramData | null = null;
	private _precalculatedCache: PrecalculatedItemCoordinates[] = [];

	public setData(data: PaneRendererHistogramData): void {
		this._data = data;
		this._precalculatedCache = [];
	}

	/**
	 * Hit test para barras de histograma.
	 *
	 * Verifica se o cursor está dentro da área visual da barra:
	 * - Horizontal: bar.x ± metade do barSpacing
	 * - Vertical: entre o topo da barra (item.y) e a base do histograma
	 *
	 * @param x - Coordenada X do cursor (pixels, relativa ao painel)
	 * @param y - Coordenada Y do cursor (pixels, relativa ao painel)
	 * @returns HoveredObject com índice da barra, ou null se não acertou
	 */
	public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		const { items, barSpacing, histogramBase, visibleRange } = this._data;
		const halfBar = barSpacing / 2;

		for (let i = visibleRange.from; i < visibleRange.to; i++) {
			const item = items[i];
			const top = Math.min(item.y, histogramBase);
			const bottom = Math.max(item.y, histogramBase);

			if (
				x >= item.x - halfBar &&
				x <= item.x + halfBar &&
				y >= top &&
				y <= bottom
			) {
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

	protected override _drawImpl({ context: ctx, horizontalPixelRatio, verticalPixelRatio }: BitmapCoordinatesRenderingScope): void {
		if (this._data === null || this._data.items.length === 0 || this._data.visibleRange === null) {
			return;
		}
		if (!this._precalculatedCache.length) {
			this._fillPrecalculatedCache(horizontalPixelRatio);
		}

		const tickWidth = Math.max(1, Math.floor(verticalPixelRatio));
		const histogramBase = Math.round((this._data.histogramBase) * verticalPixelRatio);
		const topHistogramBase = histogramBase - Math.floor(tickWidth / 2);
		const bottomHistogramBase = topHistogramBase + tickWidth;

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			const current = this._precalculatedCache[i - this._data.visibleRange.from];
			const y = Math.round(item.y * verticalPixelRatio);
			ctx.fillStyle = item.barColor;

			let top: number;
			let bottom: number;

			if (y <= topHistogramBase) {
				top = y;
				bottom = bottomHistogramBase;
			} else {
				top = topHistogramBase;
				bottom = y - Math.floor(tickWidth / 2) + tickWidth;
			}

			ctx.fillRect(current.left, top, current.right - current.left + 1, bottom - top);
		}
	}

	// eslint-disable-next-line complexity
	private _fillPrecalculatedCache(pixelRatio: number): void {
		if (this._data === null || this._data.items.length === 0 || this._data.visibleRange === null) {
			this._precalculatedCache = [];
			return;
		}
		const spacing = Math.ceil(this._data.barSpacing * pixelRatio) <= showSpacingMinimalBarWidth ? 0 : Math.max(1, Math.floor(pixelRatio));
		const columnWidth = Math.round(this._data.barSpacing * pixelRatio) - spacing;

		this._precalculatedCache = new Array(this._data.visibleRange.to - this._data.visibleRange.from);

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			// force cast to avoid ensureDefined call
			const x = Math.round(item.x * pixelRatio);
			let left: number;
			let right: number;

			if (columnWidth % 2) {
				const halfWidth = (columnWidth - 1) / 2;
				left = x - halfWidth;
				right = x + halfWidth;
			} else {
				// shift pixel to left
				const halfWidth = columnWidth / 2;
				left = x - halfWidth;
				right = x + halfWidth - 1;
			}
			this._precalculatedCache[i - this._data.visibleRange.from] = {
				left,
				right,
				roundedCenter: x,
				center: (item.x * pixelRatio),
				time: item.time,
			};
		}

		// correct positions
		for (let i = this._data.visibleRange.from + 1; i < this._data.visibleRange.to; i++) {
			const current = this._precalculatedCache[i - this._data.visibleRange.from];
			const prev = this._precalculatedCache[i - this._data.visibleRange.from - 1];
			if (current.time !== prev.time + 1) {
				continue;
			}
			if (current.left - prev.right !== (spacing + 1)) {
				// have to align
				if (prev.roundedCenter > prev.center) {
					// prev wasshifted to left, so add pixel to right
					prev.right = current.left - spacing - 1;
				} else {
					// extend current to left
					current.left = prev.right + spacing + 1;
				}
			}
		}

		let minWidth = Math.ceil(this._data.barSpacing * pixelRatio);
		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const current = this._precalculatedCache[i - this._data.visibleRange.from];
			// this could happen if barspacing < 1
			if (current.right < current.left) {
				current.right = current.left;
			}
			const width = current.right - current.left + 1;
			minWidth = Math.min(width, minWidth);
		}

		if (spacing > 0 && minWidth < alignToMinimalWidthLimit) {
			for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
				const current = this._precalculatedCache[i - this._data.visibleRange.from];
				const width = current.right - current.left + 1;
				if (width > minWidth) {
					if (current.roundedCenter > current.center) {
						current.right -= 1;
					} else {
						current.left += 1;
					}
				}
			}
		}
	}
}
