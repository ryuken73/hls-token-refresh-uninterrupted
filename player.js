const STREAM_URL = "./stream_url.txt";
const TOKEN_LIFETIME = 20000;

const withToken = url => `${url}?token=${Date.now()}`;
const getPlaylistUrl = () => {
    return fetch(STREAM_URL)
            .then(response => response.text())
            .then(url => {
                return withToken(url);
            })
            .catch(err => {
                reject(`Error to get new token from ${STREAM_URL}`)
            })
}
const getNewToken = () => {
    // write your own fetch() chain which returns new token.
    const newToken = Date.now();
    return Promise.resolve(newToken);
}
const replaceParam = (url, param, newValue) => {
    const urlObj = new URL(url);
    urlObj.searchParams.set(param, newValue)
    return urlObj.toString();
}
const getTokenFromUrl = url => {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token')
}
const getParam = (url, param) => {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(param)
}

const pLoaderAutoRefresh = refreshInterval => {
    // let lastRefreshTimestamp = Date.now();
    let lastRefreshTimestamp = 0;
    let lastUrl = '';
    return function(config) {
        const loader = new Hls.DefaultConfig.loader(config);
        this.abort = () => loader.abort();
        this.destroy = () => loader.destroy();
        this.load = async (context, config, callbacks) => {
            let { type, url } = context;
            // if playlist request, send original request and return
            if(type === 'manifest') {
                loader.load(context, config, callbacks);
                return;
            }
            // if type is 'level' (type of requesting chunk list)
            const msRefreshElsapsed = Date.now() - lastRefreshTimestamp;
            const isFirstRequest = lastRefreshTimestamp === 0;
            if(msRefreshElsapsed > refreshInterval || isFirstRequest){
                // if time elapsed given refresh interval, request new token and replace it with old token.
                try {
                    const newToken = await getNewToken();
                    context.url = replaceParam(context.url, 'token', newToken);
                    loader.load(context, config, callbacks);
                    lastRefreshTimestamp = Date.now();
                    lastUrl = context.url;
                } catch (err) {
                    // request original request
                    loader.load(context, config, callbacks);
                }
            } else {
                context.url = lastUrl !== '' ? lastUrl : context.url;
                loader.load(context, config, callbacks);
            }
        };
    }
}

// main()
const video = document.getElementById('video');
const message = document.getElementById('message');
const container = document.getElementById('container');
const tokenHistory = document.getElementById('tokenHistory');
const writeMessage = msg => {
    if(message.innerText === msg) return;
    message.style.fontWeight = 'bold';
    message.style.fontSize = '12px';
    message.innerText = msg;
    setTimeout(() => {
        message.style.fontWeight = 'normal';
    message.style.fontSize = '10px';
    },1000)
}

const main = () => {
    try {
        const hls = new Hls({
            pLoader: pLoaderAutoRefresh(TOKEN_LIFETIME)
        });
        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
            console.log('1. manifest loaded:', event, data);
            video.play();
        })
        hls.on(Hls.Events.MEDIA_ATTACHED, (event, data) => {
            console.log('2. media attached:', event, data)
        })
        hls.on(Hls.Events.LEVEL_LOADING, (event, data) => {
            console.log('3. level loading:', event, data);
        })
        hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            console.log('4. level loaded:', event, data);
            writeMessage(`current token = ${getParam(data.details.url, 'token')}`);
        })
        hls.attachMedia(video);

        getPlaylistUrl()
        .then(url => hls.loadSource(url))
    } catch(err) {
        console.error(err)
    }
}

main()