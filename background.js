'use strict';

//start fetchOWA if userData available
userDataExists().then((userDataExists) => {
    if (userDataExists) {
        enableOWAFetch()
        console.log("deteced user data.")
    }
})

function owaIsOpened(){
    return new Promise(async (resolve, reject) => {
        let uri = await getUri()
        let tabs = await getAllChromeTabs()
        tabs.forEach(function (tab) {
            if ((tab.url).includes(uri)) {
                console.log("currentyl opened owa")
                resolve(true)
            }
        })
        resolve(false)
    })
}

function getAllChromeTabs() {
    return new Promise(async (res, rej) => {
        await chrome.tabs.query({}, function (tabs) {
            res(tabs)
        })
    })
}


//listen for messages from popup or content scripts
chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.cmd) {
        case 'msg':
            show_badge('msg', 'color', request.timeout)
            break
        case 'get_user_data':
            getUserData().then((userData) => { sendResponse(userData) })
            break
        case 'set_user_data':
            setUserData(request.userData)
            break
        case 'is_user_registered':
            userDataExists().then((userRegistered) => { sendResponse(userRegistered) })
            break
        case "enable_owa_fetch":
            enableOWAFetch()
            break
        case "disable_owa_fetch":
            disableOwaFetch()
            break
        default:
            console.log('Cmd not found: ' + request.cmd)
            break
    }
    return true //required for async sendResponse
})

//show badge
function show_badge(Text, Color) {
    console.log(Text + Color)
    chrome.browserAction.setBadgeText({ text: Text });
    chrome.browserAction.setBadgeBackgroundColor({ color: Color });
}

function disableOwaFetch() {
    console.log("stoped owa connection")
    chrome.alarms.clearAll(() => {})
}

//start OWA fetch funtion interval based
function enableOWAFetch() {
    //first, clear all alarms
    console.log("starting to fetch from owa...")
    chrome.alarms.clearAll(() => {
        chrome.alarms.create("fetchOWAAlarm", { delayInMinutes: 0, periodInMinutes: 1 })
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            //only execute if owa not opened!
            if(await owaIsOpened()) {
                console.log("aborting fetch ..")
                return
            }

            console.log("executing fetch ...")
            
            //get user data
            let asdf = ""
            let fdsa = ""
            let uri = ""
            await getUserData().then((userData) => {
                asdf = userData.asdf
                fdsa = userData.fdsa
            })
            uri = await getUri()

            //call fetch
            let mailInfoJson = await fetchOWA(asdf, fdsa, uri)

            //check # of unread mails
            let numberUnreadMails = await countUnreadMsg(mailInfoJson)
            console.log(numberUnreadMails)


            //set badge
            if (numberUnreadMails == 0) {
                show_badge("", '#4cb749')
                chrome.browserAction.setIcon({
                    path: {
                        "16": "icons/16_grey_2.png",
                        "32": "icons/32_grey_2.png",
                        "48": "icons/48_grey_2.png",
                        "128": "icons/128_grey_2.png"
                    }
                });
            }
            else if (numberUnreadMails > 99) {
                show_badge("99+", '#4cb749')
                chrome.browserAction.setIcon({
                    path: {
                        "16": "icons/16_color_2.png",
                        "32": "icons/32_color_2.png",
                        "48": "icons/48_color_2.png",
                        "128": "icons/128_color_2.png"
                    }
                });
            }
            else {
                show_badge(numberUnreadMails.toString(), '#4cb749')
                chrome.browserAction.setIcon({
                    path: {
                        "16": "icons/16_color_2.png",
                        "32": "icons/32_color_2.png",
                        "48": "icons/48_color_2.png",
                        "128": "icons/128_color_2.png"
                    }
                });
            }
        })
    })
}

function getUri(){
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['base_url'], async (res) => {
            resolve(res.base_url)
        })
    })
}

