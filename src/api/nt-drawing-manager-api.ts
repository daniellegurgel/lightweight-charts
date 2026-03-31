/**
 * API pública do NtDrawingManager.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Wrapper mínimo — expõe só o que o app usa.
 */

import { NtDrawingManager } from '../chart/nt-drawing-manager';
import { NtLineHitResult } from '../chart/drawings/trend-line/nt-trend-line-hit-test';

export interface INtDrawingManagerApi {
	hitTest(pxX: number, pxY: number): NtLineHitResult | null;
	select(id: string): void;
	deselect(): void;
	destroy(): void;
}

export class NtDrawingManagerApi implements INtDrawingManagerApi {
	private _impl: NtDrawingManager;

	public constructor(impl: NtDrawingManager) {
		this._impl = impl;
	}

	public hitTest(pxX: number, pxY: number): NtLineHitResult | null {
		return this._impl.hitTest(pxX, pxY);
	}

	public select(id: string): void {
		this._impl.select(id);
	}

	public deselect(): void {
		this._impl.deselect();
	}

	public destroy(): void {
		this._impl.destroy();
	}
}
