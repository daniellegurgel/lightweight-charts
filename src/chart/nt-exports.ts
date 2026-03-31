/**
 * nt-exports — Factories públicas das ferramentas NT.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Cria instâncias internas, registra no nt-api-internals,
 * retorna wrappers públicos com nomes estáveis.
 */

import { NtCoordinateCallbacks, NtDrawingManager } from './nt-drawing-manager';
import { NtLineStyle } from './drawings/trend-line/nt-trend-line-primitive';
import { NtToolCallbacks, NtTrendLineTool } from './drawings/trend-line/nt-trend-line-tool';
import { NtDrawingsPrimitive } from './nt-drawings-primitive';
import { registerManager, getManagerInternal, registerTool, getToolInternal } from './nt-api-internals';

import { INtDrawingManagerApi, NtDrawingManagerApi } from '../api/nt-drawing-manager-api';
import { INtDrawingsPrimitiveApi, NtDrawingsPrimitiveApi } from '../api/nt-drawings-primitive-api';
import { INtTrendLineToolApi, NtTrendLineToolApi } from '../api/nt-trend-line-tool-api';

export type { INtDrawingManagerApi, INtDrawingsPrimitiveApi, INtTrendLineToolApi };

export function createNtDrawingManager(coords: NtCoordinateCallbacks): INtDrawingManagerApi {
	const impl = new NtDrawingManager(coords);
	const api = new NtDrawingManagerApi(impl);
	registerManager(api, impl);
	return api;
}

export function createNtTrendLineTool(
	managerApi: INtDrawingManagerApi,
	callbacks: NtToolCallbacks,
	style?: Partial<NtLineStyle>
): INtTrendLineToolApi {
	const mgr = getManagerInternal(managerApi);
	const impl = new NtTrendLineTool(mgr, callbacks, style);
	const api = new NtTrendLineToolApi(impl);
	registerTool(api, impl);
	return api;
}

export interface NtDrawingsPrimitiveResult {
	api: INtDrawingsPrimitiveApi;
	primitive: unknown;
}

export function createNtDrawingsPrimitive(
	managerApi: INtDrawingManagerApi,
	toolApi: INtTrendLineToolApi
): NtDrawingsPrimitiveResult {
	const mgr = getManagerInternal(managerApi);
	const tool = getToolInternal(toolApi);
	const impl = new NtDrawingsPrimitive({ manager: mgr, tool });
	return {
		api: new NtDrawingsPrimitiveApi(impl),
		primitive: impl,
	};
}