//check if username, password, url exists.
function userDataExists(){
    return new Promise(async (resolve, reject) => {
        let userData = await getUserData()
        if (userData.asdf === undefined || userData.fdsa === undefined){
            resolve(false)
            return
        }
        let uri = await getUri()
        if (uri === undefined || uri === '') {
            resolve(false)
            return
        }
        resolve(true)
        return
    })
}

function customURIEncoding(string){
    string = encodeURIComponent(string)
    string = string.replace("!", "%21").replace("'", "%27").replace("(", "%28").replace(")", "%29").replace("~", "%7E")
    return string
}


function fetchOWA(asdf, fdsa, baseUri) {
    return new Promise((resolve, reject) => {

        //encodeURIComponent and encodeURI are not working for all chars. See documentation. Thats why I add custom encoding.
        asdf = customURIEncoding(asdf)
        fdsa = customURIEncoding(fdsa)
        var baseUriEncoded = customURIEncoding(baseUri)

        var mailInfoJson = new Object()
        
        //login
        fetch(baseUri + "auth.owa", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "de-DE,de;q=0.9,en-DE;q=0.8,en-GB;q=0.7,en-US;q=0.6,en;q=0.5",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "referrer": baseUri + "auth/logon.aspx?replaceCurrent=1&url=" + baseUriEncoded + "%23authRedirect%3dtrue",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": "destination=" + baseUriEncoded + "%23authRedirect%3Dtrue&flags=4&forcedownlevel=0&username=" + asdf + "&password=" + fdsa + "&passwordText=&isUtf8=1",
            "method": "POST",
            "mode": "no-cors",
            "credentials": "include"
            })
            .then(() => {
                //get clientID and correlationID
                fetch(baseUri, {
                    "headers": {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        "accept-language": "de-DE,de;q=0.9,en-DE;q=0.8,en-GB;q=0.7,en-US;q=0.6,en;q=0.5",
                        "cache-control": "max-age=0",
                        "sec-fetch-dest": "document",
                        "sec-fetch-mode": "navigate",
                        "sec-fetch-site": "same-origin",
                        "sec-fetch-user": "?1",
                        "upgrade-insecure-requests": "1"
                    },
                    "referrer": baseUri + "auth/logon.aspx?replaceCurrent=1&url=" + baseUriEncoded.slice(0, -3),
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "no-cors",
                    "credentials": "include"
                })
                    //extract x-owa-correlationid
                .then(resp => resp.text()).then(respText => {
                    let temp = respText.split("window.clientId = '")[1]
                    let clientId = temp.split("'")[0]
                    let corrId = clientId + "_" + (new Date()).getTime()
                    console.log("corrID: " + corrId)
                })
                //getConversations
                .then(corrId => {
                    fetch(baseUri + "sessiondata.ashx?appcacheclient=0", {
                        "headers": {
                            "accept": "*/*",
                            "accept-language": "de-DE,de;q=0.9,en-DE;q=0.8,en-GB;q=0.7,en-US;q=0.6,en;q=0.5",
                            "sec-fetch-dest": "empty",
                            "sec-fetch-mode": "cors",
                            "sec-fetch-site": "same-origin",
                            "x-owa-correlationid": corrId,
                            "x-owa-smimeinstalled": "1"
                        },
                        "referrer": baseUri,
                        "referrerPolicy": "strict-origin-when-cross-origin",
                        "body": null,
                        "method": "POST",
                        "mode": "no-cors",
                        "credentials": "include"
                    })
                    .then(resp => resp.json()).then(respJson => {
                        mailInfoJson = respJson
                    })
                    //logout
                    .then(() => {
                        fetch(baseUri + "logoff.owa", {
                            "headers": {
                                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                                "accept-language": "de-DE,de;q=0.9,en-DE;q=0.8,en-GB;q=0.7,en-US;q=0.6,en;q=0.5",
                                "sec-fetch-dest": "document",
                                "sec-fetch-mode": "navigate",
                                "sec-fetch-site": "same-origin",
                                "sec-fetch-user": "?1",
                                "upgrade-insecure-requests": "1"
                            },
                            "referrer": baseUri,
                            "referrerPolicy": "strict-origin-when-cross-origin",
                            "body": null,
                            "method": "GET",
                            "mode": "no-cors",
                            "credentials": "include"
                        })
                    }).then(() => resolve(mailInfoJson))
                })
        })
    })

}

