/**
 * API pública do NtTrendLineTool.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Wrapper mínimo — expõe só o que o app usa.
 * Nomes estáveis, não afetados pelo build transformer.
 */

import { NtTrendLineTool } from '../chart/drawings/trend-line/nt-trend-line-tool';

export interface INtTrendLineToolApi {
	state(): 'idle' | 'waiting-first' | 'waiting-second';
	activate(): void;
	deactivate(): void;
	cancel(): void;
	handleClick(pxX: number, pxY: number): boolean;
	handleMove(pxX: number, pxY: number): boolean;
}

export class NtTrendLineToolApi implements INtTrendLineToolApi {
	private _impl: NtTrendLineTool;

	public constructor(impl: NtTrendLineTool) {
		this._impl = impl;
	}

	public state(): 'idle' | 'waiting-first' | 'waiting-second' {
		return this._impl.state();
	}

	public activate(): void {
		this._impl.activate();
	}

	public deactivate(): void {
		this._impl.deactivate();
	}

	public cancel(): void {
		this._impl.cancel();
	}

	public handleClick(pxX: number, pxY: number): boolean {
		return this._impl.handleClick(pxX, pxY);
	}

	public handleMove(pxX: number, pxY: number): boolean {
		return this._impl.handleMove(pxX, pxY);
	}
}
