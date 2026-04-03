/**
 * API pública do NtDrawingManager.
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 * Usa WeakMap (via nt-api-internals) pra acessar instância interna.
 */

import { NtLineHitResult } from '../chart/drawings/trend-line/nt-trend-line-hit-test';
import { NtLineData } from '../chart/drawings/trend-line/nt-trend-line-primitive';
import { getManagerInternal } from '../chart/nt-api-internals';

export interface INtDrawingManagerApi {
	hitTest(pxX: number, pxY: number): NtLineHitResult | null;
	select(id: string): void;
	deselect(): void;
	selectedId(): string | null;
	/** Retorna um desenho pelo ID */
	get(id: string): NtLineData | undefined;
	/** Atualiza campos de um desenho existente (merge parcial) */
	update(id: string, patch: Partial<Omit<NtLineData, 'id'>>): void;
	remove(id: string): void;
	/** Exporta todos os desenhos como JSON */
	exportJSON(): object[];
	/** Importa desenhos de JSON */
	importJSON(data: any[]): void;
	startDrag(pxX: number, pxY: number): boolean;
	moveDrag(pxX: number, pxY: number): void;
	endDrag(): void;
	destroy(): void;
}

/** @public */
export class NtDrawingManagerApi implements INtDrawingManagerApi {
	public hitTest(pxX: number, pxY: number): NtLineHitResult | null {
		return getManagerInternal(this).hitTest(pxX, pxY);
	}

	public select(id: string): void {
		getManagerInternal(this).select(id);
	}

	public deselect(): void {
		getManagerInternal(this).deselect();
	}

	public selectedId(): string | null {
		return getManagerInternal(this).selectedId();
	}

	public get(id: string): NtLineData | undefined {
		return getManagerInternal(this).get(id);
	}

	public update(id: string, patch: Partial<Omit<NtLineData, 'id'>>): void {
		getManagerInternal(this).update(id, patch);
	}

	public remove(id: string): void {
		getManagerInternal(this).remove(id);
	}

	public exportJSON(): object[] {
		return getManagerInternal(this).exportJSON();
	}

	public importJSON(data: any[]): void {
		getManagerInternal(this).importJSON(data);
	}

	public startDrag(pxX: number, pxY: number): boolean {
		return getManagerInternal(this).startDrag(pxX, pxY);
	}

	public moveDrag(pxX: number, pxY: number): boolean {
		return getManagerInternal(this).moveDrag(pxX, pxY);
	}

	public endDrag(): void {
		getManagerInternal(this).endDrag();
	}

	public destroy(): void {
		getManagerInternal(this).destroy();
	}
}
