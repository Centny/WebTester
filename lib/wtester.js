var http = require('http');
var hproxy = require('http-proxy');
var fs = require("fs");
var url = require("url");
var WebSocketServer = require('websocket').server;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
function split(str, seq, count) {
    var parts = str.split(seq);
    var tail = parts.slice(count - 1).join(seq);
    var result = parts.slice(0, count - 1);
    result.push(tail);
    return result;
}

var onalldone = function () {
    process.exit();
};

function monitor(name, callback) {
    switch (name) {
        case "alldone":
            onalldone = callback;
            break;
    }
}
function wtester(name, starter, opts, exec) {
    var prefix = "[wtester-" + name + "] ";
    //
    if (!opts) {
        opts = global.wtester_options;
        if (!opts) {
            opts = {
                port: 8890,
                selenium: 'http://127.0.0.1:4444/wd/hub',
                capabilities: {
                    'browserName': 'chrome',
                    "loggingPrefs": {
                        "driver": "INFO",
                        "server": "OFF",
                        "browser": "ALL"
                    },
                },
            };
        }
    }
    opts.capabilities.proxy = {
        'proxyType': 'pac',
        "proxyAutoconfigUrl": "http://127.0.0.1:" + opts.port + "/proxy.pac",
    };
    opts.starter = starter;
    console.log(prefix + "start by config:" + JSON.stringify(opts));
    var browser = new webdriver.Builder()
        .withCapabilities(new webdriver.Capabilities(opts.capabilities))
        .usingServer(opts.selenium)
        .build();
    //
    var cid = 0;
    var flows = [];
    var murls = [];//url pattern
    var ctx = {};
    if (opts.env) {
        ctx = opts.env;
    }
    var running = 0;
    var server = http.createServer(web_h);
    var wss = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });
    var proxy = hproxy.createProxyServer();
    function flow(murl, open, worker, pre) {
        var task = {
            murl: murl,
            open: open,
            worker: worker + "",
        };
        if (pre) {
            task.pre = pre + "";
        }
        flows.push(task);
        murls.push(murl);
        return { debug: function () { } };
    }
    exec(flow);
    //
    function pac_h(req, res) {
        var pac = fs.readFileSync(__dirname + "/pac.js", "utf-8");
        pac = pac.replace("$PORT", opts.port + "");
        pac = pac.replace("$URLS", JSON.stringify(murls));
        res._headers = {
            "content-type": "application/x-ns-proxy-autoconfig"
        };
        res.write(pac, "utf-8");
        res.end();
        console.log(prefix + "[proxy] sending proxy.pac\n" + pac + "\n");
    }
    function wtester_js_h(req, res) {
        var data = fs.readFileSync(__dirname + "/wtester_c.js", "utf-8");
        res.write(data, "utf-8");
        res.write("new jswf.wtester(" + opts.port + ").start();", "utf-8");
        res.end();
        console.log(prefix + "[proxy] sending wtester_c.js");
    }
    function web_h(req, res) {
        // console.log(prefix + "web hand " + req.url);
        var rurl = url.parse(req.url);
        if (rurl.pathname == "/proxy.pac") {
            pac_h(req, res);
            return;
        }
        if (rurl.pathname == "/wtester_c.js") {
            wtester_js_h(req, res);
            return;
        }
        var whead = res.writeHead, end = res.end;
        res.writeHead = function (status, msg, headers) {
            if (res._headers) {
                delete res._headers['transfer-encoding'];
                delete res._headers['content-length'];
            }
            whead.call(res, status, msg, headers);
        };
        res.end = function (data, encoding) {
            if (data) res.write(data, encoding);
            console.log(prefix + "[proxy] do append script to " + req.url);
            end.call(res, "<script type=\"text/javascript\" src=\"http://localhost:" + opts.port + "/wtester_c.js\"></script>", encoding);
        };
        proxy.web(req, res, {
            target: 'http://' + req.headers.host
        });
        // console.log(prefix + "proxy " + req.url);
    }

    function onready(con, args) {
        var task = flows[running];
        if (!args.url.match(task.murl)) {
            console.log(prefix + "on ready fail with not matched running task on page " + args.url);
            return;
        }
        if (task.pre) {
            con.sendcmd("pre", {
                idx: running,
                cid: con.cid,
                code: task.pre,
            });
        } else {
            con.sendcmd("run", {
                idx: running,
                cid: con.cid,
                code: task.worker,
            });
        }
        console.log(prefix + args.url + " is ready on #" + running);
    }
    function onpredone(con, args) {
        if (args.idx !== running) {
            console.log(prefix + "on done fail with not matched running task index " + args.idx + "," + running);
            return;
        }
        var task = flows[running];
        con.sendcmd("run", {
            idx: running,
            cid: con.cid,
            code: task.worker,
        });
        console.log(prefix + "task #" + running + " is predone");
    }
    function onrundone(con, args) {
        if (args.idx !== running) {
            console.log(prefix + "on done fail with not matched running task index " + args.idx + "," + running);
            return;
        }
        ctx = args.ctx;
        console.log(prefix + "task #" + running + " is done ");
        running += 1;
        if (running == flows.length) {
            console.log(prefix + "all done...");
            onquit();
        }
    }
    function onlog(con, args) {
        switch (args.level) {
            case "log":
                console.log(prefix + "[I] " + args.log);
                break;
            case "error":
                console.log(prefix + "[E] " + args.log);
                break;
            case "warn":
                console.log(prefix + "[W] " + args.log);
                break;
        }
    }
    function onlisten(evn) {
        browser.get(opts.starter);
    }
    function onquit() {
        browser.quit().then(function () {
            server.close();
            onalldone();
        });
    }
    wss.on('request', function (request) {
        var connection = request.accept('wtester', request.origin);
        connection.cid = "_" + (cid++);
        //console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function (message) {
            try {
                var data = message.utf8Data;
                //console.log(prefix + "recieve data->" + data);
                var cmds = split(data, ":", 2);
                var args = {};
                if (cmds.length > 1 && cmds[1].length) {
                    args = JSON.parse(cmds[1]);
                }
                switch (cmds[0]) {
                    case "ready":
                        onready(connection, args);
                        break;
                    case "predone":
                        onpredone(connection, args);
                        break;
                    case "rundone":
                        onrundone(connection, args);
                        break;
                    case "log":
                        onlog(connection, args);
                        break;
                }
            } catch (e) {
                console.error(prefix + "on message error->", e);
            }
        });
        connection.on('close', function (reasonCode, description) {
            console.log(prefix + connection.remoteAddress + ' disconnected.');
        });
        connection.sendcmd = function (cmd, args) {
            this.sendUTF(cmd + ":" + JSON.stringify(args));
        };
        connection.sendcmd("env", {
            ctx: ctx,
            cid: connection.cid,
        });
    });
    console.log(prefix + "[proxy] listen on :" + opts.port);
    server.listen(opts.port, null, 100, onlisten);
}

module.exports = {
    wtester: wtester,
    monitor: monitor,
};