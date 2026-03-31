/**
 * nt-exports — Exports públicos das ferramentas NT.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Expõe interfaces (não classes) pro bundler de DTS não reclamar.
 * As factories criam as instâncias e retornam a interface.
 */

import { NtDrawingManager, NtCoordinateCallbacks } from './nt-drawing-manager';
import { NtTrendLineTool, NtToolCallbacks } from './drawings/trend-line/nt-trend-line-tool';
import { NtLineStyle } from './drawings/trend-line/nt-trend-line-primitive';
import { NtLineData } from './drawings/trend-line/nt-trend-line-primitive';
import { NtLineHitResult } from './drawings/trend-line/nt-trend-line-hit-test';
import { NtPreviewState } from './drawings/trend-line/nt-trend-line-tool';
import { NtDrawingsPrimitive } from './nt-drawings-primitive';
import { PointWorld } from './nt-geometry';

// ============================================================================
// Interfaces públicas (o app vê isso, não as classes)
// ============================================================================

export interface INtDrawingManager {
	add(drawing: NtLineData): void;
	remove(id: string): void;
	get(id: string): NtLineData | undefined;
	all(): NtLineData[];
	clear(): void;
	selectedId(): string | null;
	isSelected(id: string): boolean;
	select(id: string): void;
	deselect(): void;
	hitTest(pxX: number, pxY: number): NtLineHitResult | null;
	startDrag(pxX: number, pxY: number): boolean;
	moveDrag(pxX: number, pxY: number): boolean;
	endDrag(): void;
	isDragging(): boolean;
	exportJSON(): object[];
	importJSON(data: any[]): void;
	on(listener: (event: { type: string; drawingId: string | null }) => void): () => void;
	destroy(): void;
	worldToPx(p: PointWorld): { x: number; y: number } | null;
}

export interface INtTrendLineTool {
	state(): 'idle' | 'waiting-first' | 'waiting-second';
	previewState(): NtPreviewState | null;
	activate(): void;
	deactivate(): void;
	cancel(): void;
	setStyle(style: Partial<NtLineStyle>): void;
	handleClick(pxX: number, pxY: number): boolean;
	handleMove(pxX: number, pxY: number): boolean;
}

// ============================================================================
// Factories
// ============================================================================

export function createNtDrawingManager(coords: NtCoordinateCallbacks): INtDrawingManager {
	return new NtDrawingManager(coords);
}

export function createNtTrendLineTool(
	manager: INtDrawingManager,
	callbacks: NtToolCallbacks,
	style?: Partial<NtLineStyle>
): INtTrendLineTool {
	return new NtTrendLineTool(manager as NtDrawingManager, callbacks, style);
}

export interface INtDrawingsPrimitive {
	attached(param: { requestUpdate: () => void }): void;
	detached(): void;
	updateAllViews(): void;
	paneViews(): readonly any[];
	hitTest(x: number, y: number): any;
	requestUpdate(): void;
}

export function createNtDrawingsPrimitive(
	manager: INtDrawingManager,
	tool: INtTrendLineTool
): INtDrawingsPrimitive {
	return new NtDrawingsPrimitive({
		manager: manager as unknown as NtDrawingManager,
		tool: tool as unknown as NtTrendLineTool,
	});
}
