/*
    base uri: https://msx.tu-dresden.de/owa/

*/

function saveUserData() {
    var asdf = document.getElementById('username_field').value
    var fdsa = document.getElementById('password_field').value
    var url = document.getElementById('url_field').value

    //make some checks for valid input data
    if (asdf === '' || fdsa === '' || url === ''){
        document.getElementById('status_msg').innerHTML = "<font color='red'>Fields should not be empty!</font>"
        console.log("Empty inputs")
        return false
    }
    if (!patternMatchURI(url)) {
        document.getElementById('status_msg').innerHTML = "<font color='red'>Fields should not be empty!</font>"
        console.log("Wrong url pattern")
        return false
    }

    //reset popup
    document.getElementById('status_msg').innerHTML = ""
    document.getElementById("save_data").innerHTML = '<font>Saved!</font>'
    document.getElementById("save_data").style.backgroundColor = "rgb(47, 143, 18)"
    document.getElementById("username_field").value = ""
    document.getElementById("password_field").value = ""

    //save data
    chrome.runtime.sendMessage({ cmd: "set_user_data", userData: { asdf: asdf, fdsa: fdsa } })
    chrome.storage.local.set({ "raw_url": url , "base_url" : extractBaseURI(url)}, function () {});
}

//check if uri matches required pattern
function patternMatchURI(uri){
    uri = uri.split("auth/logon.aspx")[0]
    var regex1 = RegExp(/\/owa\//g)
    if (!regex1.test(uri)) return false
    if (!uri.startsWith("https://")) return false
    return true
}

//extract baseURI
function extractBaseURI(uri){
    return uri.split("/owa/")[0] + "/owa/"
}

//this need to be done here since manifest v2
window.onload = function () {
    document.getElementById('save_data').onclick = saveUserData;
}