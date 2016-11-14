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
var specs = conf.config.specs;
if (!(specs && specs.length)) {
    console.log("not specs found");
    return;
}
var running = 0;
global.wt = require(__dirname + "/wtester.js");
global.wtester = wt.wtester;
function donext() {
    if (running > 0) {
        delete require.cache[require.resolve(path.dirname(cf) + "/" + specs[running - 1])];
    }
    if (running >= specs.length) {
        console.log("all spec done...");
        process.exit();
    } else {
        require(path.dirname(cf) + "/" + specs[running], 1);
        running += 1;
    }
}
wt.monitor("alldone", donext);
donext();