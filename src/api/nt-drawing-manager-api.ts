/**
 * API pública do NtDrawingManager.
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 * Usa WeakMap (via nt-api-internals) pra acessar instância interna.
 */

import { NtLineHitResult } from '../chart/drawings/trend-line/nt-trend-line-hit-test';
import { getManagerInternal } from '../chart/nt-api-internals';

export interface INtDrawingManagerApi {
	hitTest(pxX: number, pxY: number): NtLineHitResult | null;
	select(id: string): void;
	deselect(): void;
	destroy(): void;
}

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

	public destroy(): void {
		getManagerInternal(this).destroy();
	}
}
