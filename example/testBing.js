wtester("bing", "http://www.bing.com", null, function (flow, command) {
    flow("^.*\\.bing\\.com/(\\?.*)?$", true, function (env, done) {
        document.getElementById("sb_form_q").value = "github centny";
        document.getElementById("sb_form_go").click();
        done();
    });
    flow("^.*\\.bing\\.com/search.*$", false, function (env, done) {
        var as = document.getElementsByTagName("a");
        for (var i = 0; i < as.length; i++) {
            if (as[i].href == 'https://github.com/Centny') {
                done();
                return;
            }
        }
        throw "fail";
    });
});