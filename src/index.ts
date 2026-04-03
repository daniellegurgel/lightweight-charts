/// <reference types="_build-time-constants" />

import { customStyleDefaults, seriesOptionsDefaults } from './api/options/series-options-defaults';
import { CustomSeriesOptions } from './model/series-options';

export { LineStyle, LineType } from './renderers/draw-line';

export { TrackingModeExitMode } from './model/chart-model';
export { CrosshairMode } from './model/crosshair';
export { MismatchDirection } from './model/plot-list';
export { PriceScaleMode } from './model/price-scale';
export { PriceLineSource, LastPriceAnimationMode } from './model/series-options';
export { ColorType } from './model/layout-options';

export { isBusinessDay, isUTCTimestamp } from './model/horz-scale-behavior-time/types';
export { TickMarkType } from './model/horz-scale-behavior-time/types';
export const customSeriesDefaultOptions: CustomSeriesOptions = {
	...seriesOptionsDefaults,
	...customStyleDefaults,
};
export type { ICustomSeriesPaneView, ICustomSeriesPaneRenderer, CustomBarItemData, CustomData } from './model/icustom-series';

export { createChart, createChartEx, defaultHorzScaleBehavior } from './api/create-chart';
export { createYieldCurveChart } from './api/create-yield-curve-chart';
export { createOptionsChart } from './api/create-options-chart';

export { lineSeries as LineSeries } from './model/series/line-series';
export { baselineSeries as BaselineSeries } from './model/series/baseline-series';
export { areaSeries as AreaSeries } from './model/series/area-series';
export { barSeries as BarSeries } from './model/series/bar-series';
export { candlestickSeries as CandlestickSeries } from './model/series/candlestick-series';
export { histogramSeries as HistogramSeries } from './model/series/histogram-series';
/*
	Plugins
*/
export { createTextWatermark } from './plugins/text-watermark/primitive';
export { createImageWatermark } from './plugins/image-watermark/primitive';
export { createSeriesMarkers } from './plugins/series-markers/wrapper';
export { createUpDownMarkers } from './plugins/up-down-markers-plugin/wrapper';

/**
 * Returns the current version as a string. For example `'3.3.0'`.
 */
export function version(): string {
	return process.env.BUILD_VERSION;
}

/*
	Neurotrading — Ferramentas de desenho
*/
export { createNtDrawingManager, createNtTrendLineTool, createNtDrawingsPrimitive } from './chart/nt-exports';
export type { INtDrawingManagerApi, INtTrendLineToolApi, INtDrawingsPrimitiveApi } from './chart/nt-exports';
export type { NtDrawingEventType, NtDrawingEvent, NtCoordinateCallbacks } from './chart/nt-drawing-manager';
export type { INtSnapResolver, NtSnapPhase } from './chart/nt-snap-resolver';
export type { INtSnapEngine } from './chart/nt-snap-engine';
export { createNtSnapEngine } from './chart/nt-snap-engine';
export type { NtToolState, NtToolCallbacks, NtPreviewState } from './chart/drawings/trend-line/nt-trend-line-tool';
export { desenharReta, desenharPreview } from './chart/drawings/trend-line/nt-trend-line-renderer';
export type { NtLineRenderParams, NtLinePreviewParams } from './chart/drawings/trend-line/nt-trend-line-renderer';
export { criarReta, moverReta, moverPonta, retaToJSON, retaFromJSON, timeToSeconds } from './chart/drawings/trend-line/nt-trend-line-primitive';
export type { NtLineData, NtLineStyle, NtLineConfig, NtLineLabel } from './chart/drawings/trend-line/nt-trend-line-primitive';
export { NT_LINE_DEFAULT_STYLE, NT_LINE_DEFAULT_CONFIG, NT_LINE_DEFAULT_LABEL } from './chart/drawings/trend-line/nt-trend-line-primitive';
export { hitTestReta } from './chart/drawings/trend-line/nt-trend-line-hit-test';
export type { NtLineHitResult, NtLineHitPart } from './chart/drawings/trend-line/nt-trend-line-hit-test';
export { distanciaPonto, distanciaAoSegmento, distanciaALinha } from './chart/nt-geometry';
export type { PointPx, PointWorld } from './chart/nt-geometry';
