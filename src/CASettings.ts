import { App, PluginSettingTab, Setting } from "obsidian";
import CAPlugin from "./starterIndex";
import { CAView, VIEW_TYPE } from "./CAView";

export interface CAPluginSettings {
    baseUrl: string;
    personalToken: string;
    baseFolder: string;
    diagramsFolder: string;
    addIdentifierToFolder: boolean;
    retrievePrivateArchitectures: boolean;
    retrieveCollaborationArchitectures: boolean;
}

export const DEFAULT_SETTINGS: CAPluginSettings = {
    baseUrl: "",
    personalToken: "",
    baseFolder: "CA Import",
    diagramsFolder: "Diagrams",
    addIdentifierToFolder: false,
    retrievePrivateArchitectures: true,
    retrieveCollaborationArchitectures: false,
};

export class CASettingTab extends PluginSettingTab {
    plugin: CAPlugin;

    constructor(app: App, plugin: CAPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        //console.log(this.app.setting.lastTabId);

        containerEl.empty();

        new Setting(containerEl).setName("General").setHeading();

        new Setting(containerEl)
            .setName("Artifacts import folder")
            .setDesc("Folder to save imported Cognitive Architect artifacts to (relative to Vaults root folder)")
            .addText((text) =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.baseFolder)
                    .onChange(async (value) => {
                        // remove starting or trailing path dividers; causes errors down the road.
                        if (value.startsWith("/") || value.startsWith("\\")) value = value.substring(1);
                        if (value.endsWith("/") || value.endsWith("\\")) value = value.substring(0, value.length - 1);
                        this.plugin.settings.baseFolder = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
                            if (leaf.view instanceof CAView) {
                                // @ts-ignore       Undocumented rebuildView function, see https://forum.obsidian.md/t/creating-command-to-reload-page/57906
                                leaf.rebuildView(); // reload the CA view
                            }
                        });
                    })
            );
        new Setting(containerEl)
            .setName("Diagrams subfolder")
            .setDesc(
                "Add all diagrams (.svg or .png files) to a subfolder of the import folder. \
                 Leave empty to include in Artificats Import Folder."
            )
            .addText((text) =>
                text
                    .setPlaceholder("Enter path")
                    .setValue(this.plugin.settings.diagramsFolder)
                    .onChange(async (value) => {
                        // remove starting or trailing path dividers; causes errors down the road.
                        if (value.startsWith("/") || value.startsWith("\\")) value = value.substring(1);
                        if (value.endsWith("/") || value.endsWith("\\")) value = value.substring(0, value.length - 1);
                        this.plugin.settings.baseFolder = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
                            if (leaf.view instanceof CAView) {
                                // @ts-ignore       Undocumented rebuildView function, see https://forum.obsidian.md/t/creating-command-to-reload-page/57906
                                leaf.rebuildView(); // reload the CA view
                            }
                        });
                    })
            );
        new Setting(containerEl)
            .setName("Private architectures")
            .setDesc("Include your private architectures")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.retrievePrivateArchitectures).onChange(async (value) => {
                    this.plugin.settings.retrievePrivateArchitectures = value;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName("Collaboration architectures")
            .setDesc("Include your collaboration architectures")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.retrieveCollaborationArchitectures).onChange(async (value) => {
                    this.plugin.settings.retrieveCollaborationArchitectures = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl).setName("Remote service").setHeading();

        new Setting(containerEl)
            .setName("Base URL")
            .setDesc("The base url for the Cognitive Architect / IT Architect Assistant service (something like https://.../)")
            .addText((text) =>
                text
                    .setPlaceholder("Enter url like https://...")
                    .setValue(this.plugin.settings.baseUrl)
                    .onChange(async (value) => {
                        if (value.endsWith("/")) value = value.substring(0, value.length - 1);
                        this.plugin.settings.baseUrl = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
                            if (leaf.view instanceof CAView) {
                                // @ts-ignore       Undocumented rebuildView function, see https://forum.obsidian.md/t/creating-command-to-reload-page/57906
                                leaf.rebuildView(); // reload the CA view
                            }
                        });
                    })
            );
        new Setting(containerEl)
            .setName("Personal token")
            .setDesc("Request a personal token at cogarch@us.ibm.com")
            .addText((text) =>
                text
                    .setPlaceholder("Enter Personal Token")
                    .setValue(this.plugin.settings.personalToken)
                    .onChange(async (value) => {
                        this.plugin.settings.personalToken = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
                            if (leaf.view instanceof CAView) {
                                // @ts-ignore       Undocumented rebuildView function, see https://forum.obsidian.md/t/creating-command-to-reload-page/57906
                                leaf.rebuildView(); // reload the CA view
                            }
                        });
                    })
            );

        new Setting(containerEl).setName("Extra").setHeading();

        new Setting(containerEl)
            .setName("Add identifier to project folder")
            .setDesc(
                "Add an identifier to the architecture folder to make the folder more unique. \
                Should not be necessary as names are unique in Cognitive Architect."
            )
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.addIdentifierToFolder).onChange(async (value) => {
                    this.plugin.settings.addIdentifierToFolder = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}
