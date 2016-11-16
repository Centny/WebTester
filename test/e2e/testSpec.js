if (typeof wtester === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {//on nodejs debug
        wt = require(__dirname + "/../../lib/wtester.js");
        wtester = wt.wtester;
    } else {//on browser debug
        wtester = function (name, starter, opts, exec) {
            exec(function (murl, open, worker, pre) {
                return {
                    debug: function (env) {
                        if (!env.ctx) {
                            env.ctx = {};
                        }
                        if (pre) {
                            pre(env, function () {
                                if (window.location.href.match(murl)) {
                                    worker(env, function () { });
                                }
                            });
                        } else {
                            if (window.location.href.match(murl)) {
                                worker(env, function () { });
                            }
                        }
                    },
                };
            }, function (env, args, done) {
            });
        };
    }
}
wtester("spec", "http://localhost:8080/web/page1.html", {
    //the intitial test case env.
    ctx: {
        ws: __dirname,
    },
}, function (flow, command) {
    command("title", function (env, args, done) {
        //the custom command on nodejs
        env.browser.getTitle().then(function (title) {
            done(title, null);
        });
    });
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        //the test code on page1.html
        env.ctx.testing = "login";
        env.exec("title", {}, function (data, err) {//exec custom command
            if (err) {
                throw err;
            }
            document.getElementById("login").click();
            console.log("testing click login done...");
            done();
        });
    }, function (env, done) {
        done();
    }).debug({});
    flow("http://localhost:8080/web/page2\\.html(\\?.*)?", false, function (env, done) {
        //the test code on page2.html
        if (env.ctx.testing != "login") {
            throw "fail";
        }
        document.getElementById("account").value = "abc";
        env.exec("sendkeys", {//exec inner command, eg: set file path for input
            by: "id",
            selector: "file",
            file: env.ctx.ws + "/../data/test.txt",
        }, function (data, err) {
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