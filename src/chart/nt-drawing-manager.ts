/**
 * nt-drawing-manager — Gerenciador central de desenhos.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Responsabilidades:
 *   - Guardar todos os desenhos (Map por ID)
 *   - Seleção (por ID estável)
 *   - Drag (body e handles)
 *   - Emitir eventos (added, removed, selected, updated)
 *   - Serialização (exportar/importar JSON)
 *
 * O que NÃO faz:
 *   - Não renderiza (quem renderiza é o renderer de cada ferramenta)
 *   - Não decide fluxo de criação (quem decide é o tool)
 *   - Não conhece o chart diretamente (recebe callbacks de conversão)
 */

import { PointPx, PointWorld } from './nt-geometry';
import { NtLineData, moverReta, moverPonta } from './drawings/trend-line/nt-trend-line-primitive';
import { hitTestReta, NtLineHitResult } from './drawings/trend-line/nt-trend-line-hit-test';

// ============================================================================
// Tipos de evento
// ============================================================================

export type NtDrawingEventType =
	| 'drawing:added'
	| 'drawing:removed'
	| 'drawing:selected'
	| 'drawing:deselected'
	| 'drawing:updated';

export interface NtDrawingEvent {
	type: NtDrawingEventType;
	drawingId: string | null;
}

export type NtDrawingEventListener = (event: NtDrawingEvent) => void;

// ============================================================================
// Callbacks de conversão (injetados por quem usa)
// ============================================================================

export interface NtCoordinateCallbacks {
	xToTime: (x: number) => number | null;
	yToPrice: (y: number) => number | null;
	timeToX: (timeSec: number) => number | null;
	priceToY: (price: number) => number | null;
}

// ============================================================================
// Estado de drag
// ============================================================================

interface DragState {
	lineId: string;
	part: 'body' | 'start' | 'end';
	startPx: PointPx;
}

// ============================================================================
// Manager
// ============================================================================

export class NtDrawingManager {
	private _drawings: Map<string, NtLineData> = new Map();
	private _selectedId: string | null = null;
	private _drag: DragState | null = null;
	private _listeners: NtDrawingEventListener[] = [];
	private _coords: NtCoordinateCallbacks;

	constructor(coords: NtCoordinateCallbacks) {
		this._coords = coords;
	}

	// ================================================================
	// Desenhos
	// ================================================================

	/** Adiciona um desenho */
	public add(drawing: NtLineData): void {
		if (this._drawings.has(drawing.id)) {
			console.warn(`[NtDrawingManager] Desenho com id ${drawing.id} já existe — ignorando`);
			return;
		}
		this._drawings.set(drawing.id, drawing);
		this._emit({ type: 'drawing:added', drawingId: drawing.id });
	}

	/** Remove um desenho */
	public remove(id: string): void {
		this._drawings.delete(id);
		if (this._selectedId === id) {
			this._selectedId = null;
			this._emit({ type: 'drawing:deselected', drawingId: id });
		}
		this._emit({ type: 'drawing:removed', drawingId: id });
	}

	/** Retorna um desenho pelo ID */
	public get(id: string): NtLineData | undefined {
		return this._drawings.get(id);
	}

	/** Retorna todos os desenhos */
	public all(): NtLineData[] {
		return Array.from(this._drawings.values());
	}

	/** Limpa tudo */
	public clear(): void {
		const ids = Array.from(this._drawings.keys());
		this._drawings.clear();
		this._selectedId = null;
		for (const id of ids) {
			this._emit({ type: 'drawing:removed', drawingId: id });
		}
	}

	// ================================================================
	// Seleção
	// ================================================================

	public selectedId(): string | null {
		return this._selectedId;
	}

	public isSelected(id: string): boolean {
		return this._selectedId === id;
	}

	public select(id: string): void {
		if (this._selectedId === id) return;
		if (this._selectedId) {
			this._emit({ type: 'drawing:deselected', drawingId: this._selectedId });
		}
		this._selectedId = id;
		this._emit({ type: 'drawing:selected', drawingId: id });
	}

	public deselect(): void {
		if (this._selectedId === null) return;
		const prev = this._selectedId;
		this._selectedId = null;
		this._emit({ type: 'drawing:deselected', drawingId: prev });
	}

	// ================================================================
	// Hit test (delega pro hit test da ferramenta)
	// ================================================================

