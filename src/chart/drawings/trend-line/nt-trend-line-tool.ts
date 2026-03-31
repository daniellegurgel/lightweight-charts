/**
 * nt-line-tool — Ferramenta de reta (linha de tendência).
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Orquestra o fluxo completo:
 *   Estado A: ferramenta ativa, esperando clique 1
 *   Estado B: ponto 1 definido, preview vivo, esperando clique 2
 *   Estado C: reta criada e selecionada
 *
 * Usa:
 *   - nt-line-primitive (dados da reta)
 *   - nt-line-renderer (desenho no canvas)
 *   - nt-line-hit-test (detecção de clique)
 *   - nt-selection-manager (seleção)
 *   - nt-geometry (math)
 *
 * Integração com o chart via API de primitivas (ISeriesPrimitive).
 * Renderiza direto no pipeline nativo — sem overlay canvas.
 */

import { PointWorld, PointPx } from '../../nt-geometry';
import {
	NtLineData,
	NtLineStyle,
	NT_LINE_DEFAULT_STYLE,
	criarReta,
	moverReta,
	moverPonta,
} from './nt-trend-line-primitive';
import { desenharReta, desenharPreview } from './nt-trend-line-renderer';
import { hitTestReta, NtLineHitResult } from './nt-trend-line-hit-test';
import { NtSelectionManager } from '../../nt-selection-manager';

// ============================================================================
// Estado da ferramenta
// ============================================================================

export type NtLineToolState = 'idle' | 'waiting-first' | 'waiting-second';

// ============================================================================
// Callbacks pro app
// ============================================================================

export interface NtLineToolCallbacks {
	/** Converte X pixel → timestamp segundos. Retorna null se impossível */
	xToTime: (x: number) => number | null;
	/** Converte Y pixel → preço. Retorna null se impossível */
	yToPrice: (y: number) => number | null;
	/** Converte timestamp → X pixel */
	timeToX: (timeSec: number) => number | null;
	/** Converte preço → Y pixel */
	priceToY: (price: number) => number | null;
	/** Pede redraw do chart */
	requestUpdate: () => void;
}

// ============================================================================
// Classe principal
// ============================================================================

export class NtLineTool {
	private _state: NtLineToolState = 'idle';
	private _lines: Map<string, NtLineData> = new Map();
	private _selection: NtSelectionManager;
	private _callbacks: NtLineToolCallbacks;
	private _style: NtLineStyle;

	/** Ponto 1 pendente durante criação */
	private _pendingP1: PointWorld | null = null;
	/** Posição atual do cursor em pixels (pro preview) */
	private _cursorPx: PointPx | null = null;

	/** Drag em andamento */
	private _dragLineId: string | null = null;
	private _dragPart: 'body' | 'start' | 'end' | null = null;
	private _dragStartPx: PointPx | null = null;

	constructor(callbacks: NtLineToolCallbacks, style?: Partial<NtLineStyle>) {
		this._callbacks = callbacks;
		this._selection = new NtSelectionManager();
		this._style = { ...NT_LINE_DEFAULT_STYLE, ...style };
	}

	// ================================================================
	// API pública
	// ================================================================

	/** Estado atual da ferramenta */
	public state(): NtLineToolState {
		return this._state;
	}

	/** Ativa a ferramenta (entra em modo de criação) */
	public activate(): void {
		this._state = 'waiting-first';
		this._pendingP1 = null;
		this._cursorPx = null;
	}

	/** Desativa a ferramenta (volta pro idle) */
	public deactivate(): void {
		this._state = 'idle';
		this._pendingP1 = null;
		this._cursorPx = null;
		this._callbacks.requestUpdate();
	}

	/** Cancela criação em andamento (ESC) */
	public cancel(): void {
		if (this._state === 'waiting-second') {
			this._state = 'waiting-first';
			this._pendingP1 = null;
			this._cursorPx = null;
			this._callbacks.requestUpdate();
			return;
		}
		this.deactivate();
	}

	/** Retorna o selection manager pra o app escutar mudanças */
	public selection(): NtSelectionManager {
		return this._selection;
	}

	/** Retorna todas as retas */
	public lines(): NtLineData[] {
		return Array.from(this._lines.values());
	}

	/** Remove uma reta pelo ID */
	public removeLine(id: string): void {
		this._lines.delete(id);
		if (this._selection.selectedId() === id) {
			this._selection.clear();
		}
		this._callbacks.requestUpdate();
	}

	/** Muda o estilo padrão pra novas retas */
	public setStyle(style: Partial<NtLineStyle>): void {
		this._style = { ...this._style, ...style };
	}

	// ================================================================
	// Eventos de pointer (chamados pelo chart)
	// ================================================================

