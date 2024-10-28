import type { ArchitecturesList } from "./ca-schemaListArchitectures";
import type { components } from "./ca-schema";
import { tweened } from "svelte/motion";
import { cubicOut } from "svelte/easing";

/** State definitions for Cognitive Architect objects.
 *
 * The states are 1:1 copies of the objects returned by the Cognitive Architect API.
 * The OpenAPI definition has been converted to Typescript definitions .d.ts in the following steps:
 * - ca-openapi.json received from CA team (stored in /lib/)
 * - used openapi-typescript on the cmd line to convert
 * -- openapi-typescript
 * -- npx openapi-typescript ca-openapi.json -o ca_schema.d.ts
 * - define type (below)
 *
 * WARNING: the provided Swagger API definition file is not 100% in line with what is actually returned by CA.
 * I've changed/added this manually to ca_schemas.d.ts (changes will be lost after regenerating this file)
 * - hasContent field in GetArtifactCatalogResponse is wrongly typed (as string instead of boolean).
 * - GetArchInfoResponse is missing two fields: archId: string; lastModified?: string;
 * - ArchitecturesList is missing altogether, generated from sample data, see ca-schemaListArchitectures.
 * @see: https://www.npmjs.com/package/openapi-typescript
 * @see: custom definitions at the bottom of this file, for definitions that were missing.
 */

export type ArtifactCatalog = components["schemas"]["GetArtifactCatalogResponse"];
export type ArchitectureInfo = components["schemas"]["GetArchInfoResponse"];
export type ArtifactType = components["schemas"]["CustomizeReportContent"]["artifactType"];
//export type ArtifactTypesAlternative = components["schemas"]["GetArtifactCatalogResponse"]["artifactType"]; // has types commented out, but should be the source.
export type ArtifactInstancesList = components["schemas"]["GetArtifactInstanceSummaryListResponse"];
export type ArtifactInstanceResponse = components["schemas"]["ArtifactInstanceResponse"];
//export type ArtifactInstanceElement = components["schemas"]["ArtifactInstanceResponse"]["coreInfo"];
export type ArtifactInstanceElement = Record<string, string>; // don't understand why it is otherwise Record<string, never>
export type DiagramFormat = "svg" | "png";
export const SELECT_NONE = "none";

export const archList = $state<{ value: ArchitecturesList[] | null }>({ value: null });

// Note: using this class in this way needs the target in tsconfig.js to be set to es2022.
class Architecture {
    public info: ArchitectureInfo | null = $state(null);
    public artifacts: ArtifactCatalog[] | null = $state(null);
    public instances: ArtifactInstancesList[] | null = $state(null);
    public selected: ArchitectureInfo["archId"] = $state(SELECT_NONE);
    public elements: ArtifactInstanceElement | null = $state(null);
    constructor() {}
}
export const architecture = new Architecture();

/** set this store to value between 0 and 1 to show progress visually. Set to 0 to hide it */
export const progress = tweened(0, {
    duration: 400,
    easing: cubicOut,
});

export const errorMsgs = $state<{ value: string[] }>({ value: [] });

//export const modelTypeBase: string[] = ["POMView", "FunctionalRequirement", "LogicalComponent", "Implementation", "DU", "Actor", "LogicalNode", "OMLocation"];

/** Custom definitions not available in Cognitive Architect OpenAPI definitions */
export const ARTIFACT_WITH_TEXT: ArtifactType[] = [
    "assetartifact_executivesummary",
    "assetartifact_businesschallenge",
    "assetartifact_usecase_uctext",
    "assetartifact_functionalrequirement",
    "assetartifact_nonfunctionalrequirement",
    "assetartifact_architecturedecision",
    "assetartifact_risk",
    "assetartifact_assumption",
    "assetartifact_issue",
    "assetartifact_dependency",
    "assetartifact_architecture_principles",
    "assetartifact_notes",
    "assetartifact_systemcontext",
    "assetartifact_usecase_ucdiagram",
    "assetartifact_architectureoverview_aodservice",
    "assetartifact_architectureoverview_enterprise",
    "assetartifact_architectureoverview_itsystem",
    "assetartifact_architectureoverview_usagescenario",
    "assetartifact_componentmodel_staticview",
    "assetartifact_componentmodel_dynamicview",
    "assetartifact_operationalmodel_logicaloperational",
    "assetartifact_operationalmodel_physicaloperational",
    "assetartifact_logical_datamodel",
];
export const ARTIFACT_WITH_DIAGRAM: ArtifactType[] = [
    "assetartifact_systemcontext",
    "assetartifact_usecase_ucdiagram",
    "assetartifact_architectureoverview_aodservice",
    "assetartifact_architectureoverview_enterprise",
    "assetartifact_architectureoverview_itsystem",
    "assetartifact_architectureoverview_usagescenario",
    "assetartifact_componentmodel_staticview",
    "assetartifact_componentmodel_dynamicview",
    "assetartifact_operationalmodel_logicaloperational",
    "assetartifact_operationalmodel_physicaloperational",
    "assetartifact_logical_datamodel",
];
// export const MODEL_TYPES
