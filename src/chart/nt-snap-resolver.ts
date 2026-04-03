/**
 * nt-snap-resolver — Definição do Resolver.
 *
 * Arquivo CRIADO pelo fork Neurotrading — Danielle Gurgel
 *
 * A lib define a interface. O app implementa com acesso aos dados (OHLC, grid, etc).
 */

import { PointWorld, PointPx } from './nt-geometry';

/** Fase da interação — resolver pode diferenciar se quiser */
export type NtSnapPhase = 'creation' | 'drag';

/**
 * Contrato do resolver de snap.
 *
 * Parâmetros:
 * raw      — ponto bruto (cursor convertido pra mundo)
 * cursorPx — cursor em pixels (pra threshold em px)
 * phase    — criação ou drag
 *
 * Retorna ponto snapado, ou o original se não houver snap.
 */
export interface INtSnapResolver {
    /**
     * Resolve a posição final do ponto baseado em regras de negócio (OHLC, Grid, etc).
     * Deve retornar 'raw' caso nenhuma regra de proximidade seja satisfeita.
     */
    resolve(raw: PointWorld, cursorPx: PointPx, phase: NtSnapPhase): PointWorld;
}