	/** Clique no gráfico */
	public handleClick(pxX: number, pxY: number): void {
		// --- Modo criação ---
		if (this._state === 'waiting-first') {
			const world = this._pxToWorld(pxX, pxY);
			if (!world) return;

			this._pendingP1 = world;
			this._state = 'waiting-second';
			this._callbacks.requestUpdate();
			return;
		}

		if (this._state === 'waiting-second') {
			const world = this._pxToWorld(pxX, pxY);
			if (!world || !this._pendingP1) return;

			const reta = criarReta(this._pendingP1, world, this._style);
			this._lines.set(reta.id, reta);
			this._selection.select(reta.id);
			this._state = 'idle';
			this._pendingP1 = null;
			this._cursorPx = null;
			this._callbacks.requestUpdate();
			return;
		}

		// --- Modo idle: seleção ---
		const hit = this._hitTestAll(pxX, pxY);
		if (hit) {
			this._selection.select(hit.lineId);
		} else {
			this._selection.clear();
		}
		this._callbacks.requestUpdate();
	}

	/** Movimento do cursor */
	public handleMove(pxX: number, pxY: number): void {
		this._cursorPx = { x: pxX, y: pxY };

		// Preview durante criação
		if (this._state === 'waiting-second') {
			this._callbacks.requestUpdate();
			return;
		}

		// Drag em andamento
		if (this._dragLineId && this._dragPart && this._dragStartPx) {
			this._handleDragMove(pxX, pxY);
			return;
		}
	}

	/** Início de arraste (pointerdown) */
	public handlePointerDown(pxX: number, pxY: number): void {
		if (this._state !== 'idle') return;

		const hit = this._hitTestAll(pxX, pxY);
		if (!hit) return;

		const reta = this._lines.get(hit.lineId);
		if (!reta || reta.locked) return;

		this._selection.select(hit.lineId);
		this._dragLineId = hit.lineId;
		this._dragPart = hit.part;
		this._dragStartPx = { x: pxX, y: pxY };
		this._callbacks.requestUpdate();
	}

	/** Fim de arraste (pointerup) */
	public handlePointerUp(): void {
		this._dragLineId = null;
		this._dragPart = null;
		this._dragStartPx = null;
	}

	// ================================================================
	// Rendering (chamado pela primitiva do chart)
	// ================================================================

	/** Desenha todas as retas + preview no canvas */
	public render(ctx: CanvasRenderingContext2D): void {
		const selectedId = this._selection.selectedId();

		// Retas definitivas
		for (const reta of this._lines.values()) {
			if (!reta.visible) continue;

			const p1 = this._worldToPx(reta.point1);
			const p2 = this._worldToPx(reta.point2);
			if (!p1 || !p2) continue;

			desenharReta(ctx, {
				p1, p2,
				style: reta.style,
				selected: reta.id === selectedId,
			});
		}

		// Preview durante criação
		if (this._state === 'waiting-second' && this._pendingP1 && this._cursorPx) {
			const origin = this._worldToPx(this._pendingP1);
			if (origin) {
				desenharPreview(ctx, {
					origin,
					cursor: this._cursorPx,
					style: this._style,
				});
			}
		}
	}

	/** Hit test pra o chart (retorna cursor e externalId) */
	public hitTest(x: number, y: number): { cursorStyle: string; externalId: string } | null {
		const hit = this._hitTestAll(x, y);
		if (!hit) return null;
		return { cursorStyle: hit.cursor, externalId: hit.lineId };
	}

	// ================================================================
	// Privado
	// ================================================================

	private _hitTestAll(pxX: number, pxY: number): NtLineHitResult | null {
		// Varre de trás pra frente (última desenhada tem prioridade)
		const linhas = Array.from(this._lines.values()).reverse();

		for (const reta of linhas) {
			if (!reta.visible) continue;

			const p1 = this._worldToPx(reta.point1);
			const p2 = this._worldToPx(reta.point2);
			if (!p1 || !p2) continue;

			const hit = hitTestReta(pxX, pxY, p1.x, p1.y, p2.x, p2.y, reta.style.width, reta.id);
			if (hit) return hit;
		}

		return null;
	}

	private _handleDragMove(pxX: number, pxY: number): void {
		if (!this._dragLineId || !this._dragPart || !this._dragStartPx) return;

		const reta = this._lines.get(this._dragLineId);
		if (!reta) return;

		if (this._dragPart === 'body') {
			// Move reta inteira por delta mundo
			const startWorld = this._pxToWorld(this._dragStartPx.x, this._dragStartPx.y);
			const endWorld = this._pxToWorld(pxX, pxY);
			if (!startWorld || !endWorld) return;

			const dt = endWorld.timeSec - startWorld.timeSec;
			const dp = endWorld.price - startWorld.price;

			this._lines.set(reta.id, moverReta(reta, dt, dp));
			this._dragStartPx = { x: pxX, y: pxY };
		} else {
			// Move ponta (start ou end)
			const novoMundo = this._pxToWorld(pxX, pxY);
			if (!novoMundo) return;

			this._lines.set(reta.id, moverPonta(reta, this._dragPart, novoMundo));
		}

		this._callbacks.requestUpdate();
	}

	private _pxToWorld(x: number, y: number): PointWorld | null {
		const timeSec = this._callbacks.xToTime(x);
		const price = this._callbacks.yToPrice(y);
		if (timeSec === null || price === null) return null;
		return { timeSec, price };
	}

	private _worldToPx(p: PointWorld): PointPx | null {
		const x = this._callbacks.timeToX(p.timeSec);
		const y = this._callbacks.priceToY(p.price);
		if (x === null || y === null) return null;
		return { x, y };
	}
}
