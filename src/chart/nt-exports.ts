/**
 * nt-exports — Factories públicas das ferramentas NT.
 *
 * Arquivo CRIADO por  — Danielle Gurgel
 *
 * Cria instâncias internas, registra no nt-api-internals,
 * retorna wrappers públicos com nomes estáveis.
 */

import { NtCoordinateCallbacks, NtDrawingManager } from './nt-drawing-manager';
import { NtLineStyle } from './drawings/trend-line/nt-trend-line-primitive';
import { NtToolCallbacks, NtTrendLineTool } from './drawings/trend-line/nt-trend-line-tool';
import { NtDrawingsPrimitive } from './nt-drawings-primitive';
import { INtSnapEngine } from './nt-snap-engine';
import { registerManager, getManagerInternal, registerTool, getToolInternal, registerPrimitive } from './nt-api-internals';

import { INtDrawingManagerApi, NtDrawingManagerApi } from '../api/nt-drawing-manager-api';
import { INtDrawingsPrimitiveApi, NtDrawingsPrimitiveApi } from '../api/nt-drawings-primitive-api';
import { INtTrendLineToolApi, NtTrendLineToolApi } from '../api/nt-trend-line-tool-api';

export type { INtDrawingManagerApi, INtDrawingsPrimitiveApi, INtTrendLineToolApi };

export function createNtDrawingManager(coords: NtCoordinateCallbacks, snapEngine?: INtSnapEngine): INtDrawingManagerApi {
	const impl = new NtDrawingManager(coords, snapEngine);
	const api = new NtDrawingManagerApi();
	registerManager(api, impl);
	return api;
}

export function createNtTrendLineTool(
	managerApi: INtDrawingManagerApi,
	callbacks: NtToolCallbacks,
	snapEngine: INtSnapEngine,
	style?: Partial<NtLineStyle>
): INtTrendLineToolApi {
	const mgr = getManagerInternal(managerApi);
	const impl = new NtTrendLineTool(mgr, callbacks, snapEngine, style);
	const api = new NtTrendLineToolApi();
	registerTool(api, impl);
	return api;
}

/** Parâmetro recebido pelo attached() — nomes públicos */
export interface INtAttachedParam {
	requestUpdate: () => void;
}

/** Interface que espelha o que o chart espera de uma primitiva */
export interface INtSeriesPrimitive {
	attached(param: INtAttachedParam): void;
	detached(): void;
	updateAllViews(): void;
	paneViews(): readonly object[];
	hitTest(x: number, y: number): object | null;
	requestUpdate(): void;
}

export interface NtDrawingsPrimitiveResult {
	api: INtDrawingsPrimitiveApi;
	primitive: INtSeriesPrimitive;
}

export function createNtDrawingsPrimitive(
	managerApi: INtDrawingManagerApi,
	toolApi: INtTrendLineToolApi
): NtDrawingsPrimitiveResult {
	const mgr = getManagerInternal(managerApi);
	const tool = getToolInternal(toolApi);
	const impl = new NtDrawingsPrimitive({ manager: mgr, tool });
	const api = new NtDrawingsPrimitiveApi();
	registerPrimitive(api, impl);
	return {
		api,
		primitive: impl,
	};
}
