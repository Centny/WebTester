#!/usr/bin/env node
var process = require("process");
var path = require("path");
if (process.argv.length < 3) {
    console.log("Usage: wtester config");
    return;
}
var cf = process.argv[2];
if (!path.isAbsolute(cf)) {
    cf = process.cwd() + "/" + cf;
}
var conf = require(cf);
global.wtester_options = conf.config;
var allspecs = conf.config.specs;
if (!(allspecs && allspecs.length)) {
    console.log("not specs found");
    return;
}
global.wt = require(__dirname + "/wtester.js");
global.wtester = wt.wtester;


function dospecs(specs, settings, done) {
    console.log(specs);
    var running = 0;
    function donext() {
        if (running > 0 && (typeof specs[running - 1] === "string")) {
            delete require.cache[require.resolve(path.dirname(cf) + "/" + specs[running - 1])];
        }
        if (running >= specs.length) {
            done();
            return;
        }
        if (typeof specs[running] === "string") {
            var spec = path.dirname(cf) + "/" + specs[running];
            global.spec_dirname = path.dirname(spec);
            console.log("[wtester-cli] start " + spec);
            if (!(settings && settings.context)) {
                global.wtester_ctx = null;
            }
            require(spec);
            running += 1;
            return;
        }
        var sub = specs[running];
        dospecs(sub.specs, sub.settings, function () {
            wt.monitor("alldone", donext);
            running += 1;
            donext();
        });
    }
    wt.monitor("alldone", donext);
    donext();
}
dospecs(allspecs, conf.config.settings, function () {
    console.log("[wtester-cli] all spec done...");
    process.exit();
});