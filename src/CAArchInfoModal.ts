import { App, Modal } from "obsidian";
import CAArchInfoModalComponent from "./CAArchInfoModalComponent.svelte";
import { archInfo } from "./lib/stores";
import { get } from "svelte/store";

export class CAArchfInfoModal extends Modal {
    private component: CAArchInfoModalComponent | null = null;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        // let { contentEl } = this;
        // contentEl.setText("Look at me, I'm a modal!");
        this.component = new CAArchInfoModalComponent({
            target: this.contentEl,
            props: {
                arch: get(archInfo),
                //ca: this.ca,
                //obsApp: this.app,
            },
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.component = null;
    }
}
