wtester("ctx01", "http://localhost:8080/web/page1.html", null, function (flow, command) {
    flow("^http://localhost:8080/web/page1\\.html(\\?.*)?$", true, function (env, done) {
        //the test code on page1.html
        env.ctx.xx = "passing";
        done();
    });
});