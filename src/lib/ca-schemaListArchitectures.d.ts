/**
 * This Typescript definition is generated from JSON returned by the Cognitive Architect API to list (private) architectures.
 * The API to list all (private) architectures associated with a personal token is undocumented.
 * API endpoint (only PUT method): /api/aggregatesvc/WorkspaceFacadeAPIs/owned/architectures?status=Pending
 * This is an undocumented interface
 * @see https://transform.tools/json-to-typescript
 */

export interface Root {
    totalNum: number;
    data: ArchitecturesList[];
    filter: Filter;
}

export interface ArchitecturesList {
    _id: string;
    numOfCopied: string;
    rankValue: string;
    name: string;
    type: string;
    status: string;
    isAsIs: boolean;
    isDiscoverable: boolean;
    archVisibility?: string;
    created: string;
    lastModified: string;
    tag: Tag[];
    industry: Industry[];
    technology: Technology[];
    technicalCapability: TechnicalCapability[];
    businessCapability: any[];
    client: Client[];
    taxonomies: string[];
    implementations: string[];
    capabilities: string[];
    template: Template;
    executiveSummary: string;
    includedArtifacts: IncludedArtifact[];
    team: Team;
}

export interface Tag {
    name: string;
    _id: string;
}

export interface Industry {
    name: string;
    _id: string;
}

export interface Technology {
    name: string;
    _id: string;
}

export interface TechnicalCapability {
    name: string;
    _id: string;
}

export interface Client {
    name: string;
    _id: string;
}

export interface Template {
    name: string;
    description: string;
    _id: string;
    isGlobalDefaultTemplate: boolean;
}

export interface IncludedArtifact {
    globalTOCPosition: string;
    typeId: string;
    _id: string;
    artifactTypeId: string;
    type: string;
}

export interface Team {
    _id: string;
    owner: Owner;
    adminMembers: AdminMember[];
    viewMembers: ViewMember[];
    editMembers: EditMember[];
}

export interface Owner {
    _id: string;
    fullname: string;
    jobResponsibilities: string;
    avatar: string;
}

export interface AdminMember {
    _id: string;
    fullname: string;
    jobResponsibilities: string;
    avatar: string;
}

export interface ViewMember {
    _id: string;
    fullname: string;
    jobResponsibilities: string;
    avatar: string;
}

export interface EditMember {
    _id: string;
    fullname: string;
    jobResponsibilities: string;
    avatar: string;
}

export interface Filter {
    tags: Tag2[];
    clients: Client2[];
}

export interface Tag2 {
    name: string;
    _id: string;
}

export interface Client2 {
    name: string;
    _id: string;
    userId: string;
}
