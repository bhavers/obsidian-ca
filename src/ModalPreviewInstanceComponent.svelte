<script lang="ts">
    import { type ArtifactInstanceElement } from "./lib/stores.svelte";

    export let responseDiagram: string | ArrayBuffer | null | undefined;
    export let responseElements: ArtifactInstanceElement[] = [];

    function getDiagram() {
        if (responseDiagram) {
            // Step 1: Convert the ArrayBuffer to a Blob
            const blob = new Blob([responseDiagram], { type: "image/svg+xml" });
            // Step 2: Create a URL for the Blob
            const url = URL.createObjectURL(blob);
            return url;
        }
    }
</script>

<h3>Preview</h3>
<!-- svelte-ignore a11y-missing-attribute -->
<img src={getDiagram()} class="img_preview" />

<h5>Elements in this artifact</h5>
<table class="vertical-">
    <thead>
        <tr><th>Element</th><th>Label</th><th>description</th></tr>
    </thead>
    <tbody>
        {#each responseElements as element}
            {#if element.owned != "-1"}
                <tr>
                    <td>{element.modelType} {element.type ? "(" + element.type + ")" : ""}</td>
                    <td>{element.label}</td>
                    <td>{element.description}</td>
                </tr>
            {/if}
        {/each}
    </tbody>
</table>

<style>
    table {
        text-align: left;
        position: relative;
        border-collapse: collapse;
        background-color: #f6f6f6;
    } /* Spacing */
    td,
    th {
        vertical-align: top;
        border: 1px solid #999;
        padding: 20px;
    }
    th {
        background: grey;
        color: white;
        border-radius: 0;
        position: sticky;
        top: 0;
        padding: 10px;
    }
    .img_preview {
        max-height: 400px; /** results in horizontal scrolling */
        /* max-width: 500px; */
    }
</style>
