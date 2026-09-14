//#region src/config.ts
const PET_CONFIG_DEFAULTS = {
	enabled: true,
	speciesId: "kirby-blob",
	corner: "bottom-right",
	sizePx: 160,
	reducedMotion: false
};
const CORNERS = [
	"bottom-right",
	"bottom-left",
	"top-right",
	"top-left"
];
const SIZE_MIN = 96;
const SIZE_MAX = 240;
function clamp(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}
/**
* Merge a raw config object (from the `--patch` yml, boot-injected) over
* defaults, clamping the size and validating the corner/species id. Unknown or
* malformed fields fall back to defaults rather than throwing.
*/
function resolvePetConfig(raw) {
	const r = raw !== null && typeof raw === "object" ? raw : {};
	const corner = typeof r.corner === "string" && CORNERS.includes(r.corner) ? r.corner : PET_CONFIG_DEFAULTS.corner;
	const sizeRaw = typeof r.sizePx === "number" && Number.isFinite(r.sizePx) ? r.sizePx : PET_CONFIG_DEFAULTS.sizePx;
	const speciesRaw = typeof r.speciesId === "string" && r.speciesId.length > 0 ? r.speciesId : PET_CONFIG_DEFAULTS.speciesId;
	return {
		enabled: typeof r.enabled === "boolean" ? r.enabled : PET_CONFIG_DEFAULTS.enabled,
		speciesId: speciesRaw,
		corner,
		sizePx: Math.round(clamp(sizeRaw, SIZE_MIN, SIZE_MAX)),
		reducedMotion: typeof r.reducedMotion === "boolean" ? r.reducedMotion : PET_CONFIG_DEFAULTS.reducedMotion
	};
}
//#endregion
//#region src/index.ts
const name = "agent-pet";
function apply(ctx, config) {
	const resolved = resolvePetConfig(config);
	ctx.logger.info("agent-pet host plugin loaded", {
		speciesId: resolved.speciesId,
		corner: resolved.corner,
		sizePx: resolved.sizePx,
		reducedMotion: resolved.reducedMotion,
		enabled: resolved.enabled
	});
	ctx.on("webserver/index-inject", (table) => {
		table.push({
			kind: "global",
			name: "__AGENT_PET_CONFIG__",
			value: resolved
		});
	});
}
//#endregion
export { apply, name };
