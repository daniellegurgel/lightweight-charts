/**
 * nt-trend-line-tool — Ferramenta de criação de reta (linha de tendência).
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Responsabilidade única: fluxo de CRIAÇÃO.
 *   Estado A (idle)           → ferramenta desativada
 *   Estado B (waiting-first)  → esperando clique 1, cursor crosshair
 *   Estado C (waiting-second) → ponto 1 definido, preview vivo
 *   → Clique 2: cria reta no DrawingManager e volta pra idle
 *
 * O que NÃO faz:
 *   - Não guarda desenhos (quem guarda é o DrawingManager)
 *   - Não faz seleção/drag (quem faz é o DrawingManager)
 *   - Não desenha (quem desenha é o renderer, chamado por quem renderiza)
 *   - Não converte coordenadas (recebe callbacks)
 */

import { PointWorld, PointPx } from '../../nt-geometry';
import { NtLineStyle, NT_LINE_DEFAULT_STYLE, criarReta } from './nt-trend-line-primitive';
import { NtDrawingManager } from '../../nt-drawing-manager';

// ============================================================================
// FSM — estados da ferramenta
// ============================================================================

export type NtToolState = 'idle' | 'waiting-first' | 'waiting-second';

// ============================================================================
// Callbacks
// ============================================================================

export interface NtToolCallbacks {
	xToTime: (x: number) => number | null;
	yToPrice: (y: number) => number | null;
	requestUpdate: () => void;
}

// ============================================================================
// Preview — estado do preview (o que o renderer precisa pra desenhar)
// ============================================================================

export interface NtPreviewState {
	/** Ponto de origem em mundo (fixo após clique 1) */
	origin: PointWorld;
	/** Posição atual do cursor em pixels (atualiza a cada mousemove) */
	cursorPx: PointPx;
	/** Estilo da preview */
	style: NtLineStyle;
}

// ============================================================================
// Tool
// ============================================================================

export class NtTrendLineTool {
	private _state: NtToolState = 'idle';
	private _pendingP1: PointWorld | null = null;
	private _cursorPx: PointPx | null = null;
	private _style: NtLineStyle;
	private _callbacks: NtToolCallbacks;
	private _manager: NtDrawingManager;

	constructor(manager: NtDrawingManager, callbacks: NtToolCallbacks, style?: Partial<NtLineStyle>) {
		this._manager = manager;
		this._callbacks = callbacks;
		this._style = { ...NT_LINE_DEFAULT_STYLE, ...style };
	}

	// ================================================================
	// Estado
	// ================================================================

	public state(): NtToolState {
		return this._state;
	}

	/** Retorna dados do preview pra o renderer, ou null se não tem preview */
	public previewState(): NtPreviewState | null {
		if (this._state !== 'waiting-second' || !this._pendingP1 || !this._cursorPx) {
			return null;
		}
		return {
			origin: this._pendingP1,
			cursorPx: this._cursorPx,
			style: this._style,
		};
	}

	// ================================================================
	// Controle
	// ================================================================

	/** Ativa a ferramenta — entra em modo de criação */
	public activate(): void {
		this._state = 'waiting-first';
		this._pendingP1 = null;
		this._cursorPx = null;
	}

	/** Desativa — volta pro idle */
	public deactivate(): void {
		this._state = 'idle';
		this._pendingP1 = null;
		this._cursorPx = null;
		this._callbacks.requestUpdate();
	}

	/** Cancela — ESC */
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

	/** Muda estilo pra novas retas */
	public setStyle(style: Partial<NtLineStyle>): void {
		this._style = { ...this._style, ...style };
	}

	// ================================================================
	// Eventos (chamados por quem gerencia input)
	// ================================================================

	/** Clique no gráfico durante criação. Retorna true se consumiu o clique */
	public handleClick(pxX: number, pxY: number): boolean {
		if (this._state === 'idle') return false;

		const world = this._pxToWorld(pxX, pxY);
		if (!world) return false;

		// Estado B → clique 1
		if (this._state === 'waiting-first') {
			this._pendingP1 = world;
			this._state = 'waiting-second';
			this._callbacks.requestUpdate();
			return true;
		}

		// Estado C → clique 2: cria reta
		if (this._state === 'waiting-second' && this._pendingP1) {
			const reta = criarReta(this._pendingP1, world, this._style);
			this._manager.add(reta);
			this._manager.select(reta.id);

			this._state = 'idle';
			this._pendingP1 = null;
			this._cursorPx = null;
			this._callbacks.requestUpdate();
			return true;
		}

		return false;
	}

	/** Movimento do cursor durante criação (atualiza preview). Retorna true se consumiu */
	public handleMove(pxX: number, pxY: number): boolean {
		if (this._state !== 'waiting-second') return false;

		this._cursorPx = { x: pxX, y: pxY };
		this._callbacks.requestUpdate();
		return true;
	}

	// ================================================================
	// Privado
	// ================================================================

	private _pxToWorld(x: number, y: number): PointWorld | null {
		const timeSec = this._callbacks.xToTime(x);
		const price = this._callbacks.yToPrice(y);
		if (timeSec === null || price === null) return null;
		return { timeSec, price };
	}
}
