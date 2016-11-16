The simple integration testing tools for website
===

### Features

* running test code on web page(not nodejs).
* transfter running context between two page.
* load browser by configure.
* multi spec supported
* custom nodejs command supported(having some inner command, see reference)

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

### Custom Command

```.js
wtester("case1", "http://localhost:8080/web/page1.html", {
    //the intitial test case env.
    ctx: {
        ws: __dirname,
    },
}, function(flow, command) {
    command("title", function(env, args, done) {
        //the custom command on nodejs
        env.browser.getTitle().then(function(title) {
            done(title, null);
        });
    });
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function(env, done) {
        //the test code on page1.html
        env.ctx.testing = "login";
        env.exec("title", {}, function(data, err) {//exec custom command
            if (err) {
                throw err;
            }
            document.getElementById("login").click();
            console.log("testing click login done...");
            done();
        });
    }, function(env, done) {
        done();
    }).debug({});
});
```

### Inner Command

##### sendkeys
calling webdriver sendkey

* `by` required, the selector type in id/xpath/css, see more for webdriver document.
* `selector` required, the selector value, like element id
* `file` optional, the file path
* `value` optional, the value.

```.js
wtester("case1", "http://localhost:8080/web/page1.html", {
    //the intitial test case env.
    ctx: {
        ws: __dirname,
    },
}, function(flow, command) {
    flow("http://localhost:8080/web/page2\\.html(\\?.*)?", false, function(env, done) {
        //the test code on page2.html
        if (env.ctx.testing != "login") {
            throw "fail";
        }
        document.getElementById("account").value = "abc";
        env.exec("sendkeys", {//exec inner command, eg: set file path for input
            by: "id",
            selector: "file",
            file: env.ctx.ws + "/../data/test.txt",
        }, function(data, err) {
            if (err) {
                throw err;
            }
            var file = document.getElementById("file");
            if (!file.value) {
                throw "not fild";
            }
            console.log(file.value);
            console.log("testing login done...");
            done();
        });
    }).debug({//debug the test code on page2.
        ctx: {
            testing: "login",
        },
    });
});
```