import { VERSION } from "svelte/compiler";
import { Platform, Plugin, WorkspaceLeaf } from "obsidian";
import type { CAPluginSettings } from "./CASettings";
import { DEFAULT_SETTINGS, CASettingTab } from "./CASettings";
import { VIEW_TYPE, CAView } from "./CAView";
import { CAArchitecture } from "./lib/ca";

export const CA_ICON_NAME = "monitor-down"; //https://lucide.dev/icons/monitor-down

/**
 * Based on @see starter template: https://github.com/Quorafind/Obsidian-Svelte-Starter
 * At the time of developing this plugin, the documentation on plugin development with
 * Svelte on the Obsidian website doesn't seem to be up to date. The instructions were not
 * working, therefor used starter template above.
 */

export default class CAPlugin extends Plugin {
    public settings: CAPluginSettings = DEFAULT_SETTINGS;
    private ca: CAArchitecture | null = null;

    async onload() {
        // console.log(`Initializing Cognitive Architect plugin (running on svelte version ${VERSION})`);
        await this.loadSettings();
        this.ca = new CAArchitecture(this.settings.baseUrl);
        this.ca.setToken(this.settings.personalToken);

        this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new CAView(leaf, this.ca));

        this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this));

        // Add an icon in the (left) sidebar (ribbon)
        this.addRibbonIcon(CA_ICON_NAME, "Open Cognitive Architect Sync sidepanel", () => {
            this.activateView();
            //this.openMapView(); // This opens in the editor
        });

        // This adds the settings tab
        this.addSettingTab(new CASettingTab(this.app, this));

        // Add command to open view
        this.addCommand({
            id: "open-caview",
            name: "Open Cognitive Architect Sync panel.",
            callback: () => this.activateView(),
        });
    }

    onLayoutReady(): void {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
            this.activateView();
            return;
        }
        this.app.workspace.getRightLeaf(false)?.setViewState({
            type: VIEW_TYPE,
        });
        this.app.workspace.rightSplit.collapsed && this.app.workspace.rightSplit.toggle();
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        this.ca?.invalidate();
        await this.saveData(this.settings);
        if (this.ca) {
            this.ca.setToken(this.settings.personalToken);
            this.ca.setBaseUrl(this.settings.baseUrl);
        }
    }

    async openMapView() {
        const workspace = this.app.workspace;
        workspace.detachLeavesOfType(VIEW_TYPE);
        const leaf = workspace.getLeaf(
            // @ts-ignore
            !Platform.isMobile
        );
        await leaf.setViewState({ type: VIEW_TYPE });
        workspace.revealLeaf(leaf);
    }
    async activateView() {
        if (!this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
            await this.app.workspace.getRightLeaf(false)?.setViewState({
                type: VIEW_TYPE,
                active: true,
            });
        }

        this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]);
    }
}
