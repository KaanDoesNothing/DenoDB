import {readdir} from "node:fs";

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

        // for (let i = 0; i < 10000; i++) {
        //     await this.insert({data: {username: Date.now().toString()}})
        // }

        // console.time("test1");
        // await this.find({query: {kanker: "test"}})
        // console.timeEnd("test1");
    }

    async handleEvent(event: any) {
       const e = event.data;
       if(e.type === "eval") {
            // console.log(data);
            // console.log("Running eval")
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
    
            this.cache.set(parseInt(id), parsed);
        }

        console.timeEnd(`Loading cache for ${this.table}`);

        postMessage({type: `ready`, data: {}});
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
        await Deno.remove(`./data/${this.table}/${id}.json`);
        this.cache.delete(id);
    }

    async find(query: any) {
        let results = [];

        let properties = [];

        for (let i in query) {
            properties.push(i)
        }

        // console.log("properties", properties);

        // console.log("query", query)

        for (let [key, value] of this.cache) {
            let matches = 0;

            properties.forEach(property => {
                if(query[property] === value[property]) matches++;
            });

            
            // console.log("matches", matches, properties.length)

            if(matches === properties.length) {
                results.push({key, value});
            }
        }

        // console.log("results", this.table, results)

        return results;
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