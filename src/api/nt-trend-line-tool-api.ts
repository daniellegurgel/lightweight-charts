/**
 * API pública do NtTrendLineTool.
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 * Usa WeakMap (via nt-api-internals) pra acessar instância interna.
 */

import { getToolInternal } from '../chart/nt-api-internals';

export interface INtTrendLineToolApi {
	state(): 'idle' | 'waiting-first' | 'waiting-second';
	activate(): void;
	deactivate(): void;
	cancel(): void;
	handleClick(pxX: number, pxY: number): boolean;
	handleMove(pxX: number, pxY: number): boolean;
}

export class NtTrendLineToolApi implements INtTrendLineToolApi {
	public state(): 'idle' | 'waiting-first' | 'waiting-second' {
		return getToolInternal(this).state();
	}

	public activate(): void {
		getToolInternal(this).activate();
	}

	public deactivate(): void {
		getToolInternal(this).deactivate();
	}

	public cancel(): void {
		getToolInternal(this).cancel();
	}

	public handleClick(pxX: number, pxY: number): boolean {
		return getToolInternal(this).handleClick(pxX, pxY);
	}

	public handleMove(pxX: number, pxY: number): boolean {
		return getToolInternal(this).handleMove(pxX, pxY);
	}
}
