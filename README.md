# token-refresh-example-hls.js
Automatically refresh token at given time interval using hls.js (uninterrupted video/audio play)

## About this project
This project shows an example of an uninterrupted token renewal in the hls.js environment.

- Normal hls request without token.
<image src="./image/capture_without_token.jpg" />

- Automatically updated at every 20 seconds token   
<image src="./image/capture.jpg" />

- The most important part of the code is below (Overriding pLoader of hls.js)
```js
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
            // if play-list request, send original request and return
            if(type === 'manifest') {
                loader.load(context, config, callbacks);
                return;
            }
            // then type is 'level' (type when requesting chunk-list)
            const msRefreshElsapsed = Date.now() - lastRefreshTimestamp;
            const IS_FIRST_REQUEST = lastRefreshTimestamp === 0;
            if(msRefreshElsapsed > refreshInterval || IS_FIRST_REQUEST){
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
```

## How to use
```
git clone https://github.com/ryuken73/token-refresh-example-hls.js.git
```
use "live server" vscode extension 