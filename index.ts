
import {delay} from "https://deno.land/std/async/mod.ts";

import { loadTables, find, insert, remove } from "./lib/tables.ts";
import { events } from "./lib/eventHandler.ts";


console.time("Loading Tables");
await loadTables();
console.timeEnd("Loading Tables");

// await delay(1000)

// const res = await find({table: "events", query: {author: "kaan075"}});
// console.log(res.length);

// console.log(JSON.stringify(res));
// await insert({table: "users", query: {username: "kaan075"}});


for (let i = 0; i < 100000; i++) {
    const res = await find({table: "users", query: {username: "kaan075"}});
    console.log(res[0]);
} 