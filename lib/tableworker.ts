import {readdir} from "node:fs";
import { sortDirection } from "../types.ts";

let tableInstance: tableHandler;

//@ts-ignore
const postMessage = self.postMessage;

class tableHandler {
    private table: string;
    private cache: Map<number, any>;
    constructor({table_name}: {table_name: string}) {
        this.table = table_name;
        this.cache = new Map();

        console.log(`Table handler loaded for ${this.table}`);

        this.init();
    }

    async init() {
        await this.loadFiles();
    }

    async handleEvent(event: {type: string, data: any}) {
       const e = event.data;
       if(e.type === "eval") {
            const result = await eval(`(async () => ${e.data})()`);

            console.log(e.event_id);
            postMessage({type: e.event_id, data: result});
        }
    }

    async loadFiles() {
        console.time(`Loading cache for ${this.table}`);

        const res: string[] = await new Promise((resolve) => {
            readdir(`./data/${this.table}`, (err, res) => {
                if(err) Deno.exit();
                
                resolve(res);
            });
        });

        for (const i in res) {
            const file_name = res[i]
            const file = await Deno.readTextFile(`./data/${this.table}/${file_name}`);
            const id = file_name.split(".json")[0];
    
            const parsed = JSON.parse(file);

            if(parsed.deleted) continue;
    
            this.cache.set(parseInt(id), parsed);
        }

        console.timeEnd(`Loading cache for ${this.table}`);

        postMessage({type: `table-${this.table}-ready`, data: {}});
    }

    async updateCache({id}: {id: number}) {
        const file = await Deno.readTextFile(`./data/${this.table}/${id}.json`);

        this.cache.set(id, JSON.parse(file));
    }

    async insert(data: any) {
        const count: number = await new Promise((resolve) => {
            readdir(`./data/${this.table}`, (err, res) => {
                if(err) Deno.exit();
                
                resolve(res.length);
            });
        });

        const new_id = count + 1;

        await Deno.writeTextFile(`./data/${this.table}/${new_id}.json`, JSON.stringify(data));

        this.updateCache({id: new_id});

        return data;
    }

    async delete({id}: {id: number}) {
        await Deno.writeTextFile(`./data/${this.table}/${id}.json`, JSON.stringify({deleted: true}));
        // await Deno.remove(`./data/${this.table}/${id}.json`);
        this.cache.delete(id);
    }

    async filterWorker(query: any, data: any) {
        return new Promise((resolve, reject) => {
            const table_worker = new Worker(new URL("./filter_worker.ts", import.meta.url).href, { type: "module" });

            table_worker.postMessage({query, data});
            table_worker.onmessage = (e) => {
                table_worker.terminate();
                resolve(e.data.results);
            }
        });
    }

    async find(query: any) {
        const properties = Object.keys(query);
        const chunkSize = 2000;
        const chunks = [];

        let results = [];

        for (let i = 0; i < this.cache.size; i += chunkSize) {
            const chunk = [...this.cache].slice(i, i + chunkSize);
            chunks.push(chunk);
        }

        const fetchedResult = await Promise.all(chunks.map(chunk => this.filterWorker(query, chunk)));
        for (let i in fetchedResult) {
            const row: any = fetchedResult[i];


            for (let i in row as []) {
                const doc = row[i];

                results.push(doc);
            }
        }

        return results;
    }

    sort(data: any, value: string, direction: sortDirection) {
        return data.sort((a: any, b: any) => {
            if(direction === "asc") {
                return b[value] - a[value];
            }else {
                return a[value] - b[value];
            }
        });
    }
}

//@ts-ignore
self.onmessage = (e) => {
    if(e.data.init) {
        tableInstance = new tableHandler({table_name: e.data.table});
    }else {
        if(tableInstance) tableInstance.handleEvent(e);
    }
}