import { App, Modal } from "obsidian";
import ModalPreviewInstanceComponent from "./ModalPreviewInstanceComponent.svelte";
import type { ArtifactInstanceElement } from "./lib/stores";

export class ModalPreviewInstance extends Modal {
    #component: ModalPreviewInstanceComponent | null = null;
    resDiagram: string | ArrayBuffer | null | undefined = null;
    resElements: ArtifactInstanceElement[];
    constructor(app: App, resDiagram: string | ArrayBuffer | null | undefined, resElements: ArtifactInstanceElement[]) {
        super(app);
        this.resDiagram = resDiagram;
        this.resElements = resElements;
    }

    onOpen() {
        this.#component = new ModalPreviewInstanceComponent({
            target: this.contentEl,
            props: {
                responseDiagram: this.resDiagram,
                responseElements: this.resElements,
                // obsApp: this.app,
            },
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.#component = null;
    }
}
