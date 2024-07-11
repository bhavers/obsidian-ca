import { ItemView, WorkspaceLeaf } from "obsidian";
import CAViewComponent from "./CAViewComponent.svelte";
import { CAArchitecture } from "./lib/ca";
import { CA_ICON_NAME } from "./starterIndex";

export const VIEW_TYPE = "ca-view";

export class CAView extends ItemView {
    private component: CAViewComponent | null = null;
    private ca: CAArchitecture | null = null;

    constructor(leaf: WorkspaceLeaf, ca: CAArchitecture | null) {
        super(leaf);
        this.ca = ca;
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Cognitive Architect Sync";
    }

    getIcon(): string {
        return CA_ICON_NAME;
    }

    async onOpen(): Promise<void> {
        this.component = new CAViewComponent({
            target: this.contentEl,
            props: {
                ca: this.ca,
                obsApp: this.app,
            },
        });
    }
}
