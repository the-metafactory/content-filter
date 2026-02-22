/**
 * Embedded default filter configuration.
 *
 * Uses Bun's text import to embed filter-patterns.yaml at compile time.
 * This ensures the config is available in compiled binaries where
 * import.meta.dir resolves to a non-existent path.
 *
 * @see https://github.com/jcfischer/pai-content-filter/issues/9
 */
import defaultYaml from "../../config/filter-patterns.yaml" with { type: "text" };

export const DEFAULT_CONFIG_YAML: string = defaultYaml;
