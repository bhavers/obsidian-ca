<script lang="ts">
    export let arch;

    type Member = { fullname: string; jobResponsibilities: string };
    const owner = arch?.owner?.fullname ? arch.owner?.fullname : "";
    const adminMembers: { name: string; role: string }[] = [];
    if (arch?.team?.adminMembers) {
        arch?.team?.adminMembers.forEach(({ fullname, jobResponsibilities }: Member) => {
            if (fullname && jobResponsibilities) adminMembers.push({ name: fullname, role: jobResponsibilities });
        });
    }
    const viewMembers: { name: string; role: string }[] = [];
    if (arch?.team?.viewMembers) {
        arch?.team?.viewMembers.forEach(({ fullname, jobResponsibilities }: Member) => {
            if (fullname && jobResponsibilities) viewMembers.push({ name: fullname, role: jobResponsibilities });
        });
    }
    const editMembers: { name: string; role: string }[] = [];
    if (arch?.team?.editMembers) {
        arch?.team?.editMembers.forEach(({ fullname, jobResponsibilities }: Member) => {
            if (fullname && jobResponsibilities) editMembers.push({ name: fullname, role: jobResponsibilities });
        });
    }
</script>

<h3>Information on architecture</h3>

{#if !arch}
    No architecture selected.
{:else}
    <table>
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Id</td><td>{arch.archId}</td></tr>
        <tr><td>Name</td><td>{arch.name}</td></tr>
        <tr><td>Client</td><td>{arch.clientName}</td></tr>
        <tr><td>Owner</td><td>{owner}</td></tr>

        <tr><td>Last Modified</td><td>{arch.lastModified}</td></tr>
        <tr><td>Last Modified by</td><td>{arch.lastModifiedUser?.fullname}</td></tr>
    </table>
    <p />
    <h5>Co-authors</h5>
    <table>
        <tr><th>Name</th><th>Rights</th><th>Job responsibility</th></tr>
        {#each adminMembers as member}
            <tr><td>{member.name}</td><td>Admin</td><td>{member.role}</td></tr>
        {/each}
        {#each editMembers as member}
            <tr><td>{member.name}</td><td>Edit</td><td>{member.role}</td></tr>
        {/each}
        {#each viewMembers as member}
            <tr><td>{member.name}</td><td>View</td><td>{member.role}</td></tr>
        {/each}
    </table>
{/if}

<style>
    table {
        text-align: left;
        position: relative;
        border-collapse: collapse;
        background-color: #f6f6f6;
    } /* Spacing */
    td,
    th {
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
</style>