	/** Testa todos os desenhos. Retorna o mais recente que acertou */
	public hitTest(pxX: number, pxY: number): NtLineHitResult | null {
		const linhas = Array.from(this._drawings.values()).reverse();

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

	// ================================================================
	// Drag
	// ================================================================

	/** Inicia drag se acertou um desenho */
	public startDrag(pxX: number, pxY: number): boolean {
		const hit = this.hitTest(pxX, pxY);
		if (!hit) return false;

		const reta = this._drawings.get(hit.lineId);
		if (!reta || reta.locked) return false;

		this.select(hit.lineId);
		this._drag = {
			lineId: hit.lineId,
			part: hit.part,
			startPx: { x: pxX, y: pxY },
		};
		return true;
	}

	/** Processa movimento durante drag */
	public moveDrag(pxX: number, pxY: number): boolean {
		if (!this._drag) return false;

		const reta = this._drawings.get(this._drag.lineId);
		if (!reta) {
			this._drag = null;
			return false;
		}

		if (this._drag.part === 'body') {
			const startWorld = this._pxToWorld(this._drag.startPx.x, this._drag.startPx.y);
			const endWorld = this._pxToWorld(pxX, pxY);
			if (!startWorld || !endWorld) return false;

			const dt = endWorld.timeSec - startWorld.timeSec;
			const dp = endWorld.price - startWorld.price;

			this._drawings.set(reta.id, moverReta(reta, dt, dp));
			this._drag.startPx = { x: pxX, y: pxY };
		} else {
			const novoMundo = this._pxToWorld(pxX, pxY);
			if (!novoMundo) return false;

			this._drawings.set(reta.id, moverPonta(reta, this._drag.part, novoMundo));
		}

		this._emit({ type: 'drawing:updated', drawingId: reta.id });
		return true;
	}

	/** Finaliza drag */
	public endDrag(): void {
		this._drag = null;
	}

	/** Drag em andamento? */
	public isDragging(): boolean {
		return this._drag !== null;
	}

	// ================================================================
	// Serialização
	// ================================================================

	/** Exporta todos os desenhos como JSON */
	public exportJSON(): object[] {
		return this.all().map(d => ({
			id: d.id,
			type: 'trend-line',
			point1: d.point1,
			point2: d.point2,
			style: d.style,
			visible: d.visible,
			locked: d.locked,
		}));
	}

	/** Importa desenhos de JSON */
	public importJSON(data: any[]): void {
		for (const item of data) {
			if (item.type === 'trend-line' && item.point1 && item.point2) {
				const reta: NtLineData = {
					id: item.id || `nt-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					point1: item.point1,
					point2: item.point2,
					style: item.style || { color: '#2962FF', width: 2, dash: 'solid' },
					visible: item.visible ?? true,
					locked: item.locked ?? false,
				};
				this.add(reta);
			}
		}
	}

	// ================================================================
	// Eventos
	// ================================================================

	public on(listener: NtDrawingEventListener): () => void {
		this._listeners.push(listener);
		return () => {
			const i = this._listeners.indexOf(listener);
			if (i >= 0) this._listeners.splice(i, 1);
		};
	}

	public destroy(): void {
		this._listeners = [];
		this._drawings.clear();
		this._selectedId = null;
		this._drag = null;
	}

	// ================================================================
	// Conversão de coordenadas (delega pro callback)
	// ================================================================

	public worldToPx(p: PointWorld): PointPx | null {
		return this._worldToPx(p);
	}

	private _worldToPx(p: PointWorld): PointPx | null {
		const x = this._coords.timeToX(p.timeSec);
		const y = this._coords.priceToY(p.price);
		if (x === null || y === null) return null;
		return { x, y };
	}

	private _pxToWorld(x: number, y: number): PointWorld | null {
		const timeSec = this._coords.xToTime(x);
		const price = this._coords.yToPrice(y);
		if (timeSec === null || price === null) return null;
		return { timeSec, price };
	}

	private _emit(event: NtDrawingEvent): void {
		for (const fn of this._listeners) {
			fn(event);
		}
	}
}

/** Factory — cria instância do NtDrawingManager */
export function createNtDrawingManager(coords: NtCoordinateCallbacks): NtDrawingManager {
	return new NtDrawingManager(coords);
}
