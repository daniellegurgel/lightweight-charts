/**
 * MarksRenderer — Renderer de marcadores circulares sobre séries.
 *
 * Arquivo MODIFICADO pelo fork Neurotrading — Danielle Gurgel
 * Alteração: adicionado hitTest() para detecção nativa de clique/hover em marcadores.
 *
 * O hitTest verifica se o cursor está dentro do raio do marcador
 * (distância euclidiana do cursor ao centro do círculo ≤ raio + margem).
 */

import { BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { HoveredObject } from '../model/chart-model';
import { Coordinate } from '../model/coordinate';
import { HitTestObjectData } from '../model/hit-test-data';
import { SeriesItemsIndexesRange } from '../model/time-data';

import { BitmapCoordinatesPaneRenderer } from './bitmap-coordinates-pane-renderer';
import { LineItemBase } from './line-renderer-base';

export interface MarksRendererData {
	items: LineItemBase[];
	lineColor: string;
	lineWidth: number;
	backColor: string;
	radius: number;
	visibleRange: SeriesItemsIndexesRange | null;
}

export class PaneRendererMarks extends BitmapCoordinatesPaneRenderer {
	protected _data: MarksRendererData | null = null;

	public setData(data: MarksRendererData): void {
		this._data = data;
	}

	/**
	 * Hit test para marcadores circulares.
	 *
	 * Calcula distância euclidiana do cursor ao centro de cada marcador.
	 * Se menor que raio + margem de 4px, retorna hit.
	 *
	 * @param x - Coordenada X do cursor (pixels)
	 * @param y - Coordenada Y do cursor (pixels)
	 * @returns HoveredObject ou null
	 */
	public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		const { items, radius, lineWidth, visibleRange } = this._data;
		const tolerance = radius + lineWidth + 4;

		for (let i = visibleRange.from; i < visibleRange.to; i++) {
			const point = items[i];
			const dx = x - point.x;
			const dy = y - point.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist <= tolerance) {
				const data: HitTestObjectData = {
					objectType: 'marker',
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

	protected _drawImpl({ context: ctx, horizontalPixelRatio, verticalPixelRatio }: BitmapCoordinatesRenderingScope): void {
		if (this._data === null || this._data.visibleRange === null) {
			return;
		}

		const visibleRange = this._data.visibleRange;
		const data = this._data;

		const tickWidth = Math.max(1, Math.floor(horizontalPixelRatio));
		const correction = (tickWidth % 2) / 2;

		const draw = (radiusMedia: number) => {
			ctx.beginPath();

			for (let i = visibleRange.to - 1; i >= visibleRange.from; --i) {
				const point = data.items[i];
				const centerX = Math.round(point.x * horizontalPixelRatio) + correction; // correct x coordinate only
				const centerY = point.y * verticalPixelRatio;
				const radius = radiusMedia * verticalPixelRatio + correction;
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
			}

			ctx.fill();
		};

		if (data.lineWidth > 0) {
			ctx.fillStyle = data.backColor;
			draw(data.radius + data.lineWidth);
		}

		ctx.fillStyle = data.lineColor;
		draw(data.radius);
	}
}
