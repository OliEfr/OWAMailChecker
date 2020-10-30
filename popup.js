/*
    base uri: https://msx.tu-dresden.de/owa/
*/

function saveURL() {
    var url = document.getElementById('url_field').value

    if (!patternMatchURI(url) || url === '') {
        document.getElementById('status_msg_url').innerHTML = "<font color='red'>Check your URL!</font>"
        console.log("Wrong url pattern")
        return false
    }

    //reset popup
    document.getElementById('status_msg_url').innerHTML = ""
    document.getElementById("save_url").innerHTML = '<font>Saved!</font>'
    document.getElementById("save_url").style.backgroundColor = "rgb(47, 143, 18)"
    document.getElementById("url_field").value = ""
    chrome.storage.local.set({ "raw_url": url, "base_url": extractBaseURI(url) }, function () { });


    setTimeout(() => {
        document.getElementById("save_url").innerHTML = 'Save';
        document.getElementById("save_url").style.backgroundColor = "grey"
    }, 2000)

    updateStatus()

}

//check whether url and userData is provided already
function updateStatus() {
    chrome.runtime.sendMessage({ cmd: 'is_user_registered' }, function (userIsRegistered) {
        if (userIsRegistered) {
            document.getElementById("status").value = "You are registered and mail form OWA will be checked!"
        }
    })
}

function saveUserData() {
    var asdf = document.getElementById('username_field').value
    var fdsa = document.getElementById('password_field').value

    //make some checks for valid input data
    if (asdf === '' || fdsa === ''){
        document.getElementById('status_msg_userdata').innerHTML = "<font color='red'>Fields should not be empty!</font>"
        console.log("Empty inputs")
        return false
    }

    //reset popup
    document.getElementById('status_msg_userdata').innerHTML = ""
    document.getElementById("save_userdata").innerHTML = '<font>Saved!</font>'
    document.getElementById("save_userdata").style.backgroundColor = "rgb(47, 143, 18)"
    document.getElementById("username_field").value = ""
    document.getElementById("password_field").value = ""

    setTimeout(() => {
        document.getElementById("save_userdata").innerHTML = 'Save';
        document.getElementById("save_userdata").style.backgroundColor = "grey"
    }, 2000)

    //save data
    chrome.runtime.sendMessage({ cmd: "set_user_data", userData: { asdf: asdf, fdsa: fdsa } })

    updateStatus()
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
    updateStatus()
    document.getElementById('save_userdata').onclick = saveUserData;
    document.getElementById('save_url').onclick = saveURL;
}