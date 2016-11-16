wtester("ctx02", "http://localhost:8080/web/page1.html", null, function (flow, command) {
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        if (env.ctx.xx === "passing") {
            done();
        } else {
            throw "fail";
        }
    });
});