exports.config = {
    port: 8880,//proxy port
    selenium: 'http://127.0.0.1:4444/wd/hub',
    specs: [
        'e2e/testSpec.js',
        'e2e/testSpec2.js',
        {
            specs: [
                'e2e/testCtx01.js',
                'e2e/testCtx02.js'
            ],
            settings: {
                "context": 1,
            },
        },
        {
            specs: [
                'e2e/testSpec.js',
                'e2e/testSpec2.js',
            ],
        },
        "e2e/testCmd.js",
        "e2e/testMulti.js",
        "e2e/testTester.js",
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