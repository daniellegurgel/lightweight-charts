/**
 * API pública do NtDrawingsPrimitive.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Wrapper mínimo — expõe só requestUpdate.
 */

import { NtDrawingsPrimitive } from '../chart/nt-drawings-primitive';

export interface INtDrawingsPrimitiveApi {
	requestUpdate(): void;
}

export class NtDrawingsPrimitiveApi implements INtDrawingsPrimitiveApi {
	private _impl: NtDrawingsPrimitive;

	public constructor(impl: NtDrawingsPrimitive) {
		this._impl = impl;
	}

	public requestUpdate(): void {
		this._impl.requestUpdate();
	}

	/** Retorna a instância interna pra attach no chart (uso interno) */
	public getInternal(): NtDrawingsPrimitive {
		return this._impl;
	}
}
