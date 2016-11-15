The simple integration testing tools for website
===

### Features

* load browser by configure.
* transfter running context between two page.
* multi spec supported

### Install

##### Install `webdriver-manager`

```.sh
npm install -g webdriver-manager
```

##### Install `wtester`

```.sh
npm install -g wtester
```

### Start

##### Create test spec(e2e/testSpec.js)

```.js
wtester("case1", "http://localhost:8080/web/page1.html", null, function (flow) {
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        env.ctx.testing = "login";
        document.getElementById("login").click();
        console.log("testing click login done...");
        done();
    }, function (env, done) {
        done();
    }).debug({});
    flow("http://localhost:8080/web/page2\\.html(\\?.*)?", false, function (env, done) {
        if (env.ctx.testing != "login") {
            throw "fail";
        }
        document.getElementById("account").value = "abc";
        console.log("testing login done...");
        done();
    }).debug({
        ctx: {
            testing: "login",
        },
    });
});
```

##### Create configure file(wtester-conf.js)

```.js
exports.config = {
    port: 8880,//proxy port
    selenium: 'http://127.0.0.1:4444/wd/hub',
    specs: [
        'e2e/testSpec.js',
    ],
    capabilities: {
        'browserName': 'chrome',
        "loggingPrefs": {
            "driver": "INFO",
            "browser": "ALL"
        },
    },
};
```

##### Run

```.sh
wtester wtester-conf.js
```

### Run the exampe
* download code

```.sh
git clone https://github.com/Centny/WebTester.git
```

* start static server

```.sh
cd WebTester/test
npm install connect serve-static
./run.js
```

* start webdriver 

```.sh
webdriver-manager start
```

* run test

```.sh
cd WebTester/test
wtester wtester-conf.js
```
