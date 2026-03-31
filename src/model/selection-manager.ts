/**
 * SelectionManager — Gerenciador de seleção de objetos no gráfico.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Guarda qual objeto está selecionado (identidade estável).
 * Emite eventos quando a seleção muda. Limpa seleção (fundo ou ESC).
 * Não decide ação, não renderiza visual, não conhece indicadores.
 */

import { HitTestEnrichedResult, isSameObject, SelectableObjectId } from './hit-test-result';

/** Callback disparado quando a seleção muda */
export type SelectionChangedListener = (selection: HitTestEnrichedResult | null) => void;

export class SelectionManager {
	private _selection: HitTestEnrichedResult | null = null;
	private _listeners: SelectionChangedListener[] = [];

	/**
	 * Retorna a seleção atual, ou null se nada selecionado.
	 */
	public selection(): HitTestEnrichedResult | null {
		return this._selection;
	}

	/**
	 * Retorna o ID do objeto selecionado, ou null.
	 */
	public selectedObjectId(): SelectableObjectId | null {
		return this._selection?.id ?? null;
	}

	/**
	 * Verifica se um objeto específico está selecionado.
	 */
	public isSelected(id: SelectableObjectId): boolean {
		if (this._selection === null) {
			return false;
		}
		return isSameObject(this._selection.id, id);
	}

	/**
	 * Seleciona um objeto. Se já é o mesmo, não emite evento.
	 *
	 * @param result - Resultado enriquecido do hit test
	 */
	public select(result: HitTestEnrichedResult): void {
		if (this._selection !== null && isSameObject(this._selection.id, result.id)) {
			// Mesmo objeto — atualiza detalhe (part, itemIndex) sem emitir
			this._selection = result;
			return;
		}

		this._selection = result;
		this._notifyListeners();
	}

	/**
	 * Limpa a seleção. Se já estava limpa, não emite evento.
	 */
	public clear(): void {
		if (this._selection === null) {
			return;
		}

		this._selection = null;
		this._notifyListeners();
	}

	/**
	 * Registra listener pra mudanças de seleção.
	 * Retorna função pra remover o listener.
	 */
	public onSelectionChanged(listener: SelectionChangedListener): () => void {
		this._listeners.push(listener);

		return () => {
			const index = this._listeners.indexOf(listener);
			if (index >= 0) {
				this._listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Remove todos os listeners. Usar no destroy do chart.
	 */
	public destroy(): void {
		this._listeners = [];
		this._selection = null;
	}

	private _notifyListeners(): void {
		const selection = this._selection;
		for (const listener of this._listeners) {
			listener(selection);
		}
	}
}
