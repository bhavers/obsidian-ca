import { Notice, TFile, type App } from "obsidian";
import type { CAArchitecture } from "./ca";
import { archInfo, selectedArch, SELECT_NONE, type ArtifactType, type ArtifactInstanceElement, type DiagramFormat, ARTIFACT_WITH_DIAGRAM } from "./stores";
import { get } from "svelte/store";
import { errorMsgs } from "./stores";
import type CAPlugin from "src/starterIndex";
import type { CAPluginSettings } from "src/CASettings";

/** Cognitive Architect - Obsidian bridge
 * A class that provides utility functions that bridges between the Cognitive Architect and the Obsidian API
 */
export class CAObsidian {
    private ca: CAArchitecture | null;
    private obsApp: App;
    private fullPathLog = "";
    private readonly templatePropId = "caTemplateModel"; // used to identify a standard Obsidian template
    private readonly templateValueDefault = "default"; // used as fallback to identify an Obsidian template.

    constructor(ca: CAArchitecture | null, obsApp: App) {
        this.ca = ca;
        this.obsApp = obsApp;
        //this.fullPathLog = this.generateFolder() + "/Log.md"; // project directory is not know, this will point to log file in base folder.
    }

    /** Save errors to a log file in markdown format
     * Depends on $errorMsgs store. */
    public async saveLog(title: string) {
        this.fullPathLog = this.generateFolder() + "/Log.md"; // overwrite, probably project directory is known by now.
        if (get(errorMsgs).length === 0) return; // do nothing if there are no errors.
        let file = this.obsApp.vault.getFileByPath(this.fullPathLog);
        try {
            let markdown = `\n# ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date())} ${title}\n`;
            markdown += "```\n";
            for (const error of get(errorMsgs).values()) {
                markdown += error + "\n";
            }
            markdown += "```\n";
            if (file) {
                //await this.obsApp.vault.delete(file);
                this.obsApp.vault.process(file, (data) => {
                    return (data = markdown + data);
                });
            } else {
                //const newFile = await this.obsApp.vault.create(fullPath, markdown);
                file = await this.obsApp.vault.create(this.fullPathLog, markdown);
            }
        } catch (error) {
            //console.log(error);
            //errorMsgs.set([]);
            return null;
        }
        //errorMsgs.set([]);
    }
    /** Opens log file in Obsidian editor */
    public openLog() {
        const file2 = this.obsApp.vault.getAbstractFileByPath(this.fullPathLog);
        if (file2 instanceof TFile) {
            this.obsApp.workspace.openLinkText(this.fullPathLog, "", true);
        } else {
            new Notice("Note not found at the provided path.");
        }
    }

