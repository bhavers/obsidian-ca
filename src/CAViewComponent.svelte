<script lang="ts">
    import { type App } from "obsidian";
    import type { CAArchitecture } from "./lib/ca";
    import Png from "carbon-icons-svelte/lib/Png.svelte";
    import Svg from "carbon-icons-svelte/lib/Svg.svelte";
    import View from "carbon-icons-svelte/lib/View.svelte";
    import DocumentDownload from "carbon-icons-svelte/lib/DocumentDownload.svelte";
    import { RefreshCw, Settings, Info, Download, CircleX } from "lucide-svelte";
    import {
        archList,
        archInfo,
        archArtifacts,
        selectedArch,
        SELECT_NONE,
        type ArtifactType,
        archArtifactInstancesList,
        type ArtifactInstanceElement,
    } from "./lib/stores";
    import { CAArchfInfoModal } from "./CAArchInfoModal";
    import { ModalPreviewInstance } from "./ModalPreviewInstance";
    import { CAObsidian } from "./lib/ca-obsidian";
    import { progress } from "./lib/stores";
    import { errorMsgs } from "./lib/stores";
    import { Progress } from "./lib/progress";

    export let ca: CAArchitecture | null;
    export let obsApp: App;
    const caObsidian = new CAObsidian(ca, obsApp);
    let selectedArtifactId: string | null;
    let selectedArtifactType: ArtifactType | null;
    let selectedInstanceId: string | null; // Only this is unique (artifacts like RACI, Sizing and Notes are of type Notes; but have a unique id)

    let loadEl: HTMLDivElement;
    $: if (loadEl && $progress == 0) loadEl.style.display = "none";
    else if (loadEl && $progress >= 1)
        setTimeout(() => {
            loadEl.style.display = "none";
            progress.set(0, { duration: 0 });
        }, 600);
    else if (loadEl) loadEl.style.display = "block";

    // Show error message and close manually.
    let errorEl: HTMLDivElement;
    $: if (errorEl && $errorMsgs[0]) {
        errorEl.style.display = "grid";
    } else {
        if (errorEl) errorEl.style.display = "none";
    }
    function closeError() {
        errorEl.style.display = "none";
        $errorMsgs = [];
    }

    /** Invalidate the state of selections to defaults */
    function invalidateSelections(artifacts: boolean = true, instances: boolean = false) {
        $errorMsgs = [];
        if (artifacts) {
            selectedArtifactId = null;
            selectedArtifactType = null;
        }
        if (instances) {
            selectedInstanceId = null;
        }
    }
    /** Refresh list of architectures */
    async function getListArchitectures() {
        progress.set(0.4);
        ca?.invalidate();
        invalidateSelections(true, true);
        if (
            !(await ca?.getArchitecturesList(
                caObsidian.getSetting("retrievePrivateArchitectures") as boolean,
                caObsidian.getSetting("retrieveCollaborationArchitectures") as boolean,
            ))
        ) {
            if ($errorMsgs) {
                $errorMsgs[$errorMsgs.length] = "Cannot retrieve architectures (no connection or VPN? Wrong base Url?)";
            }
        }
        progress.set(1);
    }

    /** Retrieve a list of artifacts of the selected architecture. Results stored in a store */
    async function getListArtifacts() {
        invalidateSelections(true, true);
        let value = 0.3;
        progress.set(0.3);
        await ca?.getArchitectureInfo($selectedArch);
        progress.set(0.7);
        await ca?.getArtifactCatalog($selectedArch);
        progress.set(1);
    }

    /** Retrieves all instances of an artifact, including all details
     * @param artifactType - type of artifact, should conform to ArtifactInstance type (but easier to work with as string from on:click handler)
     * @param artifactId - id of artifact
     * @param selectArtifact - set the artifact to be selected (when downloading multiple artifacts you don't want it to be set)
     */
    async function getListInstances(artifactType: string | undefined, artifactId: string, selectArtifact = true) {
        // console.log(`getArtifactInstanceSummary() | ${artifactType} | ${artifactId}`);
        if (artifactType && artifactId) {
            progress.set(0.4);
            invalidateSelections(true, true);
            await ca?.getArtifactInstanceSummary($selectedArch, artifactType as ArtifactType, artifactId);
            progress.set(0.6, { duration: 0 });

            if (selectArtifact) {
                // only set selected artifact if explicitely selected through gui (not on download all)
                selectedArtifactType = artifactType as ArtifactType; // set the selected artifactType
                selectedArtifactId = artifactId; // set the selected artifactId
                if ($archArtifactInstancesList) {
                    selectedInstanceId = $archArtifactInstancesList[0]._id; // Make the first instance selected by default.
                }
            }
        }
        progress.set(1); // set to complete in case of errors
    }

    /** Save diagram of an artifact to the current folder */
    function saveDiagram(artifactFormat: "svg" | "png") {
        progress.set(0.4);
        // console.log(`saveArtifactDiagram() | selArtifact ${selectedArtifactId} | selInstance: ${selectedInstanceId}`);
        if (selectedArtifactType && selectedInstanceId) caObsidian.saveDiagram(artifactFormat, selectedArtifactType, selectedInstanceId);
        //else console.log("Not saving diagram, missing arguments.");
        caObsidian.saveLog("Save diagram");
        progress.set(1);
    }
    /** Save an instance of an artifact (diagram and metadata)*/
    async function saveInstance() {
        progress.set(0.4);
        // console.log(`saveArtifact() | selArtifact ${selectedArtifactId} | selInstance: ${selectedInstanceId}`);
        if (selectedArtifactType && selectedInstanceId) {
            const results = await caObsidian.retrieveInstanceElements(selectedArtifactType, selectedInstanceId);
            if (results) caObsidian.saveElements([results]);

            // caObsidian.saveInstance(selectedArtifactType, selectedInstanceId);
        } //else console.log("Not saving artifact, missing arguments.");
        caObsidian.saveLog("Save artifact");
        progress.set(1);
    }
    /** Save all artifacts (and its instances) of the selected architecture */
    async function saveAll() {
        progress.set(0.1);
        await ca?.getArtifactCatalog($selectedArch);
        if ($archArtifacts != null) {
            const progressArtifact = new Progress(0.2, 1, $archArtifacts.length);
            progress.set(progressArtifact.actual);
            for (const [i, artifact] of $archArtifacts.entries()) {
                await ca?.getArtifactInstanceSummary($selectedArch, artifact.artifactType as ArtifactType, artifact._id);
                progress.set(progressArtifact.next);
                if (artifact.artifactType !== undefined && $archArtifactInstancesList !== null) {
                    // Download instances in parallel, see Promise.allSettled @see: https://www.youtube.com/watch?v=f2Z1v3cqgDI
                    const progressInstances = new Progress(
                        progressArtifact.actual,
                        progressArtifact.actual + progressArtifact.step,
                        $archArtifactInstancesList.length,
                    );
                    const t0 = performance.now();

                    const promises = $archArtifactInstancesList.map((instance) => {
                        progress.set(progressInstances.next);
                        return caObsidian.retrieveInstanceElements(artifact.artifactType as ArtifactType, instance._id, false);
                    });
                    const results = await Promise.allSettled(promises);
                    const instances: ArtifactInstanceElement[][] = [];
                    results.forEach((result, index) => {
                        if (result.status === "fulfilled") {
                            if (result.value !== null) instances.push(result.value);
                        } else if (result.status === "rejected") {
                            console.error(`Fetch ${index} failed with error:`, result.reason);
                        }
                    });
                    await caObsidian.saveElements(instances);
                    const totalTime = (performance.now() - t0) / 1000; // secs
                    //console.log(`Downloading ${artifact.artifactType} (${$archArtifactInstancesList.length} instances) took ${totalTime.toFixed(1)} sec.`);
                }
            }
        }
        caObsidian.saveLog("Save all");
        progress.set(1);
    }

    /** Go to the Settings modal of the plugin */
    function gotoSettings() {
        obsApp.setting.open();
        obsApp.setting.openTabById("ca-sync"); // find it with .lastTabId (this is the id in manifest.json)
    }
    function openLog() {
        caObsidian.openLog();
    }
    /** Open Modal with information about the architecture. */
    function showArchitectureInfo() {
        new CAArchfInfoModal(obsApp).open();
    }

    /** Opens modal to preview artifact (diagram and meta data) */
    async function previewInstance() {
        if (selectedArtifactType && selectedInstanceId) {
            const resDiagram = await ca?.getArtifactInstanceDiagram($selectedArch, selectedArtifactType, selectedInstanceId, "svg");
            const resElements = await ca?.getArtifactInstanceDetails($selectedArch, selectedArtifactType, selectedInstanceId);
            if (resDiagram && resElements && obsApp) {
                new ModalPreviewInstance(obsApp, resDiagram, resElements).open();
            }
        }
    }
