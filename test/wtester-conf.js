exports.config = {
    port: 8880,//proxy port
    selenium: 'http://127.0.0.1:4444/wd/hub',
    specs: [
        'e2e/testSpec.js',
        'e2e/testSpec2.js',
        'e2e/testCtx01.js',
        'e2e/testCtx02.js'
    ],
    capabilities: {
        'browserName': 'chrome',
        "loggingPrefs": {
            "driver": "INFO",
            "browser": "ALL"
        },
        "chromeOptions": {
            "args": ['--start-maximized']
        }
    },
    settings: {
        "fullscreen": 1,
    },
};