    /** Save a diagram as SVG or PNG image.
     * It will check if the artifact requested can actually have a diagram.
     * @param artifactFormat, the output format of the image.
     * @param selectedArtifactType
     * @param instanceId
     * @param outputFilename - you can pass the filename (without path and extension); otherwise the function will retrieve
     * the metadata to set the filename.
     * @returns the filename of the image (without the extension).
     */
    async saveDiagram(artifactFormat: DiagramFormat, selectedArtifactType: ArtifactType, instanceId: string, outputFilename?: string): Promise<string | null> {
        let fullPath = "";
        // Check if artifact can have a diagram; as the API will take long-time to timeout if a diagram is requested of an artifact that can't have a diagram (like functional req).
        if (selectedArtifactType && ARTIFACT_WITH_DIAGRAM.contains(selectedArtifactType) && instanceId) {
            const res = await this.ca?.getArtifactInstanceDiagram(get(selectedArch), selectedArtifactType, instanceId, artifactFormat);
            if (res && this.obsApp) {
                // Obsidian Vault API: https://docs.obsidian.md/Reference/TypeScript+API/Vault
                if (!outputFilename) {
                    const resElements = await this.ca?.getArtifactInstanceDetails(get(selectedArch), selectedArtifactType, instanceId);
                    if (resElements) {
                        outputFilename = this.generateFilename(resElements[0]);
                    } else {
                        outputFilename = instanceId + "-" + get(selectedArch);
                    }
                    //fullPath = this.generateFolder() + "/" + artifactId + "-" + get(selectedArch) + "." + artifactFormat;
                }
                fullPath = this.generateFolder(true) + "/" + outputFilename + "." + artifactFormat;
                // console.log(fullPath);
                const file = this.obsApp.vault.getFileByPath(fullPath);
                if (file) await this.obsApp.vault.delete(file);
                //const res = await app.vault.create(filename, response.text);
                let resCreate: TFile;
                try {
                    if (artifactFormat === "png") {
                        resCreate = await this.obsApp.vault.createBinary(fullPath, res as ArrayBuffer);
                    } else {
                        // svg
                        resCreate = await this.obsApp.vault.create(fullPath, res as string);
                    }
                    if (resCreate != null) {
                        return resCreate.basename;
                        //return filename;
                    } else {
                        console.warn("Couldn't create file");
                        return null;
                    }
                } catch (error) {
                    //console.log(error + " " + fullPath);
                    return null;
                }
            }
        }
        return null;
    }
    /** Saves the elements of multiple instances to an Obsidian note.
     * The saving will happen sequentially otherwise there will be race conditions.
     * @param instances - an array of elements (typically multiple results of @function retrieveInstanceElements)
     */
    async saveElements(instances: ArtifactInstanceElement[][]) {
        if (!this.obsApp || !instances) return;
        for (const instance of instances) {
            const allElements = instance.filter((element) => element.modelType != "GenericGroup"); // All elements, except some useless ones.
            let diagramFile: string | null = null;

            if (Object.hasOwn(allElements[allElements.length - 1], "diagramFile")) {
                diagramFile = allElements[allElements.length - 1].diagramFile;
                allElements.pop();
            }

            let counter = 0;
            for (const element of allElements) {
                let markdown = "";
                if (counter == 0) {
                    // Use standard Obsidian template to provide markdown
                    const files = this.getFilesWithProperties("caTemplateModel", element.modelType);
                    if (files.length > 0) {
                        markdown = await this.obsApp.vault.read(files[0]);
                    }
                    // Otherwise write hardcoded markdown
                    if (markdown === "") {
                        if (diagramFile) markdown = `# Diagram\n![[${diagramFile}]]\n`;
                        const inArtifact = instance.filter((element) => element.owned != "-1"); // All elements that are used in the artifact.
                        markdown += this.generateMarkdown(inArtifact);
                    }
                }

                const folder = this.generateFolder(false, element);
                const filename = folder + "/" + this.generateFilename(element) + ".md";
                let file = this.obsApp.vault.getFileByPath(filename);

                try {
                    if (file === null) {
                        //console.log("created: " + filename, file);
                        file = await this.obsApp.vault.create(filename, markdown);
                        await this.obsApp.fileManager.processFrontMatter(file, (frontmatter) => {
                            delete frontmatter[this.templatePropId]; // // Remove property, should only be in the template.
                            const { _id: id, ...rest } = element; // rename key _id to id, easier to use in Obsidian
                            const updatedElement = { id, ...rest };
                            Object.assign(frontmatter, updatedElement);
                            frontmatter.architectureId = get(selectedArch);
                            if (element.owned != "-1" && counter !== 0) {
                                frontmatter.ownedByInstanceId = [allElements[0]._id];
                            } else delete frontmatter.owned;
                        });
                    } else {
                        await this.obsApp.fileManager.processFrontMatter(file, (frontmatter) => {
                            // owned -1 means "not used in this artifact"
                            if (element.owned != "-1" && counter !== 0) {
                                // also check for duplicated instanceIds (when saved multiple times)
                                if (!Object.hasOwn(frontmatter, "ownedByInstanceId")) {
                                    frontmatter.ownedByInstanceId = [allElements[0]._id];
                                } else if (!frontmatter.ownedByInstanceId.contains(allElements[0]._id)) {
                                    frontmatter.ownedByInstanceId = [...frontmatter.ownedByInstanceId, allElements[0]._id];
                                }
                                // Add a property for use with Excalibrain (still have to research if above property could be reused).
                                // Currently the code below doesn't add the first parent for some reason (eg see Crew actor)
                                // if (!Object.hasOwn(frontmatter, "parent")) {
                                //     frontmatter.parent = ["[[" + allElements[0]._id + "]]"]; // extra, for easy use with ExcaliBrain plugin
                                // } else if (!frontmatter.parent.contains("[[" + allElements[0]._id + "]]")) {
                                //     frontmatter.parent = [...frontmatter.parent, "[[" + allElements[0]._id + "]]"]; // extra
                                // }
                            }
                        });
                    }
                } catch (error) {
                    const err = `${error}`;
                    errorMsgs.update((value) => [...value, err + " " + filename]);
                    //console.log(error, filename, file);
                }
                counter++;
            }
        }
    }
    /** Retrieve the elements of the instance of an artifact.
     * This is separated from saving to disk, because this function can run in parallel
     * Than sequentially write all instance elements to disk (because that can not be done in parallel)
     * It will save the diagram and metadata.
     * @param selectedArtifactType
     * @param instanceId
     * @param overWrite - overwrites the file if it exists, otherwise updates the file
     * @returns all the elements of the requested artifact instance. It adds a property 'diagramFile' with the location of a (optional) diagram.
     */
    async retrieveInstanceElements(
        selectedArtifactType: ArtifactType,
        instanceId: string,
        overWrite: boolean = true
    ): Promise<ArtifactInstanceElement[] | null> {
        // console.log(`saveArtifact: ${selectedArtifactType} and ${instanceId}`);

        if (get(selectedArch) !== SELECT_NONE && instanceId) {
            // Get meta data on artifact and all of the elements associated with it.
            const resElements = await this.ca?.getArtifactInstanceDetails(get(selectedArch), selectedArtifactType, instanceId);
            const diagramFormat: DiagramFormat = "svg";
            if (resElements && this.obsApp) {
                // Save the diagram if there is one associated with this artifact
                const diagramFileName = await this.saveDiagram(diagramFormat, selectedArtifactType, instanceId, this.generateFilename(resElements[0]));
                //if (diagramFileName) Object.defineProperty(resElements, "diagramFile", diagramFileName); // add a property with the filename of the diagram.
                if (diagramFileName) resElements.push({ diagramFile: diagramFileName + "." + diagramFormat }); // add a property with the filename of the diagram.
                return resElements;
            }
        } else {
            //console.log("No architecture and/or artifact selected.");
        }
        return null;
    }

