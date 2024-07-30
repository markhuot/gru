import axios from 'axios';
import readline from 'node:readline';
import {clearTerminal, enterAlternativeScreen, exitAlternativeScreen} from 'ansi-escapes';
import meow from 'meow';

const cli = meow(`
    Usage
        $ node index.js -c 10 -H "user-agent: foo" https://example.com
    
    Options
        --concurrency, -c  The number of concurrent workers to spawn
        --header, -H       Add a header to the request
`, {
    importMeta: import.meta,
    flags: {
        concurrency: {
            type: 'number',
            shortFlag: 'c',
            default: 10,
        },
        header: {
            type: 'string',
            shortFlag: 'H',
            isMultiple: true,
        }
    }
});

const cacheDate = new Date().getTime();
const cacheRandom = Math.random();
const start = cli.input[0];

const concurrency = parseInt(cli.flags.concurrency);
const client = axios.create({
    baseURL: start,
    headers: Object.fromEntries(cli.flags.header.map(h => h.split(':').map(s => s.trim()))),
});
let logLines = [];
let viewportStart = 0;

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdout.write(enterAlternativeScreen);
for (let i=0; i<concurrency; i++) {
    log(i, 'starting...');
}

function log(index, message) {
    logLines[index] = message;
}

function updateLog(index, message) {
    process.stdout.write(clearTerminal);
    for (let i= viewportStart; i<Math.min(process.stdout.rows + viewportStart - 1, logLines.length); i++) {
        console.log(`Worker ${i}: ${logLines[i] || '...'}`);
    }
}
setInterval(updateLog, 1000);

function cacheKey(index) {
    return [cacheDate, index, cacheRandom].join('-');
}

async function getPage(index, url) {
    try {
        const start = new Date().getTime();
        const response = await client.get(`${url}?_=${cacheKey(index)}`);
        log(index, [
            response.headers.get('Cf-Cache-Status') || '??',
            response.status,
            response.statusText,
            Number((new Date().getTime() - start) / 1000).toFixed(2) + 's',
            url,
        ].join(' '));
        const body = response.data;
        const links = [...body.matchAll(/<a[^>]+href="([^"]+)"/g)]
            .map(m => m[1])
            .filter(url => url.startsWith('/'));
        const link = links[Math.floor(Math.random() * links.length)];
        getPage(index, link);
    }
    catch (err) {
        if (err.response) {
            log(index, `${err.response.headers.get('Cf-Cache-Status') || '??'} ${err.response.status} ${err.response.statusText} ${url} ${err}`);
        }
        else {
            log(index, 'ERR ' + err);
        }
        getPage(index, start);
    }
}

for (let i=0; i<concurrency; i++) {
    getPage(i, start);
}

// setInterval(() => {
//     const index = Math.round(Math.random() * concurrency);
//     log(index, 'sent! ' + new Date().toISOString());
// }, Math.random() * 1000);

process.stdin.on('keypress', (ch, key) => {
    if (key && key.name === 'home') {
        viewportStart = 0;
    }
    else if (key && key.name === 'up') {
        viewportStart -= 1;
    }
    else if (key && key.name === 'pageup') {
        viewportStart -= process.stdout.rows;
    }
    else if (key && key.name === 'down') {
        viewportStart += 1;
    }
    else if (key && key.name === 'pagedown') {
        viewportStart += process.stdout.rows;
    }
    else if (key && key.ctrl === true && key.name === 'c') {
        process.stdout.write(exitAlternativeScreen);
        process.exit(0);
    }

    if (viewportStart < 0) {
        viewportStart = 0;
    }
})

process.once('SIGINT', () => {
    process.stdout.write(exitAlternativeScreen);
    process.exit(0);
});
