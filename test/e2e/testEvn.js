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
wtester("evn", "http://localhost:8080/web/page3.html", null, function (flow, command, tester) {
    flow("^http://localhost:8080/web/page3\\.html(\\?.*)?$", true, function (env, done) {
        env.on("tg1", true, function (args) {
            console.log(args.msg);
            trigger2();
        });
        env.on("tg2", false, function (args) {
            console.log(args.msg);
            env.trigger("tg3", {
                msg: "manual trigger",
            });
        });
        env.on("tg3", true, function (args) {
            console.log(args.msg);
            env.trigger("tg4");
        });
        env.on("tg4", true, function (args) {
            console.log(args);
            env.trigger("tg5", { msg: "after 1s run" });
        });
        env.on("tg5", 1000, function (args) {
            console.log(args.msg);
            env.trigger("tg6");
        });
        env.on("tg6", 0, function (args) {
            console.log(args);
            env.trigger("tg7", { msg: "after 1.5s run" }, 1500);
        });
        env.on("tg7", true, function (args) {
            console.log(args.msg);
            done();
        });
        trigger1();
    });
});