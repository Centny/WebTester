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
wtester("tester", "http://localhost:8080/web/page1.html", {
    //the intitial test case env.
    ctx: {
        ws: __dirname,
    },
}, function (flow, command, tester) {
    tester.init = function (ctx, done) {
        ctx.tdata = tester.readfile(ctx.ws + "/../data/test.txt");
        done();
    };
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        //the test code on page1.html
        if (env.ctx.tdata !== "abc") {
            throw "error";
        }
        done();
    });
});