function countUnreadMsg(json) {
    return new Promise((resolve, reject) => {
        let conversations = json.findConversation.Body.Conversations
        let counterUnreadMsg = 0;
        for (var i = 0; i < conversations.length; i++) {
            var conv = conversations[i]
            if (conv.hasOwnProperty('UnreadCount')) {
                if (conv.UnreadCount == 1) {
                    counterUnreadMsg++;
                }
            }
        }
        resolve(counterUnreadMsg)
    })
}

////////////////////////////////////////////////
////////////////////////   security functions
////////////////////////////////////////////////
function hashDigest(string) {
    return new Promise(async (resolve, reject) => {
        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(string))
        resolve(hashBuffer)
    })
} 
function getKeyBuffer() {
    return new Promise((resolve, reject) => {
        let sysInfo = ""
        chrome.system.cpu.getInfo(info => {
            //TROUBLE if api changes!
            delete info['processors']
            delete info['temperatures']
            sysInfo = sysInfo + JSON.stringify(info)
            chrome.runtime.getPlatformInfo(async (info) => {
                sysInfo = sysInfo + JSON.stringify(info)
                let keyBuffer = await crypto.subtle.importKey('raw', await hashDigest(sysInfo),
                    { name: "AES-CBC", },
                    false,
                    ['encrypt', 'decrypt'])
                resolve(keyBuffer)
            })
        })
    })
}
//input {asdf: "", fdsa: ""}
async function setUserData(userData) {
    return new Promise(async (resolve, reject) => {
        let userDataConcat = userData.asdf + '@@@@@' + userData.fdsa
        let encoder = new TextEncoder()
        let userDataEncoded = encoder.encode(userDataConcat)
        let keyBuffer = await getKeyBuffer()
        let iv = crypto.getRandomValues(new Uint8Array(16))
        let userDataEncrypted = await crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            keyBuffer,
            userDataEncoded
        )
        userDataEncrypted = Array.from(new Uint8Array(userDataEncrypted))
        userDataEncrypted = userDataEncrypted.map(byte => String.fromCharCode(byte)).join('')
        userDataEncrypted = btoa(userDataEncrypted)
        iv = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('')
        chrome.storage.local.set({ Data: iv + userDataEncrypted }, function () {
            resolve()
        })
    })
}
//return {asdf: "", fdsa: ""}
async function getUserData() {
    return new Promise(async (resolve, reject) => {
        let keyBuffer = await getKeyBuffer()
        chrome.storage.local.get(['Data'], async (Data) => {
            //check if Data exists, else return
            if (Data.Data === undefined || Data.Data === "undefined" || Data.Data === null) {
                resolve({ asdf: undefined, fdsa: undefined })
                return
            }
            let iv = await Data.Data.slice(0, 32).match(/.{2}/g).map(byte => parseInt(byte, 16))
            iv = new Uint8Array(iv)
            let userDataEncrypted = atob(Data.Data.slice(32))
            userDataEncrypted = new Uint8Array(userDataEncrypted.match(/[\s\S]/g).map(ch => ch.charCodeAt(0)))
            let UserData = await crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv: iv
                },
                keyBuffer,
                userDataEncrypted
            )
            UserData = new TextDecoder().decode(UserData)
            UserData = UserData.split("@@@@@")
            resolve({ asdf: UserData[0], fdsa: UserData[1] })
        })
    })
}
////////////////////////////////////////////////
////////////////////////  end  security functions
////////////////////////////////////////////////
