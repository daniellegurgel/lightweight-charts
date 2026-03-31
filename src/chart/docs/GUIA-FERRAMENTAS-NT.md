# Fork Lightweight Charts — Neurotrading

## O problema

O Lightweight Charts compila o código com um transformer que **renomeia automaticamente** todos os métodos de classes que não são públicos na API:

```
attached()     → _internal_attached()
paneViews()    → _internal_paneViews()
hitTest()      → _internal_hitTest()
```

Isso é intencional — reduz o tamanho do bundle em produção. O código original da lib funciona porque tudo é renomeado **consistentemente**: quem chama e quem é chamado são renomeados juntos.

O problema aparece quando a gente cria código novo dentro do fork. As nossas classes são renomeadas pelo mesmo transformer. Mas o chart chama os métodos pelo **nome original** (ex: `primitive.attached()`). Depois do build, o método virou `_internal_attached()` — o chart não encontra e ignora silenciosamente.

## Por que temos que fazer assim

O transformer decide o que renomear com base numa regra: se a classe ou seus métodos **aparecem nos tipos exportados** do `index.ts`, ele preserva. Se não aparecem, ele renomeia.

Então pra nosso código funcionar, precisamos de 3 coisas:

1. **Interface exportada** no `index.ts` — quando uma classe implementa uma interface que é pública, o transformer preserva os nomes dos métodos dessa interface. É por isso que `NtDrawingsPrimitive implements INtSeriesPrimitive` funciona.

2. **`/** @public */`** — pra classes menores que o transformer não consegue resolver pela árvore de tipos (como PaneView e Renderer), o JSDoc `@public` força a preservação.

3. **WeakMap pra wrappers** — os wrappers de API (`NtTrendLineToolApi`, etc.) precisam acessar a instância interna. Se guardarmos num campo `_impl`, o transformer renomeia pra `_private__impl`. O WeakMap é uma variável de módulo — o transformer não toca em variáveis de módulo, só em campos de classe.

Além disso:

4. **`INtAttachedParam`** — o método `attached(param)` da primitiva recebe um objeto do chart com `requestUpdate`. Se o tipo do parâmetro não for uma interface exportada, o transformer renomeia `param.requestUpdate` pra `param._internal_requestUpdate` — e o chart passa pelo nome original. Resultado: a primitiva nunca recebe a função de redraw. Solução: criar `INtAttachedParam` exportada com `requestUpdate: () => void`.

**Regra**: qualquer parâmetro de método que recebe objeto do chart precisa ter tipo exportado como interface pública.

5. **Coordenadas no renderer** — a primitiva usa `useMediaCoordinateSpace` que já escala por `pixelRatio`. NÃO multiplicar coordenadas por `pixelRatio` no renderer — só espessuras e raios. Duplicar pixelRatio desloca a reta.

6. **Preview da ferramenta** — usar `pointermove` direto no container DOM, não `subscribeCrosshairMove`. O crosshair não foi feito pra ser motor de preview. Quando a ferramenta tá ativa, bloquear pan/scroll/scale do chart via `handleScroll: false, handleScale: false`.

## Resumo simples

O build renomeia tudo que é "interno". Pra nosso código funcionar, temos que dizer pro build: "isso aqui é público, não renomeia". Fazemos isso com interfaces exportadas, `@public`, WeakMap, e `INtAttachedParam`.

## Como implementar novas ferramentas

### Estrutura no fork (pra cada ferramenta)

```
src/chart/drawings/nome-da-ferramenta/
├── nt-nome-primitive.ts      ← dados + mutação + toJSON/fromJSON
├── nt-nome-renderer.ts       ← desenho no canvas com pixelRatio
├── nt-nome-hit-test.ts       ← detecção de clique (body, handles, partes)
└── nt-nome-tool.ts           ← FSM de criação (quantos cliques, preview)
```

### Passo a passo

1. Criar os 4 arquivos acima
2. Registrar no `nt-drawing-manager.ts` — hit test e serialização do novo tipo
3. Registrar no `nt-drawings-primitive.ts` — o renderer chama o desenho do novo tipo
4. Criar wrapper API em `src/api/` com `/** @public */`
5. Se a classe é chamada diretamente pelo chart, implementar interface exportada (mesmo padrão do `INtSeriesPrimitive`)
6. Registrar no `nt-api-internals.ts` — WeakMap pro novo tipo
7. Exportar factory no `nt-exports.ts` e `index.ts`
8. Build do fork → instalar no app

### Regras obrigatórias

- **Rendering** fica no fork, nunca no app
- **App** só importa factories e interfaces — nunca classes internas
- **`/** @public */`** em toda classe cujos métodos precisam nomes preservados no build
- **Interfaces exportadas** pra classes que o chart chama diretamente (`attached`, `paneViews`, etc.)
- **WeakMap** pra ponte entre wrappers públicos e instâncias internas
- **pixelRatio** em toda coordenada de desenho
- **FSM** com estados claros e preview durante criação
- **Hit test** retorna parte acertada (body, start, end, handle)

### O que fica compartilhado (não duplicar)

- `nt-geometry.ts` — funções de math
- `nt-drawing-manager.ts` — seleção, drag, eventos, serialização
- `nt-drawings-primitive.ts` — renderiza todos os tipos de desenho
- `nt-api-internals.ts` — WeakMaps
- `nt-exports.ts` — factories

### Build e instalação

```bash
cd c:\dev\lightweight-charts && npm run build
cd c:\dev\neurotrading-app && npm install c:\dev\lightweight-charts && rm -rf node_modules/.vite
```
