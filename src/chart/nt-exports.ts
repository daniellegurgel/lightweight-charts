/**
 * nt-exports — Factories públicas das ferramentas NT.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Cria instâncias internas e retorna wrappers de API pública.
 * Os wrappers protegem o app do name mangling do build.
 */

import { NtCoordinateCallbacks, NtDrawingManager } from './nt-drawing-manager';
import { NtToolCallbacks, NtTrendLineTool } from './drawings/trend-line/nt-trend-line-tool';
import { NtLineStyle } from './drawings/trend-line/nt-trend-line-primitive';
import { NtDrawingsPrimitive } from './nt-drawings-primitive';

import { INtDrawingManagerApi, NtDrawingManagerApi } from '../api/nt-drawing-manager-api';
import { INtTrendLineToolApi, NtTrendLineToolApi } from '../api/nt-trend-line-tool-api';
import { INtDrawingsPrimitiveApi, NtDrawingsPrimitiveApi } from '../api/nt-drawings-primitive-api';

export type { INtDrawingManagerApi, INtTrendLineToolApi, INtDrawingsPrimitiveApi };

export function createNtDrawingManager(coords: NtCoordinateCallbacks): INtDrawingManagerApi {
	const impl = new NtDrawingManager(coords);
	return new NtDrawingManagerApi(impl);
}

export function createNtTrendLineTool(
	managerApi: INtDrawingManagerApi,
	callbacks: NtToolCallbacks,
	style?: Partial<NtLineStyle>
): INtTrendLineToolApi {
	// O tool precisa do manager interno, não do wrapper
	const mgr = (managerApi as NtDrawingManagerApi) as unknown;
	const impl = new NtTrendLineTool((mgr as { _impl: NtDrawingManager })._impl, callbacks, style);
	return new NtTrendLineToolApi(impl);
}

export interface NtDrawingsPrimitiveResult {
	/** API pública pra o app chamar */
	api: INtDrawingsPrimitiveApi;
	/** Instância interna pra passar pro series.attachPrimitive() */
	primitive: unknown;
}

export function createNtDrawingsPrimitive(
	managerApi: INtDrawingManagerApi,
	toolApi: INtTrendLineToolApi
): NtDrawingsPrimitiveResult {
	const mgr = ((managerApi as NtDrawingManagerApi) as unknown as { _impl: NtDrawingManager })._impl;
	const tool = ((toolApi as NtTrendLineToolApi) as unknown as { _impl: NtTrendLineTool })._impl;
	const impl = new NtDrawingsPrimitive({ manager: mgr, tool });
	return {
		api: new NtDrawingsPrimitiveApi(impl),
		primitive: impl,
	};
}
