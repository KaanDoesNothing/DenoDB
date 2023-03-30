//@ts-ignore
self.onmessage = (e) => {
    const query = e.data.query;
    const data = e.data.data;
    let results = [];
    if(query && data) {
        const properties = Object.keys(query);
        // console.log(data[1]);
        for (let [key, value] of data) {
            let matches = 0;

            properties.forEach(property => {
                if(query[property] === value[property]) matches++;
            });


            if(matches === properties.length) {
                results.push({key, value});
            }
        }
    }

    //@ts-ignore
    self.postMessage({results});
}