</script>

<div>
    {#key $selectedArch}
        <!-- classes borrowed from built-in Obsidian Backlinks views -->
        <div class="nav-header">
            <div class="nav-buttons-container">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div on:click={getListArchitectures} aria-label="Refresh architecture information...">
                    <RefreshCw id="ca-refresh-btn" size="30" class="clickable-icon nav-action-button" />
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div on:click={gotoSettings} aria-label="Settings for this plugin.">
                    <Settings size="30" class="clickable-icon nav-action-button" />
                </div>
                {#if $selectedArch !== SELECT_NONE}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div on:click={showArchitectureInfo} aria-label="Information on selected architecture.">
                        <Info size="30" class="clickable-icon nav-action-button" />
                    </div>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div on:click={saveAll} aria-label="Save all architecture artifacts.">
                        <Download size="30" class="clickable-icon nav-action-button" />
                    </div>
                {/if}
            </div>
        </div>
    {/key}
    <div bind:this={loadEl} id="loading">
        Loading
        <progress value={$progress}></progress>
    </div>
    <div bind:this={errorEl} id="error-container">
        <div id="error-text">
            {#if $errorMsgs.length > 1}
                {$errorMsgs.length} errors
            {:else}
                Error
            {/if}
        </div>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div id="error-icon" on:click={closeError}>
            <CircleX size="26" color="red" class="clickable-icon nav-action-button" />
        </div>
        <div id="error-msg">
            {#if $errorMsgs.length > 1}
                <!-- svelte-ignore a11y-invalid-attribute -->
                <a href="#" on:click={openLog}>Open logfile...</a>
            {:else}
                {$errorMsgs[0]}
            {/if}
        </div>
    </div>
    {#key $archList}
        <div class="arch_information">
            {#if $archList}
                <div class="item_label">
                    <label for="arch_name">
                        My Architectures
                        {#if $archList !== null && $archList !== undefined}
                            ({$archList.length})
                        {:else}
                            (0)
                        {/if}
                    </label>
                </div>
                <div class="item_value">
                    <select name="arch_name" id="arch_names" bind:value={$selectedArch} on:change={() => getListArtifacts()}>
                        {#if $selectedArch === SELECT_NONE}
                            <option selected disabled value="none">None selected</option>
                        {:else}
                            <option disabled value="none">None selected</option>
                        {/if}
                        {#if $archList !== null && $archList !== undefined}
                            {#each $archList as architecture}
                                <option value={architecture._id}>{architecture.name}</option>
                            {/each}
                        {/if}
                    </select>
                </div>
            {:else if ca?.isTokenSet()}
                Hit Refresh to load architectures
            {/if}
            {#if $archInfo}
                <div class="item_value">{$archInfo.clientName}</div>
                <div class="item_value" style="font-size: smaller;">Updated {$archInfo.lastModified}</div>

                <h5>Artifacts</h5>
                <ul>
                    <!-- {#key selectedArtifactId} -->
                    {#if $archArtifacts != null}
                        {#each $archArtifacts as artifact}
                            <li>
                                {#if artifact._id === selectedArtifactId}
                                    <div style="font-weight:500">{artifact.displayName}</div>
                                {:else}
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a href="#" on:click={() => getListInstances(artifact.artifactType, artifact._id)}>{artifact.displayName}</a>
                                {/if}
                            </li>
                        {/each}
                    {/if}
                    <!-- {/key} -->
                </ul>

                <!-- List the instances of the selected artifact -->
                {#if selectedArtifactType && $archArtifactInstancesList != null}
                    <!-- {#key selectedArtifactId} -->
                    {#if $archArtifactInstancesList.length > 1}
                        <h6>Instances (1 of {$archArtifactInstancesList.length})</h6>
                        <select class="item_value" name="arch_artifact_instances" id="arch_artifact_instances" bind:value={selectedInstanceId}>
                            <option value="" disabled selected>Select instance</option>
                            {#each $archArtifactInstancesList as artifactInstance}
                                <option value={artifactInstance._id}>{artifactInstance.name}</option>
                            {/each}
                        </select><br />
                    {:else}
                        <h6>Instance</h6>
                        <div style="padding-left: 1rem">
                            {#if $archArtifactInstancesList[0].name}
                                {$archArtifactInstancesList[0].name}
                            {:else}
                                {ca?.getArtifactName(selectedArtifactType)}
                            {/if}
                        </div>
                    {/if}
                    <!-- {/key} -->
                    <div class="buttons-container">
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={previewInstance} aria-label="Preview artifact">
                            <View size={32} class="clickable-icon nav-action-button" />
                            <!-- <a href="#" on:click={previewInstance()} aria-label="Preview artifact">Preview</a> | -->
                        </div>
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => saveDiagram("svg")} aria-label="Save as vector image (.svg)">
                            <Svg size={32} class="clickable-icon nav-action-button" />
                            <!-- <a href="#" on:click={saveArtifactInstance("svg")} aria-label="Save as vector image (.svg)">svg</a> | -->
                        </div>
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => saveDiagram("png")} aria-label="Save as bitmap image (.png)">
                            <Png size={32} class="clickable-icon nav-action-button" />
                            <!-- <a href="#" on:click={saveArtifactInstance("png")} aria-label="Save as bitmap image (.png)">png</a> -->
                        </div>
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => saveInstance()} aria-label="Save this artifact (diagram and elements).">
                            <DocumentDownload size={32} class="clickable-icon nav-action-button" />
                        </div>
                    </div>
                {/if}
            {/if}
        </div>
    {/key}
    {#if !ca?.isTokenSet()}
        <h5>Setup</h5>
        Provide your Personal Token in settings, to access the Cognitive Architect services.
    {/if}
</div>

<style>
    :global(.workspace-leaf-content[data-type="ca-view"] .view-content) {
        padding: 0;
        padding-left: 5px;
        padding-right: 5px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    #loading {
        width: 100%;
    }
    div#error-container {
        /* display: grid !important; */
        display: none; /* will be toggled to grid with js */
        grid-template-columns: 1fr 30px;
        grid-template-rows: auto;
        grid-template-areas:
            "text icon"
            "msg  msg";
        border: 1px solid lightslategray;
        padding: 3px;
        margin-bottom: 1rem;
        margin-top: 1rem;
    }
    #error-text {
        grid-area: text;
        color: red;
    }
    #error-icon {
        grid-area: icon;
        align-items: end;
    }
    #error-msg {
        grid-area: msg;
    }
    .arch_information {
        display: flexbox;
    }
    .item_label {
        padding-top: 3px;
        padding-bottom: 5px;
    }
    .item_value {
        /* padding-left: 20px; */
        padding-top: 5px;
        margin-left: auto;
        width: 100%;
    }
    .buttons-container {
        margin-top: 0.4rem;
        display: flex;
        justify-content: center;
        column-gap: 8px;
    }
</style>
