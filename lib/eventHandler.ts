import EventEmitter from "https://deno.land/x/events/mod.ts";
import { tableWorkers } from "./tables.ts";

class eventHandler extends EventEmitter {}

export const waitForEvent = (name: string): any => {
    return new Promise((resolve) => {
        events.once(name, (data: any) => resolve(data)); 
    });
}

export const createEventName = (type: string) => {
    return `${type}-${Date.now()}`;
}

export const events = new eventHandler();