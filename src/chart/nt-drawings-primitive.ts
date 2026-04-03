/**
 * nt-drawings-primitive — Primitiva que renderiza todos os desenhos NT no chart.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Implementa ISeriesPrimitive:
 *   - paneViews() → retorna view que desenha retas + preview
 *   - hitTest() → delega pro drawing manager
 *   - attached() / detached() → lifecycle
 *
 * É o ponto de integração entre o sistema NT de desenhos e o Lightweight Charts.
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { NtDrawingManager } from './nt-drawing-manager';
import { NtTrendLineTool } from './drawings/trend-line/nt-trend-line-tool';
import { desenharReta, desenharPreview } from './drawings/trend-line/nt-trend-line-renderer';
import { PrimitiveHoveredItem, IPrimitivePaneView, IPrimitivePaneRenderer } from '../model/ipane-primitive';

export interface NtDrawingsPrimitiveOptions {
	manager: NtDrawingManager;
	tool: NtTrendLineTool;
}

import { INtSeriesPrimitive, INtAttachedParam } from './nt-exports';

/** @public */
export class NtDrawingsPrimitive implements INtSeriesPrimitive {
	private _manager: NtDrawingManager;
	private _tool: NtTrendLineTool;
	private _paneViews: NtDrawingsPaneView[];
	private _requestUpdate: (() => void) | null = null;

	constructor(options: NtDrawingsPrimitiveOptions) {
		this._manager = options.manager;
		this._tool = options.tool;
		this._paneViews = [new NtDrawingsPaneView(this)];
	}

	// --- ISeriesPrimitive ---

	attached(param: INtAttachedParam): void {
		this._requestUpdate = param.requestUpdate;
	}

	detached(): void {
		this._requestUpdate = null;
	}

	updateAllViews(): void {
		// Chamado pelo chart quando precisa re-renderizar
	}

	paneViews(): readonly IPrimitivePaneView[] {
		return this._paneViews;
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		const hit = this._manager.hitTest(x, y);
		if (!hit) return null;

		return {
			cursorStyle: hit.cursor,
			externalId: hit.lineId,
			zOrder: 'normal',
		};
	}

	/** Força redraw do chart */
	requestUpdate(): void {
		this._requestUpdate?.();
	}

	// --- Acesso interno pra view/renderer ---

	_getManager(): NtDrawingManager { return this._manager; }
	_getTool(): NtTrendLineTool { return this._tool; }
}

/** @public */
class NtDrawingsPaneView implements IPrimitivePaneView {
	private readonly _renderer: NtDrawingsRenderer;

	constructor(primitive: NtDrawingsPrimitive) {
		this._renderer = new NtDrawingsRenderer(primitive);
	}

	zOrder(): 'normal' {
		return 'normal';
	}

	renderer(): IPrimitivePaneRenderer {
		return this._renderer;
	}
}

/** @public */
class NtDrawingsRenderer implements IPrimitivePaneRenderer {
	private _primitive: NtDrawingsPrimitive;

	constructor(primitive: NtDrawingsPrimitive) {
		this._primitive = primitive;
	}

	draw(target: CanvasRenderingTarget2D): void {
		target.useMediaCoordinateSpace((scope) => {
			const ctx = scope.context;
			const vpWidth = scope.mediaSize.width;
			const vpHeight = scope.mediaSize.height;
			const manager = this._primitive._getManager();
			const tool = this._primitive._getTool();
			const selectedId = manager.selectedId();

			// Desenhar retas definitivas
			for (const reta of manager.all()) {
				if (!reta.visible) continue;

				try {
					const result = manager.resolveRetaPx(reta);
					if (!result) continue;

					desenharReta(ctx, {
						p1: result.p1, p2: result.p2,
						style: reta.style,
						config: reta.config,
						label: reta.label,
						selected: reta.id === selectedId,
						lineId: reta.id,
						vpWidth,
						vpHeight,
					});
				} catch (e) {
					console.error('[NT-DRAW] Erro ao desenhar reta', reta.id, e);
				}
			}

			// Desenhar preview (se tool tá em estado de criação)
			const preview = tool.previewState();
			if (preview) {
				const origin = manager.worldToPx(preview.origin);
				if (origin) {
					desenharPreview(ctx, {
						origin,
						cursor: preview.cursorPx,
						style: preview.style,
					});
				}
			}
		});
	}
}

/** Factory — cria a primitiva de desenhos */
export function createNtDrawingsPrimitive(options: NtDrawingsPrimitiveOptions): NtDrawingsPrimitive {
	return new NtDrawingsPrimitive(options);
}
