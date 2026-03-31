/**
 * nt-selection-manager — Gerenciador de seleção de retas.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Guarda qual reta está selecionada por ID (identidade estável).
 * Emite evento quando a seleção muda.
 * Não renderiza, não decide ação — só guarda estado.
 */

/** Callback quando a seleção muda */
export type NtSelectionListener = (selectedId: string | null) => void;

export class NtSelectionManager {
	private _selectedId: string | null = null;
	private _listeners: NtSelectionListener[] = [];

	/** ID da reta selecionada, ou null */
	public selectedId(): string | null {
		return this._selectedId;
	}

	/** Verifica se uma reta específica está selecionada */
	public isSelected(id: string): boolean {
		return this._selectedId === id;
	}

	/** Seleciona uma reta. Se já é a mesma, não emite */
	public select(id: string): void {
		if (this._selectedId === id) return;
		this._selectedId = id;
		this._notify();
	}

	/** Limpa a seleção. Se já tava limpa, não emite */
	public clear(): void {
		if (this._selectedId === null) return;
		this._selectedId = null;
		this._notify();
	}

	/** Registra listener. Retorna função pra remover */
	public onChanged(listener: NtSelectionListener): () => void {
		this._listeners.push(listener);
		return () => {
			const i = this._listeners.indexOf(listener);
			if (i >= 0) this._listeners.splice(i, 1);
		};
	}

	/** Limpa tudo (usar no destroy do chart) */
	public destroy(): void {
		this._listeners = [];
		this._selectedId = null;
	}

	private _notify(): void {
		const id = this._selectedId;
		for (const fn of this._listeners) {
			fn(id);
		}
	}
}
