/**
 * nt-snap-engine — Motor de snap magnético.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * Serviço independente — não conhece chart, canvas, candles ou ferramentas.
 * Injetado no Tool (criação) e no Manager (drag).
 * Uma instância compartilhada entre os dois.
 */

import { PointWorld, PointPx } from './nt-geometry';
import { INtSnapResolver, NtSnapPhase } from './nt-snap-resolver';

/** Interface pública do SnapEngine */
export interface INtSnapEngine {
    setEnabled(on: boolean): void;
    isEnabled(): boolean;
    setResolver(resolver: INtSnapResolver | null): void;
    snap(raw: PointWorld, cursorPx: PointPx, phase: NtSnapPhase): PointWorld;
}

/** Implementação interna */
export class NtSnapEngine implements INtSnapEngine {
    private _resolver: INtSnapResolver | null;
    private _enabled: boolean = false;

    constructor(resolver?: INtSnapResolver) {
        this._resolver = resolver ?? null;
    }

    public setEnabled(on: boolean): void {
        this._enabled = on;
    }

    public isEnabled(): boolean {
        return this._enabled;
    }

    public setResolver(resolver: INtSnapResolver | null): void {
        this._resolver = resolver;
    }

    public snap(raw: PointWorld, cursorPx: PointPx, phase: NtSnapPhase): PointWorld {
        if (!this._enabled || !this._resolver) return raw;

        try {
            const snapped = this._resolver.resolve(raw, cursorPx, phase);

            // Validação: se o resolver retornar lixo, retorna o ponto original.
            if (!snapped || isNaN(snapped.timeSec) || isNaN(snapped.price)) {
                return raw;
            }

            return { timeSec: snapped.timeSec, price: snapped.price };
        } catch {
            // Falha silenciosa — não travar o render do chart
            return raw;
        }
    }
}

/** Factory — cria instância do NtSnapEngine */
export function createNtSnapEngine(resolver?: INtSnapResolver): INtSnapEngine {
    return new NtSnapEngine(resolver);
}