    private generateMarkdown(elements: ArtifactInstanceElement[]): string {
        let markdown = "\n# Elements in this artifact\n";
        markdown += `Functional requirements associated with this artifact\n
\`\`\`dataview
TABLE without ID link(file.link, label) as Name, modelType as Model, type as Type, description as Description
WHERE contains(architectureId,this.architectureId)
WHERE contains(ownedByInstanceId, this.id)
SORT modelType ASC\n
\`\`\`\n\n
`;

        return markdown;
    }

    /** Generates the path of the folder to store stuff, and creates the folder.
     * @param diagram - if true checks Settings for a diagrams subfolder, ands adds this to the path.
     * @param res (optional) - response from API to extract the folder for the artifact (not needed for saving images)
     * @returns path of folder - without a path divider ('/' or '\') at the end.
     */
    private generateFolder(diagram = false, res?: ArtifactInstanceElement): string {
        let folder = "";
        // Get the base import folder from settings.
        folder = this.getSetting("baseFolder") as string;
        // Add folder with Architecture Name (unique in CA), and optionally the architecture identifier to  make it more unique (not necessary))
        if (get(archInfo)?.name) folder = folder + "/" + get(archInfo)?.name;
        if (this.getSetting("addIdentifierToFolder")) folder = folder + " - " + get(selectedArch);

        // Add the Diagrams sub-folder (optionally)
        if (diagram && this.getSetting("diagramsFolder")) folder = folder + "/" + this.getSetting("diagramsFolder");

        if (res) {
            // Instances of type RACI, Sizing and Notes will all be placed in folder Notes; see CAArchitecture.getArtifactInstanceSummary.
            // Too complex to solve, because that folder name is not maintained in CAViewComponent. For some other time.
            if (res.modelType) folder = folder + "/" + res.modelType;
        }
        if (this.obsApp.vault.getFolderByPath(folder) === null) {
            try {
                this.obsApp.vault.createFolder(folder);
            } catch (error) {
                // console.log("Couldn't create folder: " + error);
            }
        }
        return folder;
    }
    /** Create a filename for an artifact or model element.
     * @param res - the Response from the API call the retrieve artifact instance meta data.
     * @returns filename - without path and extension.
     */
    private generateFilename(res: ArtifactInstanceElement): string {
        let filename = "";
        if (res) {
            if (res.modelType == "FunctionalRequirement") filename += res.fr_id + " ";
            if (res.modelType == "NonFunctionalRequirement") filename += res.nfr_id + " ";
            //if (res.modelType == "RelationshipConnection") filename += res._id + " ";
            //if (res.modelType == "Implementation") filename += res._id + " ";
            if (res.label) {
                filename += res.label //
                    .replace(/&[^;]+;/g, "") // remove all & html entities, like &amp;
                    .replace(/<\/?[^>]+(>|$)/g, "") // strip HTML elements
                    .replace(/[^a-zA-Z0-9 ()_\\-\\.]/g, ""); // strip everything except alphanumeric characters, space, underscore, dash and period.
                filename += "_" + res._id.match(/[^_]+$/); // make each file unique (take the identified after the last _).
                if (filename.startsWith(".")) filename = filename.substring(1); // strip period as the first character (otherwise becomes a hidden file on *nix.)
            } else filename = filename + res.modelType;
        }
        return filename;
    }

    /** Returns the handle to this plugin */
    getSetting<K extends keyof CAPluginSettings>(key: K): string | boolean {
        const plugin = this.obsApp.plugins.getPlugin("ca-sync") as CAPlugin;
        return plugin.settings[key];
    }

    /** Search for a property in all files in the vault.
     * When you provide a value, it will only return the file in which the prop matches that value OR when the prop matches "default" (as a fallback scenario).
     * When you do not provide a value, it will return all files in which that property exists.
     * @returns Tfile[] - array of TFile object that match the property and optional values
     * @example getFileWithProperties("caTemplateMode", "SystemContext")
     */
    getFilesWithProperties(prop: string, value?: string): TFile[] {
        const files: TFile[] = [];

        const allFiles = this.obsApp.vault.getFiles();
        // console.log(this.obsApp.metadataCache.metadataCache); // potentially using metadataCache is faster, use getFirstLinkpathDest to get handle to the file.

        for (const file of allFiles) {
            const metadata = this.obsApp.metadataCache.getFileCache(file);

            if (metadata && metadata.frontmatter && Object.hasOwn(metadata.frontmatter, prop)) {
                if (value) {
                    if (metadata.frontmatter[prop] === value) files.push(file);
                    if (metadata.frontmatter[prop] === this.templateValueDefault) files.push(file); // fallback to default
                } else files.push(file);
            }
        }

        return files;
    }
}
