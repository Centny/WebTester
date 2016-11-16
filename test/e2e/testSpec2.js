if (typeof wtester === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {//on nodejs
        wt = require(__dirname + "/../../lib/wtester.js");
        wtester = wt.wtester;
    } else {//on browser
        wtester = function (name, starter, opts, exec) {
            exec(function (murl, open, worker, init) {
                return {
                    debug: function (env) {
                        if (!env.ctx) {
                            env.ctx = {};
                        }
                        if (window.location.href.match(murl)) {
                            worker(env);
                        }
                    },
                };
            });
        };
    }
}
wtester("spec2", "http://rcp.dev.gdy.io", null, function (flow) {
    flow("^http://rcp\\.dev\\.gdy\\.io/(.*\\.html)?(\\?.*)?$", true, function (env, done) {
        env.ctx.testing = "login";
        $("#login")[0].click();
        console.log("testing click login done...");
        done();
    }, function (env, done) {
        done();
    }).debug({});
    flow("http://sso\\.dev\\.gdy\\.io/.*\\.html", false, function (env, done) {
        if (env.ctx.testing != "login") {
            throw "faile";
        }
        $("#account")[0].value = "abc";
        console.log("testing login done...");
        done();
    }).debug({});
});