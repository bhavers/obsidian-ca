import { App, Modal } from "obsidian";
import CAArchInfoModalComponent from "./CAArchInfoModalComponent.svelte";
import { architecture } from "./lib/states.svelte";
import { mount } from "svelte";

export class CAArchfInfoModal extends Modal {
    private component: ReturnType<typeof CAArchInfoModalComponent> | null = null;
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        // let { contentEl } = this;
        // contentEl.setText("Look at me, I'm a modal!");
        if (architecture.info) {
            this.component = mount(CAArchInfoModalComponent, {
                target: this.contentEl,
                props: {
                    arch: architecture.info,
                    //ca: this.ca,
                    //obsApp: this.app,
                },
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.component = null;
    }
}
