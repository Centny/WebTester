The simple integration testing tools for website
===

### Features

* auto inject the code to web page and run it code on browser(not nodejs).
* transfter running context between two page.
* load browser by configure.
* multi spec supported
* custom nodejs command supported(having some inner command, see reference)

### Install

##### Install `webdriver-manager`

```.sh
npm install -g webdriver-manager
webdriver-manager update
```

more is on <https://github.com/angular/webdriver-manager>

##### Install `wtester`

```.sh
npm install -g wtester
```

### Start

##### Create test spec(testBing.js)

```.js
wtester("bing", "http://www.bing.com", null, function (flow, command) {
    flow("^.*\\.bing\\.com/(\\?.*)?$", true, function (env, done) {
        document.getElementById("sb_form_q").value = "github centny";
        document.getElementById("sb_form_go").click();
        done();
    });
    flow("^.*\\.bing\\.com/search.*$", false, function (env, done) {
        var as = document.getElementsByTagName("a");
        for (var i = 0; i < as.length; i++) {
            if (as[i].href == 'https://github.com/Centny') {
                done();
                return;
            }
        }
        throw "fail";
    });
});
```

##### Create configure file(wtester-conf.js)

```.js
exports.config = {
    port: 8880,//proxy port
    selenium: 'http://127.0.0.1:4444/wd/hub',
    specs: [
        'testBing.js',
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

### Run the more exampe
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

### Reference

##### wtester(name,starter,opts,exec)
* `name` required,string the case name
* `start` required,string the start url
* `opts` optional,object the options for tester, deafult null
  * `ctx` object, the initial context to run test.
* `exec` required,function the flow executor, the argument is `flow,command`
  * `flow` fuction, adding test case step
  * `command` function, adding custom command

##### flow(murl,open,worker,pre)
* `murl` required,string the url regex pattern to match page for run the worker
* `open` required,bool not used now
* `workder` required,function the test code which running on browser, the argument is `env,done`
  * `env` object, the current env transfter from prefix workder
  * `done` function, completed current worker, not arguments.
* `pre` optional,function the workder to initial something for the test workder
  
#### command(name,worker)
* `name` required,string the command name.
* `workder` required,function the command executor, the argument is `env,args,done`
  * `env` object, the enviroment for running workder
  * `env.browser` object, the webdriver object from [selenium-webdriver](https://github.com/SeleniumHQ/selenium/)
  * `env.By` object, the By tools from [selenium-webdriver](https://github.com/SeleniumHQ/selenium/)
  * `env.until` object, the until tool from [selenium-webdriver](https://github.com/SeleniumHQ/selenium/)
  * `args` object, the command arguments from caller
  * `done` function, completed the current worker and return the data or error, the argument is `data,err`

#### tester
tester object contain some event handler and util function.
* `tester.init` the initial function before call flow
* `tester.readfile` the util to read file sync.

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

##### readfile
read file
* `name` required, the file name
```.js
wtester("cmd", "http://localhost:8080/web/page1.html", {
    //the intitial test case env.
    ctx: {
        ws: __dirname,
    },
}, function (flow, command, tester) {
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        //the test code on page1.html
        env.exec("readfile", {
            name: env.ctx.ws + "/../data/test.txt",
        }, function (data, err) {
            if (data !== "abc") {
                throw "error";
            }
            done();
        });
    });
});
```

### conf.settings Reference
* `fullscreen` if do fullscreen when spec start or not


### Context Reference
the example config.js

```
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
```

* `conf.specs` is not in the same context.
* `e2e/testCtx01.js,e2e/testCtx02.js` is the same context control by `context:1`


### Debug Test Case
For debug test case on browser, you cant adding `<script type="text/javascript" src="e2e/testSpec.js" />` on your page and adding blow code to simple start flow by matchi url

```.js
if (typeof wtester === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {//on nodejs debug
        wt = require("wtester");
        wtester = wt.wtester;
    } else {//on browser debug
        wtester = function(name, starter, opts, exec) {
            exec(function(murl, open, worker, pre) {
                return {
                    debug: function(env) {
                        if (!env.ctx) {
                            env.ctx = {};
                        }
                        if (pre) {
                            pre(env, function() {
                                if (window.location.href.match(murl)) {
                                    worker(env, function() { });
                                }
                            });
                        } else {
                            if (window.location.href.match(murl)) {
                                worker(env, function() { });
                            }
                        }
                    },
                };
            }, function(env, args, done) {
            });
        };
    }
}
```