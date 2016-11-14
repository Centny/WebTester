(function () {
    function jswf() { }
    if (typeof (window.jswf) == "undefined") {
        window.jswf = jswf;
    }
    function split(str, seq, count) {
        var parts = str.split(seq);
        var tail = parts.slice(count - 1).join(seq);
        var result = parts.slice(0, count - 1);
        result.push(tail);
        return result;
    }
    function wtester(port) {
        this.port = port;
    }
    wtester.prototype.start = function () {
        var wthis = this;
        this.websocket = new WebSocket("ws://localhost:" + this.port, "wtester");
        this.websocket.onopen = function (evt) {
            console.log("[wtester_c] webscoket opened");
        };
        this.websocket.onclose = function (evt) {
            console.log("[wtester_c] webscoket closed");
        };
        this.websocket.onmessage = function (evt) {
            wthis.onmsg(evt.data);
        };
        this.websocket.onerror = function (evt) {
            console.log("[wtester_c] webscoket error->", evt);
        };
    };
    wtester.prototype.omit = function (cmd, args) {
        this.websocket.send(cmd + ":" + JSON.stringify(args));
    }
    wtester.prototype.onmsg = function (data) {
        try {
            //console.log("[wtester_c] recieve data->" + data);
            var cmds = split(data, ":", 2);
            var args = {};
            if (cmds.length > 1 && cmds[1].length) {
                args = JSON.parse(cmds[1]);
            }
            switch (cmds[0]) {
                case "env":
                    this.onenv(args);
                    break;
                case "pre":
                    this.onpre(args);
                    break;
                case "run":
                    this.onrun(args);
                    break;
            }
        } catch (e) {
            console.error("[wtester_c] on message error->" + e);
        }
    };
    wtester.prototype.onenv = function (args) {
        var wthis = this;
        this.env = args;
        var olog = console.log, oerror = console.error, owarn = console.warn;
        console.log = function (arg1) {
            olog(arg1);
            wthis.omit("log", {
                level: "log",
                log: arg1,
            });
        };
        console.error = function (arg1) {
            oerror(arg1);
            wthis.omit("log", {
                level: "error",
                log: arg1,
            });
        };
        console.warn = function (arg1) {
            owarn(arg1);
            wthis.omit("log", {
                level: "warn",
                log: arg1,
            });
        };
        this.omit("ready", {
            url: window.location.href,
        });
        console.log("[wtester_c] ready by env:" + JSON.stringify(args));
    };
    wtester.prototype.onpre = function (args) {
        var wthis = this;
        eval("var wtester_pre=" + args.code + ";");
        wtester_pre(this.env, function () {
            wthis.omit("predone", {
                idx: args.idx,
            });
        });
    };
    wtester.prototype.onrun = function (args) {
        var wthis = this;
        eval("var wtester_flow=" + args.code + ";");
        wtester_flow(this.env, function () {
            wthis.omit("rundone", {
                idx: args.idx,
                ctx: wthis.env.ctx,
            });
        });
    };
    window.jswf.wtester = wtester;
    return window.jswf;
})();
