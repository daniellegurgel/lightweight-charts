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
import { NtLineData, moverReta, moverPonta, NT_LINE_DEFAULT_CONFIG, NT_LINE_DEFAULT_LABEL } from './drawings/trend-line/nt-trend-line-primitive';
import { hitTestReta, NtLineHitResult } from './drawings/trend-line/nt-trend-line-hit-test';
import { INtSnapEngine, NtSnapEngine } from './nt-snap-engine';

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

	// --- Callbacks para extrapolação (bidirecional) ---
	// Permitem converter coordenadas na área vazia (sem candles).
	//
	// Direção world → px (para render e hit test):
	timeToLogical: (timeSec: number) => number | null;
	logicalToCoordinate: (index: number) => number | null;
	//
	// Direção px → world (para drag):
	coordinateToLogical: (x: number) => number | null;
	logicalToTime: (logical: number) => number | null;
}

// ============================================================================
// Estado de drag
// ============================================================================

interface DragState {
	lineId: string;
	part: 'body' | 'start' | 'end' | 'middle';
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
	private _snapEngine: INtSnapEngine;
	private _destroyed: boolean = false;

	// Cache de última posição válida por desenho.
	// Evita que a reta pisque quando timeToX/priceToY retorna null
	// em frames intermediários (recálculo de escala, resize, etc).
	private _lastValidPx: Map<string, { p1: PointPx; p2: PointPx }> = new Map();

