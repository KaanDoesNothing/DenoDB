import {ensureDir} from "https://deno.land/std@0.181.0/fs/mod.ts";
import {readdir} from "node:fs";
import { createEventName, waitForEvent } from "./eventHandler.ts";

export const schemas = new Map();

export const tableWorkers = new Map();

export const loadTables = async () => {
    await ensureDir("./schemas");
    await ensureDir("./data");

    const res: string[] = await new Promise((resolve) => {
        readdir("./schemas", (err, res) => {
            if(err) Deno.exit();
            
            resolve(res);
        });
    });

    for (const i in res) {
        const file_name = res[i]
        const file = await Deno.readTextFile(`./schemas/${file_name}`);
        const table_name = file_name.split(".json")[0];

        const parsed = JSON.parse(file);

        await ensureDir(`./data/${table_name}`);

        schemas.set(`${table_name}`, parsed);

        const table_worker = new Worker(new URL("./tableworker.ts", import.meta.url).href, { type: "module" });

        table_worker.postMessage({init: true, table: table_name});
        
        tableWorkers.set(table_name, table_worker);

        // await waitForEvent(`table-${table_name}-ready`);
    }
}

export const find = async ({table, query}: {table: string, query: any}) => {
    const table_worker: Worker = tableWorkers.get(table);
    const event_id = createEventName("find");

    table_worker.postMessage({event_id, data: `await tableInstance.find(${JSON.stringify(query)})`, type: "eval"});

    const res = await waitForEvent(event_id);

    return res;
}

export const insert = async ({table, query}: {table: string, query: any}) => {
    const table_worker: Worker = tableWorkers.get(table);
    const event_id = createEventName("insert");

    table_worker.postMessage({event_id, data: `await tableInstance.insert(${JSON.stringify(query)})`, type: "eval"});

    const res = await waitForEvent(event_id);

    return res;
}

export const remove = async ({table, id}: {table: string, id: number}) => {
    const table_worker: Worker = tableWorkers.get(table);
    const event_id = createEventName("find");

    table_worker.postMessage({event_id, data: `await tableInstance.delete(${JSON.stringify({id})})`, type: "eval"});

    const res = await waitForEvent(event_id);

    return res;
}