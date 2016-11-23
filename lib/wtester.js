var http = require('http');
var hproxy = require('http-proxy');
var fs = require("fs");
var url = require("url");
var WebSocketServer = require('websocket').server;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
var path = require("path");
function split(str, seq, count) {
    var parts = str.split(seq);
    var tail = parts.slice(count - 1).join(seq);
    var result = parts.slice(0, count - 1);
    result.push(tail);
    return result;
}

var allrunning = 0;
var alltasks = [];

var onalldone = function () {
    console.log("[wtester] tester is exited...");
    process.exit();
};

function monitor(name, callback) {
    switch (name) {
        case "alldone":
            onalldone = callback;
            break;
    }
}

//impl the sendkeys command.
function sendkeys_c(env, args, done) {
    try {
        if (args.by && args.selector && (args.value || args.file)) {
            var value = args.value;
            if (args.file) {
                value = path.normalize(args.file);
            }
            env.browser.findElement(By[args.by](args.selector)).sendKeys(value).then(function () {
                done("OK", null);
            });
        } else {
            done("ERR", "the one argument of by/selector/value is empty");
        }
    } catch (e) {
        done("ERR", e.toString());
    }
}

function readfile_c(env, args, done) {
    try {
        if (args.name) {
            done(readfile(args.name), null);
        } else {
            done("ERR", "the one argument of name is empty");
        }
    } catch (e) {
        done("ERR", e.toString());
    }
}

function readfile(name) {
    return fs.readFileSync(name, "utf-8");
}

function wtester(name, starter, opts, exec) {
    alltasks.push({
        name: name,
        starter: starter,
        opts: opts,
        exec: exec,
    });
    if (alltasks.length - 1 === allrunning) {
        wtester_(name, starter, opts, exec);
    }
}

function wtester_(name, starter, opts, exec) {
    var prefix = "[wtester-" + name + "] ";
    //
    if (!opts) {
        opts = {};
    }
    if (!opts.dirname) {
        opts.dirname = global.spec_dirname;
    }
    if (!opts.conf) {
        opts.conf = global.wtester_options;
        if (!opts.conf) {
            opts.conf = {
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
    opts.conf.capabilities.proxy = {
        'proxyType': 'pac',
        "proxyAutoconfigUrl": "http://127.0.0.1:" + opts.conf.port + "/proxy.pac",
    };
    opts.starter = starter;
    console.log(prefix + "start by config:" + JSON.stringify(opts));
    var capabilities = new webdriver.Capabilities(opts.conf.capabilities);
    var browser = new webdriver.Builder()
        .withCapabilities(capabilities)
        .usingServer(opts.conf.selenium)
        .build();
    //
    var cid = 0;
    var flows = [];
    var murls = [];//url pattern
    var cmds = {};
    var ctx = {};
    if (global.wtester_ctx) {
        ctx = global.wtester_ctx;
    }
    if (opts.ctx) {//merge
        for (var k in opts.ctx) {
            ctx[k] = opts.ctx[k];
        }
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
    function command(name, worker) {
        cmds[name] = worker;
    }
    var tester = {
        ctx: ctx,
        readfile: readfile,
    };
    exec(flow, command, tester);
    //
    cmds.sendkeys = sendkeys_c;
    cmds.readfile = readfile_c;
    //
    function pac_h(req, res) {
        var pac = fs.readFileSync(__dirname + "/pac.js", "utf-8");
        pac = pac.replace("$PORT", opts.conf.port + "");
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
        res.write("var wtester=new jswf.wtester(" + opts.conf.port + ");wtester.start();", "utf-8");
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
            end.call(res, "<script type=\"text/javascript\" src=\"http://localhost:" + opts.conf.port + "/wtester_c.js\"></script>", encoding);
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
            global.wtester_ctx = ctx;
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
    function onexec(con, args) {
        var cmd = cmds[args.name];
        if (!cmd) {
            con.sendcmd("execback", {
                eid: args.eid,
                err: "command not found",
            });
            return;
        }
        cmd({
            browser: browser,
            By: By,
            until: until,
        }, args.args, function (data, err) {
            con.sendcmd("execback", {
                eid: args.eid,
                data: data,
                err: err,
            });
        });
    }
    function tostarter() {
        if (tester.init) {
            tester.init(ctx, function () {
                browser.get(opts.starter);
            });
        } else {
            browser.get(opts.starter);
        }
    }
    function onlisten(evn) {
        if (opts.conf.settings && opts.conf.settings.fullscreen) {
            browser.get("data:,");
            console.log(prefix + "maximize window");
            browser.manage().window().maximize().then(tostarter);
        } else {
            tostarter();
        }
    }
    function onquit() {
        browser.quit().then(function () {
            server.close();
            allrunning++;
            if (allrunning < alltasks.length) {
                wtester_(alltasks[allrunning].name, alltasks[allrunning].starter, alltasks[allrunning].opts, alltasks[allrunning].exec);
                return;
            }
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
                    case "exec":
                        onexec(connection, args);
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
    console.log(prefix + "[proxy] listen on :" + opts.conf.port);
    server.listen(opts.conf.port, null, 100, onlisten);
}

module.exports = {
    wtester: wtester,
    monitor: monitor,
};