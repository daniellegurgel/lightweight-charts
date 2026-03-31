/**
 * nt-api-internals — Registro central de instâncias internas.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Usa WeakMap pra associar wrappers públicos (API) às instâncias internas.
 * O build transformer não renomeia variáveis de módulo — só campos de classe.
 * Por isso o WeakMap é seguro pra guardar a ponte entre público e interno.
 *
 * Se não achar no WeakMap, lança erro claro.
 */

import { NtDrawingManager } from './nt-drawing-manager';
import { NtTrendLineTool } from './drawings/trend-line/nt-trend-line-tool';

// WeakMaps — chave é o wrapper público, valor é a instância interna
const managers = new WeakMap<object, NtDrawingManager>();
const tools = new WeakMap<object, NtTrendLineTool>();

/** Registra um manager interno associado ao seu wrapper público */
export function registerManager(api: object, impl: NtDrawingManager): void {
	managers.set(api, impl);
}

/** Recupera o manager interno a partir do wrapper público */
export function getManagerInternal(api: object): NtDrawingManager {
	const impl = managers.get(api);
	if (!impl) {
		throw new Error('[NT] NtDrawingManagerApi wrapper inválido — instância interna não encontrada');
	}
	return impl;
}

/** Registra um tool interno associado ao seu wrapper público */
export function registerTool(api: object, impl: NtTrendLineTool): void {
	tools.set(api, impl);
}

/** Recupera o tool interno a partir do wrapper público */
export function getToolInternal(api: object): NtTrendLineTool {
	const impl = tools.get(api);
	if (!impl) {
		throw new Error('[NT] NtTrendLineToolApi wrapper inválido — instância interna não encontrada');
	}
	return impl;
}
