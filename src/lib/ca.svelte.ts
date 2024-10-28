import { requestUrl, type RequestUrlParam } from "obsidian";
import {
    archList,
    architecture,
    SELECT_NONE,
    ARTIFACT_WITH_DIAGRAM,
    errorMsgs,
    type ArtifactType,
    type ArtifactCatalog,
    type ArtifactInstancesList,
    type ArtifactInstanceResponse,
    type ArtifactInstanceElement,
} from "./states.svelte";
import type { ArchitecturesList } from "./ca-schemaListArchitectures";

/** Access Cognitive Architect architectures and its artifcats.
 * The data is available through the state rune (see Svelte 5 docs), not through public fields on the class. This makes reactivity of the data in
 * the view easier to implement.
 * Types for the objects returned from the API are imported separately, see notes in stores.ts.
 * Steps to retrieve the data:
 * 1. List architectures (private and collaboration architecture); this uses an undocumented API, only available through PUT request
 * curl 'https://w3.ibm.com/tools/cogarch/api/aggregatesvc/WorkspaceFacadeAPIs/owned/architectures?status=Pending' -H 'authorization: token ​****' -H 'accept: application/json' -X PUT
 * curl 'https://w3.ibm.com/tools/cogarch/api/aggregatesvc/WorkspaceFacadeAPIs/shared/architectures/private' -H 'authorization: token ​***' -H 'accept: application/json' -X PUT
 * 2. List of artifacts
 * GET /architecturesvc/ArchitectureAPIs/architectures/{archId}/artifacts/catalog --> get the instance type list
 * 3. List of instances of artifact
 * GET /architectures/{archId}/artifacts/instances --> get the instance list
 * 4a. Get the data of the artifact instance
 * POST /architectures/{archId}/artifacts/instances/{instanceId} --> get the data of the instance
 * 4b. Get the diagram of the artifact instance
 * ...
 *
 * @see API docs https://pages.github.ibm.com/CTOTools/CogArch_Docs/Overview#accessing-architecture-data-via-apis
 * @see CA API spec https://w3.ibm.com/tools/cogarch/api-docs/#
 */
export class CAArchitecture {
    #baseURL = "";
    #personal_token: string = "";

    constructor(baseUrl: string) {
        this.#baseURL = baseUrl;
        //this.personal_token = personal_token;
        //console.log(new.target);
    }

