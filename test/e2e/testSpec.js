if (typeof wtester === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {//on nodejs debug
        wt = require(__dirname + "/../../lib/wtester.js");
        wtester = wt.wtester;
    } else {//on browser debug
        wt_debug = function (env) {
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
        };
        wtester = function (name, starter, opts, exec) {
            exec(function (murl, open, worker, pre) {
                return {
                    debug: wt_debug,
                };
            });
        };
    }
}
wtester("case1", "http://localhost:8080/web/page1.html", null, function (flow) {
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        //the test code on page1.html
        env.ctx.testing = "login";
        document.getElementById("login").click();
        console.log("testing click login done...");
        done();
    }, function (env, done) {
        done();
    }).debug({});
    flow("http://localhost:8080/web/page2\\.html(\\?.*)?", false, function (env, done) {
        //the test code on page2.html
        if (env.ctx.testing != "login") {
            throw "fail";
        }
        document.getElementById("account").value = "abc";
        console.log("testing login done...");
        done();
    }).debug({//debug the test code on page2.
        ctx: {
            testing: "login",
        },
    });
});