	constructor(coords: NtCoordinateCallbacks, snapEngine?: INtSnapEngine) {
		this._coords = coords;
		this._snapEngine = snapEngine ?? new NtSnapEngine();
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

	/** Atualiza campos de um desenho existente (merge parcial tipado) */
	public update(id: string, patch: Partial<Omit<NtLineData, 'id'>>): void {
		const existing = this._drawings.get(id);
		if (!existing) return;

		const updated: NtLineData = {
			...existing,
			...patch,
			style: patch.style ? { ...existing.style, ...patch.style } : existing.style,
			config: patch.config ? { ...existing.config, ...patch.config } : existing.config,
			label: patch.label ? { ...existing.label, ...patch.label } : existing.label,
		};

		this._drawings.set(id, updated);
		this._emit({ type: 'drawing:updated', drawingId: id });
	}

	/** Remove um desenho */
	public remove(id: string): void {
		this._drawings.delete(id);
		this._lastValidPx.delete(id);
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
		this._lastValidPx.clear();
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
	// Resolução de coordenadas com cache anti-flicker
	// ================================================================

	/**
	 * Resolve as coordenadas px de um desenho.
	 * Se _worldToPx falhar em algum ponto (frame intermediário),
	 * retorna a última posição válida do cache.
	 * Elimina o "piscar" da reta durante recálculo de escala.
	 */
	public resolveRetaPx(reta: NtLineData): { p1: PointPx; p2: PointPx } | null {
		if (this._destroyed) return null;
		const p1 = this._worldToPx(reta.point1);
		const p2 = this._worldToPx(reta.point2);

		if (!p1 || !p2) {
			// Conversão falhou — usar cache se existir
			const cached = this._lastValidPx.get(reta.id);
			return cached ?? null;
		}

		// Conversão OK — atualizar cache
		const result = { p1, p2 };
		this._lastValidPx.set(reta.id, result);
		return result;
	}

	// ================================================================
	// Hit test (delega pro hit test da ferramenta)
	// ================================================================

	/** Testa todos os desenhos. Retorna o mais recente que acertou */
	public hitTest(pxX: number, pxY: number): NtLineHitResult | null {
		if (this._destroyed) return null;
		const linhas = Array.from(this._drawings.values()).reverse();

		for (const reta of linhas) {
			if (!reta.visible) continue;

			const result = this.resolveRetaPx(reta);
			if (!result) continue;

			const hit = hitTestReta(pxX, pxY, result.p1.x, result.p1.y, result.p2.x, result.p2.y, reta.style.width, reta.id, reta.config, reta.label);
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
		if (this._destroyed || !this._drag) return false;

		const reta = this._drawings.get(this._drag.lineId);
		if (!reta) {
			this._drag = null;
			return false;
		}

		if (this._drag.part === 'body') {
			const startWorld = this._pxToWorld(this._drag.startPx.x, this._drag.startPx.y);
			const endWorld = this._pxToWorld(pxX, pxY);

			if (!startWorld || !endWorld) {
				// Conversão falhou mesmo com extrapolação — não atualiza startPx
				// pra preservar o delta acumulado quando o cursor voltar.
				return true;
			}

			const dt = endWorld.timeSec - startWorld.timeSec;
			const dp = endWorld.price - startWorld.price;

			if (dt !== 0 || dp !== 0) {
				this._drawings.set(reta.id, moverReta(reta, dt, dp));
			}
			this._drag.startPx = { x: pxX, y: pxY };
		} else if (this._drag.part === 'start' || this._drag.part === 'end') {
			const novoMundo = this._pxToWorld(pxX, pxY);
			if (!novoMundo) return true;

			// Snap magnético no handle (start/end)
			const snapped = this._snapEngine.snap(novoMundo, { x: pxX, y: pxY }, 'drag');
			this._drawings.set(reta.id, moverPonta(reta, this._drag.part, snapped));
		} else if (this._drag.part === 'middle') {
			// Ponto central — move a reta inteira (mesma lógica do body)
			const startWorld = this._pxToWorld(this._drag.startPx.x, this._drag.startPx.y);
			const endWorld = this._pxToWorld(pxX, pxY);

			if (!startWorld || !endWorld) return true;

			const dt = endWorld.timeSec - startWorld.timeSec;
			const dp = endWorld.price - startWorld.price;

			if (dt !== 0 || dp !== 0) {
				this._drawings.set(reta.id, moverReta(reta, dt, dp));
			}
			this._drag.startPx = { x: pxX, y: pxY };
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

	/**
	 * Exporta todos os desenhos como JSON com chaves estáveis.
	 * Usa prefixo "nt_" pra evitar conflito com nomes minificados (_internal_*).
	 */
	public exportJSON(): object[] {
		return this.all().map(d => ({
			'nt_id': d.id,
			'nt_type': 'trend-line',
			'nt_point1': d.point1,
			'nt_point2': d.point2,
			'nt_style': d.style,
			'nt_config': d.config,
			'nt_label': d.label,
			'nt_visible': d.visible,
			'nt_locked': d.locked,
		}));
	}

	/**
	 * Importa desenhos de JSON.
	 * Aceita formato nt_* (novo) e formato legado (sem prefixo).
	 */
	public importJSON(data: any[]): void {
		for (const item of data) {
			// Detectar formato: nt_* (novo) ou legado
			const type = item['nt_type'] ?? item.type;
			const p1 = item['nt_point1'] ?? item.point1;
			const p2 = item['nt_point2'] ?? item.point2;

			if (type === 'trend-line' && p1 && p2) {
				const reta: NtLineData = {
					id: item['nt_id'] ?? item.id ?? `nt-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					point1: p1,
					point2: p2,
					style: item['nt_style'] ?? item.style ?? { color: '#2962FF', width: 1, dash: 'solid' },
					config: { ...NT_LINE_DEFAULT_CONFIG, ...(item['nt_config'] ?? item.config ?? {}) },
					label: { ...NT_LINE_DEFAULT_LABEL, ...(item['nt_label'] ?? item.label ?? {}) },
					visible: item['nt_visible'] ?? item.visible ?? true,
					locked: item['nt_locked'] ?? item.locked ?? false,
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
		this._destroyed = true;
		this._listeners = [];
		this._drawings.clear();
		this._lastValidPx.clear();
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
		let x = this._coords.timeToX(p.timeSec);
		const y = this._coords.priceToY(p.price);

		// Se timeToX falhou (ponto fora da área com candles), extrapolar.
		// Usa coordenadas lógicas — funcionam no futuro/passado sem candles.
		if (x === null) {
			x = this._extrapolarX(p.timeSec);
		}

		if (x === null || y === null) return null;
		return { x, y };
	}

	/**
	 * Extrapola posição X em pixels para timestamps fora da área com candles.
	 *
	 * Usa coordenadas lógicas (índice de barra) que são infinitas para
	 * esquerda e direita, independente de ter candle ou não.
	 *
	 * Fluxo:
	 *   1. timeToLogical(timeSec) → índice lógico fracionário
	 *      (o callback extrapola a partir de candles conhecidos)
	 *   2. logicalToCoordinate(floor) → pixel X da barra inteira
	 *   3. Interpola a fração sub-barra usando barSpacing
	 *
	 * O canvas faz o clipping automaticamente.
	 */
	private _extrapolarX(timeSec: number): number | null {
		const { timeToLogical, logicalToCoordinate } = this._coords;

		// 1. Converter timestamp → índice lógico (pode ser fracionário)
		const logical = timeToLogical(timeSec);
		if (logical === null) return null;

		// 2. Separar parte inteira e fração
		const floor = Math.floor(logical);
		const frac = logical - floor;

		// 3. Pixel da barra inteira mais próxima
		const xFloor = logicalToCoordinate(floor);
		if (xFloor === null) return null;

		// Sem fração — cai exatamente numa barra
		if (frac === 0) return xFloor;

		// 4. Interpolar a fração sub-barra
		const xNext = logicalToCoordinate(floor + 1);
		if (xNext === null) return xFloor;

		return xFloor + frac * (xNext - xFloor);
	}

	private _pxToWorld(x: number, y: number): PointWorld | null {
		let timeSec = this._coords.xToTime(x);
		const price = this._coords.yToPrice(y);

		// Se xToTime falhou (área sem candle), extrapolar via coordenadas lógicas.
		// Sem isso, o drag morre quando o cursor entra na área vazia.
		if (timeSec === null) {
			timeSec = this._extrapolarTime(x);
		}

		if (timeSec === null || price === null) return null;
		return { timeSec, price };
	}

	/**
	 * Extrapola timestamp para posições de pixel fora da área com candles.
	 * Caminho inverso do _extrapolarX: pixel → lógico → tempo.
	 *
	 * Fluxo:
	 *   1. coordinateToLogical(x) → índice lógico (fracionário, funciona em tudo)
	 *   2. logicalToTime(logical) → timestamp extrapolado
	 */
	private _extrapolarTime(x: number): number | null {
		const { coordinateToLogical, logicalToTime } = this._coords;

		const logical = coordinateToLogical(x);
		if (logical === null) return null;

		// Interpolar manualmente entre dois índices inteiros —
		// simétrico com _extrapolarX, evita jitter de arredondamento.
		const floor = Math.floor(logical);
		const frac = logical - floor;

		const t0 = logicalToTime(floor);
		if (t0 === null) return null;

		if (frac === 0) return t0;

		const t1 = logicalToTime(floor + 1);
		if (t1 === null) return t0;

		return t0 + frac * (t1 - t0);
	}

	private _emit(event: NtDrawingEvent): void {
		for (const fn of this._listeners) {
			fn(event);
		}
	}
}

/** Factory — cria instância do NtDrawingManager */
export function createNtDrawingManager(coords: NtCoordinateCallbacks, snapEngine?: INtSnapEngine): NtDrawingManager {
	return new NtDrawingManager(coords, snapEngine);
}