    /** Retrieve all private architectures of the user (that belong to the Personal Token)
     * Sets the result in architecuresList field and triggers the onUpdate function (for clients to respond to).
     */
    async getAllPrivateArchitectures(): Promise<boolean> {
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                method: "PUT",
                url: this.#baseURL + "/api/aggregatesvc/WorkspaceFacadeAPIs/owned/architectures?status=Pending",
                headers,
            });
            if (response.status === 200) {
                //console.log(response.json);
                //this.architecturesList = response.json.data;
                archList.value = response.json.data;
                //archList.set(response.json.data);
                return true;
            } else {
                // This won't be executed, the Promise will thrown an error.
                // console.log(`Error fetching list of architectures. HTTP error ${response.status}`);
                return false;
            }
        } catch (error) {
            // console.log(`Error retrieving list of architectures. \n${error} `);
            return false;
        }
    }
    /** Retrieve a list of all architectures of the user (checks settings for the type of architectures to list)
     * Sets the result in architecuresList field and triggers the onUpdate function (for clients to respond to).
     */
    async getArchitecturesList(privateArchitectures = true, collaborationArchitectures = false): Promise<boolean> {
        let listArch: ArchitecturesList[] = [];
        if (privateArchitectures) {
            const response = await this.getArchitectures("/api/aggregatesvc/WorkspaceFacadeAPIs/owned/architectures?status=Pending");
            if (response) listArch = response;
        }
        if (collaborationArchitectures) {
            const response = await this.getArchitectures("/api/aggregatesvc/WorkspaceFacadeAPIs/shared/architectures/private");
            if (response) listArch = [...listArch, ...response];
        }
        if (listArch.length > 0) {
            // console.log(listArch);
            archList.value = listArch;
            //archList.set(listArch);
            return true;
        }
        return false;
    }

    /** Get list of architectures.
     * @param url the url (not including baseURL) to get architectures from
     * @returns
     */
    private async getArchitectures(url: string): Promise<ArchitecturesList[] | null> {
        if (!url) return null;
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                method: "PUT",
                url: this.#baseURL + url,
                headers,
            });
            if (response.status === 200) {
                //archList.set(response.json.data);
                return response.json.data;
            } else {
                // console.log(`Error fetching list of architectures. HTTP error ${response.status}`);
                return null;
            }
        } catch (error) {
            // console.log(`Error retrieving list of architectures. \n${error} `);
            return null;
        }
    }

    /** Retrieve meta data of an architecture
     * @param archId - id of architecture
     * @returns nothing - a store (archInfo) is populated with meta data of the architecture.
     */
    async getArchitectureInfo(archId: string): Promise<void> {
        if (archId === undefined) return;
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                url: this.#baseURL + "/api/architectures/" + archId,
                headers,
            });
            if (response.status === 200) {
                architecture.selected = archId;
                // selectedArch.set(archId);
                architecture.info = response.json;
                // archInfo.set(response.json);
            } else {
                // console.log(`Error ${response.status} and ${response.json}`);
            }
        } catch (error) {
            const err = `Can't retrieve information on architecture.`;
            errorMsgs.value.push(err);
            // errorMsgs.update((value) => [...value, err]);
            // console.log(`${err}\n${error} `);
        }
    }

    /** Retrieve a list of all artifacts of an architecture
     * @param @param archId - id of architecture
     * @returns nothing - a store (archArtifacts) is populated with the architecture artifacts.
     */
    async getArtifactCatalog(archId: string): Promise<void> {
        if (archId === undefined) return;
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                url: this.#baseURL + "/api/architecturesvc/ArchitectureAPIs/architectures/" + archId + "/artifacts/catalog",
                headers,
            });
            if (response.status === 200) {
                if (response.json.archId !== "") {
                    architecture.artifacts = this.filterArtifacts(response.json);
                    // archArtifacts.set(this.filterArtifacts(response.json));
                    // console.log(get(archArtifacts));
                }
            }
        } catch (error) {
            const err = `Can't retrieve artefacts of architecture.`;
            errorMsgs.value.push(err);
            // errorMsgs.update((value) => [...value, err]);
            // console.log(`${err} \n${error} `);
        }
    }

    /**
     * Retrieves a list of all the instances of an artifact.
     * @param archId
     * @param artifactType
     * @param artifactTypeId - an optional additional filter. Artifacts like RACI, Sizing and Notes are all of type Notes; you can filter those with the artifactId.
     * @returns nothing, sets a store (archArtifactInstancesList) that lists all the instances of this artifact.
     */
    async getArtifactInstanceSummary(archId: ArtifactCatalog["_id"], artifactType: ArtifactType, artifactTypeId?: string) {
        if (archId == null && artifactType == null) {
            console.warn(`Not provided valid arguments`);
            return;
        }
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                url: this.#baseURL + "/api/architectures/" + archId + "/artifacts/instances?artifactType=" + artifactType,
                headers,
            });
            if (response.status === 200) {
                // Only artifactTypes of "Notes" have a property artifactTypeId; those should be furter filtered (into RACI, Sizing and Notes).
                // Checking the first instance of the response for this property is enough.
                if (artifactTypeId && Object.hasOwn(response.json[0], "artifactTypeId")) {
                    architecture.instances = response.json.filter((item) => item.artifactTypeId === artifactTypeId);
                    //archArtifactInstancesList.set(response.json.filter((item) => item.artifactTypeId === artifactTypeId));
                } else {
                    architecture.instances = response.json;
                    // archArtifactInstancesList.set(response.json);
                }
            }
        } catch (error) {
            const err = `Can't retrieve instances of an artefact.`;
            errorMsgs.value.push(err);
            // errorMsgs.update((value) => [...value, err]);
            // console.log(`${err}\n${error} `);
        }
    }

    /**
     * Retrieves the meta data of an instance of an artifact.
     * @param archId - id of the architecture
     * @param artifactType - the type of artifact to retrieve
     * @param instanceId - id of the instance of an artifact.
     * @returns nothing, sets a store that holds the information.
     */
    async getArtifactInstanceDetails(
        archId: ArtifactCatalog["_id"],
        artifactType: ArtifactType,
        instanceId: ArtifactInstancesList["_id"]
    ): Promise<ArtifactInstanceElement[] | null> {
        if (archId == null && artifactType == null) {
            console.warn(`Not provided valid arguments`);
            return null;
        }
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            accept: "application/json",
        };
        try {
            const response = await requestUrl({
                url: this.#baseURL + "/api/architectures/" + archId + "/artifacts/instances/" + instanceId + "?artifactType=" + artifactType,
                method: "POST",
                headers,
            });
            if (response.status === 200) {
                // console.log(response.json);
                architecture.elements = (response.json as ArtifactInstanceResponse).coreInfo;
                return response.json.coreInfo;
            } else return null;
        } catch (error) {
            const err = `Can't retrieve the meta data an instance of an artefact.`;
            errorMsgs.value.push(err);
            // errorMsgs.update((value) => [...value, err]);
            // console.log(`${err}\n${error} `);
            return null;
        }
    }

    /**
     * Retrieve the image of an artifact instance.
     * @param archId - id of the architecture
     * @param artifactType - the type of artifact to retrieve
     * @param instanceId - id of the instance of an artifact.
     * @param artifactFormat - the format of the image
     * @returns returns the artifact content as either ArrayBuffer (binary) or a string; null if something went wrong.
     */
    async getArtifactInstanceDiagram(
        archId: ArtifactCatalog["_id"],
        artifactType: ArtifactType,
        instanceId: ArtifactInstancesList["_id"],
        artifactFormat: "png" | "svg"
    ): Promise<string | ArrayBuffer | null> {
        if (archId == null && artifactType == null && instanceId == null && ARTIFACT_WITH_DIAGRAM.includes(artifactType)) {
            errorMsgs.value.push("Requested artifact is not a digram");
            // errorMsgs.update((value) => [...value, "Requested artifact is not a digram"]);
            console.warn(`Not provided valid arguments, or requested artifact is not a diagram`);
            return null;
        }
        const headers: RequestUrlParam["headers"] = {
            Authorization: "token " + this.#personal_token,
            //accept: "application/json",
        };
        try {
            // /instances/systemcontext_4s4urVlsHhb/diagram?artifactType=assetartifact_systemcontext&format=svg
            //console.log(this.baseURL + "/api/architectures/" + archId + "/instances/" + artifactId + "/diagram?artifactType=" + artifactType + "&format=svg");
            const response = await requestUrl({
                url:
                    this.#baseURL +
                    "/api/architectures/" +
                    archId +
                    "/instances/" +
                    instanceId +
                    "/diagram?artifactType=" +
                    artifactType +
                    "&format=" +
                    artifactFormat,
                headers,
            });
            // console.log(response);
            if (response.status === 200) {
                //console.log(response.text);
                if (artifactFormat === "svg") {
                    return response.text;
                } else {
                    return response.arrayBuffer;
                }
            } else return null;
        } catch (error) {
            const err = `Can't retrieve diagram.`;
            errorMsgs.value.push(err);
            // errorMsgs.update((value) => [...value, err]);
            // console.log(`${err}\n${error} `);
            return null;
        }
    }

    /** Filter artifacts that have content.
     * CA returns an array of nested objects that represent all possible artificats.
     * Only artificats that have attribute hasContent:true actually have been created in CA.
     * This method recursively goes through the tree to find the created artifacts.
     * @see: https://stackoverflow.com/questions/61313282/get-an-array-of-objects-that-match-condition-in-nested-object
     * @param data - json response from CA with all objects
     */
    private filterArtifacts(data: ArtifactCatalog[]): ArtifactCatalog[] {
        const findNested = (
            children: ArtifactCatalog[],
            predicate
            //childProp = "child"
        ): ArtifactCatalog[] => {
            const found: ArtifactCatalog[] = [];

            for (const node of children) {
                if (node.child) {
                    found.push(...findNested(node.child, predicate));
                }
                // Typescript can't check node[childProp], so using node.child
                // if (node[childProp]) {
                //     found.push(...findNested(node[childProp], predicate));
                // }

                if (predicate(node)) {
                    found.push(node);
                }
            }

            return found;
        };
        const predicate = (e: ArtifactCatalog) => e.hasContent && e.hasContent === true;
        return findNested(data, predicate);
    }
    /** Clears all data from this class.
     * It does not clear data at the Cognitive Architect service. Use this, for example, if you change the Personal Token. */
    public invalidate() {
        //archList.set(null);
        archList.value = null;
        architecture.info = null;
        // archInfo.set(null); // This causes a TypeError in some circumstances: https://discord.com/channels/686053708261228577/840286264964022302/1237152734415818803
        architecture.artifacts = null;
        // archArtifacts.set(null);
        architecture.selected = SELECT_NONE;
        // selectedArch.set(SELECT_NONE);
    }
    /** Set the personal token to access the Cognitive Architect services.*/
    public setToken(token: string) {
        this.#personal_token = token;
    }
    public setBaseUrl(baseURL: string) {
        this.#baseURL = baseURL;
    }
    /** Utility to check if Personal Token is set */
    public isTokenSet(): boolean {
        return this.#personal_token ? true : false;
    }
    /** Returns a human readable name of the provided artifact type.
     * @param artifactType
     * @returns human readable artifact name.
     */
    public getArtifactName(artifactType: ArtifactType): string {
        switch (artifactType) {
            case "assetartifact_architecture_principles":
                return "Architectural Principles";
            case "assetartifact_architecturedecision":
                return "Architectural Decision";
            case "assetartifact_architectureoverview_aodservice":
                return "Services View";
            case "assetartifact_architectureoverview_itsystem":
                return "IT System View";
            case "assetartifact_architectureoverview_enterprise":
                return "Architecture Overview - Enterprise View";
            case "assetartifact_architectureoverview_usagescenario":
                return "Architecture Overview - Usage Scenario";
            case "assetartifact_assumption":
                return "Assumption";
            case "assetartifact_businesschallenge":
                return "Business Challenge";
            case "assetartifact_componentmodel_dynamicview":
                return "Component Model - Dynamic View";
            case "assetartifact_componentmodel_staticview":
                return "Component Model - Static View";
            case "assetartifact_dependency":
                return "Dependency";
            case "assetartifact_executivesummary":
                return "Executive Summary";
            case "assetartifact_functionalrequirement":
                return "Functional Requirement";
            case "assetartifact_issue":
                return "Issue";
            case "assetartifact_logical_datamodel":
                return "Logical Data Model";
            case "assetartifact_nonfunctionalrequirement":
                return "Non Functional Requirement";
            case "assetartifact_notes":
                return "Notes";
            case "assetartifact_operationalmodel_logicaloperational":
                return "Logical Operational View";
            case "assetartifact_operationalmodel_physicaloperational":
                return "Prescribed Operational View";
            case "assetartifact_risk":
                return "Risk";
            case "assetartifact_systemcontext":
                return "System Context";
            case "assetartifact_usecase_ucdiagram":
                return "Use Case Diagram";
            case "assetartifact_usecase_uctext":
                return "Use Case Text";
            default:
                return "";
        }
    }
}
