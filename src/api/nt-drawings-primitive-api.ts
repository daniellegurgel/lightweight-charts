/**
 * API pública do NtDrawingsPrimitive.
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 * Usa WeakMap (via nt-api-internals) pra acessar instância interna.
 */

import { getPrimitiveInternal } from '../chart/nt-api-internals';

export interface INtDrawingsPrimitiveApi {
	requestUpdate(): void;
}

/** @public */
export class NtDrawingsPrimitiveApi implements INtDrawingsPrimitiveApi {
	public requestUpdate(): void {
		getPrimitiveInternal(this).requestUpdate();
	}
}
