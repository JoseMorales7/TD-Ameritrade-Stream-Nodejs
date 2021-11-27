//getting all info from the .env file
require('dotenv').config()

//installing necessary packages
const needle = require('needle')                    //network requests
const htmlParser = require('node-html-parser')      //parses html and scrapes data
const prompt = require('prompt-sync')()             //pauses the script and gets user input
const WebSocket = require('websocket').w3cwebsocket //connects to TD Ameritrade stream using a socket


//Storing data from .env file to variables
const clientID = process.env.CLIENT_ID
const username = process.env.USERNAME_
const password = process.env.PASSWORD
const callbackURL = process.env.CALLBACK_URL
const callbackURLEncoded = encodeURIComponent(callbackURL)

//Starts the script to login to the TD Ameritrade Stream
//First goes to the TD Ameritrade login page and gets the pages
async function getAccessToken() {
    console.log("Getting Page data")
    //sends request
    needle("get", `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`, {
        //Sets the Headers for the requests. All of these may not be necessary but I copied all the headers from the request
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Host': "auth.tdameritrade.com",
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }
    }).then(getPageResponse => {
        //console.log(getPageResponse)
        loginTD(getPageResponse)

    })
}

//Sends username and password to login to TD Ameritrade
async function loginTD(getPageResponse) {
    let cookieData = formatCookieString(getPageResponse, {})  //Gets the cookies from the getPageResponse and returns an object
    let cookieString = cookieData.cookieString                //A string that contains the cookies used for the request
    let cookiesListAll = cookieData.cookiesList               //An object that contains all the cookies used so far 

    let formDataVals = getFormData(getPageResponse.body)      //Gets the form data from the getPageResponse HTML
    
    //sets necessary values for the formData
    formDataVals["lang"] = "en-us"                            
    formDataVals["su_username"] = username
    formDataVals["su_password"] = password
    formDataVals["authorize"] = "Log in"
    delete formDataVals['undefined']                          //Deletes an undefined value from the form data

    let urlEncodedData = getURLEncodedData(formDataVals)      //encodes the formData to be sent

    console.log("Logging into TD Ameritrade")
    needle("POST", `https://auth.tdameritrade.com/oauth?client_id=${clientID}%40AMER.OAUTHAP&response_type=code&redirect_uri=${callbackURLEncoded}`, urlEncodedData, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieString,
            "Host": "auth.tdameritrade.com",
            "Origin": "https://auth.tdameritrade.com",
            "Referer": `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`,
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }

    }).then(loginResponse => {
        //console.log(loginResponse)
        SMSCodeRequest(loginResponse, cookiesListAll)
    })
}

//After sending login info, TD Ameritrade needs the OTC(One Time Code) for 2FA(Two Factor Authentication). This requests the OTC to be sent to the phone on your account.
function SMSCodeRequest(loginResponse, cookiesList) {
    let cookieData = formatCookieString(loginResponse, cookiesList)
    let cookieString = cookieData.cookieString
    let cookiesListAll = cookieData.cookiesList
    delete cookiesListAll["XSRF-TOKEN"]            //In the actual requests, the XSRF cookie is not sent. Deleted to mimic the actual requests.

    let formDataVals = getFormData(loginResponse.body)
    formDataVals["lang"] = "en-us"
    formDataVals["su_smsnumber"] = "0"
    formDataVals["authorize"] = "Continue"
    delete formDataVals['undefined']

    let urlEncodedData = getURLEncodedData(formDataVals)
    console.log("Requesting SMS Code")
    needle("POST", `https://auth.tdameritrade.com/oauth?client_id=${clientID}%40AMER.OAUTHAP&response_type=code&redirect_uri=${callbackURLEncoded}`, urlEncodedData, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieString,
            "Host": "auth.tdameritrade.com",
            "Origin": "https://auth.tdameritrade.com",
            "Referer": `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`,
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }

    }).then(otcResponse => {
        //console.log(otcResponse)
        sendOTC(otcResponse, cookiesListAll)
    })
}

//Sends the OTC to TD
function sendOTC(otcResponse, cookiesList) {
    let cookieData = formatCookieString(otcResponse, cookiesList)
    let cookieString = cookieData.cookieString
    let cookiesListAll = cookieData.cookiesList
    delete cookiesListAll["XSRF-TOKEN"]

    let formDataVals = getFormData(otcResponse.body)
    let OTC = prompt("One Time Code: ")
    formDataVals["lang"] = "en-us"
    formDataVals["su_smscode"] = OTC
    formDataVals["authorize"] = "Continue"
    delete formDataVals['undefined']

    let urlEncodedData = getURLEncodedData(formDataVals)

    console.log('Sending OTC Code')
    needle("POST", `https://auth.tdameritrade.com/oauth?client_id=${clientID}%40AMER.OAUTHAP&response_type=code&redirect_uri=${callbackURLEncoded}`, urlEncodedData, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieString,
            "Host": "auth.tdameritrade.com",
            "Origin": "https://auth.tdameritrade.com",
            "Referer": `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`,
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }

    }).then(trustedDeviceResponse => {
        //console.log(trustedDeviceResponse)
        setAsTrustedDevice(trustedDeviceResponse, cookiesListAll)
    })
}

//One of the prompts that's usually asked is to set your device as a trusted device. This request sets the script as a trusted device.
function setAsTrustedDevice(trustedDeviceResponse, cookiesList) {
    let cookieData = formatCookieString(trustedDeviceResponse, cookiesList)
    let cookieString = cookieData.cookieString
    let cookiesListAll = cookieData.cookiesList
    delete cookiesListAll["XSRF-TOKEN"]

    let formDataVals = getFormData(trustedDeviceResponse.body)
    formDataVals["lang"] = "en-us"
    formDataVals["su_trustthisdevice"] = "1"
    formDataVals["authorize"] = "Save"
    delete formDataVals['undefined']

    let urlEncodedData = getURLEncodedData(formDataVals)

    console.log('Setting as trusted device')
    needle("POST", `https://auth.tdameritrade.com/oauth?client_id=${clientID}%40AMER.OAUTHAP&response_type=code&redirect_uri=${callbackURLEncoded}&lang=en-us`, urlEncodedData, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieString,
            "Host": "auth.tdameritrade.com",
            "Origin": "https://auth.tdameritrade.com",
            "Referer": `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`,
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }

    }).then(allowAccessResponse => {
        //console.log(allowAccessResponse)
        allowAccessRequest(allowAccessResponse, cookiesListAll)
    })
}

//Allows the script access to the TD Ameritrade account and gets the access token needed.
function allowAccessRequest(allowAccessResponse, cookiesList) {
    let cookieData = formatCookieString(allowAccessResponse, cookiesList)
    let cookieString = cookieData.cookieString
    let cookiesListAll = cookieData.cookiesList
    delete cookiesListAll["XSRF-TOKEN"]

    let formDataVals = getFormData(allowAccessResponse.body)
    formDataVals["lang"] = "en-us"
    formDataVals["su_authorization"] = "n/a"
    formDataVals["authorize"] = "Allow"
    delete formDataVals['undefined']

    let urlEncodedData = getURLEncodedData(formDataVals)

    console.log('Allowing Access to script')
    needle("POST", `https://auth.tdameritrade.com/oauth?client_id=${clientID}%40AMER.OAUTHAP&response_type=code&redirect_uri=${callbackURLEncoded}&lang=en-us`, urlEncodedData, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieString,
            "Host": "auth.tdameritrade.com",
            "Origin": "https://auth.tdameritrade.com",
            "Referer": `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${callbackURLEncoded}&client_id=${clientID}%40AMER.OAUTHAP`,
            'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
            'sec-ch-ua-mobile': '?0',
            "sec-ch-ua-platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        }

    }).then(codeResponse => {
        //console.log(codeResponse)
        getPostAccessToken(encodeURIComponent(codeResponse.body.code))
    })
}

//SCrapes the responses html and gets the form data needed to send requests.
function getFormData(html) {
    let root = htmlParser.parse(html)
    let authform = root.querySelector('#authform')
    let formDataRaw = authform.querySelectorAll('input[type="hidden"]')

    let formDataVals = {}

    formDataRaw.forEach(elem => {
        let attrs = elem['_rawAttrs']
        formDataVals[attrs.name] = attrs.value
    })

    //You should put values here based on what values are sent in the actual request
    //Login using your TD Ameritrade Link and looks at the requests from the networks tab
    formDataVals['fp_fp2DeviceId'] = ""
    formDataVals['fp_browser'] = ""
    formDataVals['fp_screen'] = ""
    formDataVals['fp_timezone'] = ""
    formDataVals['fp_language'] = ""
    formDataVals['fp_java'] = "0"
    formDataVals['fp_cookie'] = "1"
    formDataVals['fp_cfp'] = ""
    delete formDataVals['undefined']

    return formDataVals
}

//formats the cookies into a string for requests
function formatCookieString(responseCookies, cookiesListAll) {
    let cookieData = getCookies(responseCookies.cookies, cookiesListAll)
    let cookiesList = cookieData.cookiesList
    let cookieString = ""

    let cookiesListKeys = Object.keys(cookiesList)
    let cookiesListVals = Object.values(cookiesList)

    for (i = 0; i < cookiesListKeys.length; i++) {
        cookieString = `${cookieString}${cookiesListKeys[i]}=${cookiesListVals[i]}; `
    }

    return {
        "cookiesList": cookiesList,
        "cookieString": cookieString
    }
}

//extracts the cookies from the response
function getCookies(responseCookies, cookiesList) {
    let responseCookiesKeys = Object.keys(responseCookies);
    let responseCookiesVal = Object.values(responseCookies)

    let cookiesListKeys = Object.keys(cookiesList)

    let cookieObj = {}    //an object that contains the cookie from responseCookies, 1 single request. Not used but left in here.

    for (i = 0; i < responseCookiesKeys.length; i++) {
        let same = false;
        //checks to see if the cookies from the response are already in the cookie list
        for (j = 0; j < cookiesListKeys.length; j++) {
            if (responseCookiesKeys[i] == cookiesListKeys[j]) {
                same = true;
            }
        }
        //if response cookie is not in the list, add it to the object of cookies
        if (!same) {
            cookieObj[responseCookiesKeys[i]] = responseCookiesVal[i]
        }
    }

    //loops through responseCookies and creates new entries in cookiesList or sets new values for existing entries
    for (i = 0; i < responseCookiesKeys.length; i++) {
        cookiesList[responseCookiesKeys[i]] = responseCookiesVal[i]
    }


    return {
        data: cookieObj,
        "cookiesList": cookiesList
    }
}

//Gets post access token needed to login to TD Ameritrade stream
//https://developer.tdameritrade.com/authentication/apis/post/token-0
async function getPostAccessToken(token) {
    //necessary params to request post access token
    let params = {
        grant_type: "authorization_code",
        access_type: "offline",
        code: token,
        client_id: clientID,
        redirect_uri: callbackURLEncoded
    }

    needle('POST', "https://api.tdameritrade.com/v1/oauth2/token", querify(params), {
        headers: {
            "accept": "*/*",
            "accept-encoding": "gzip",
            "accept-language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
            "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        }
    }).then(postAccessTokenResponse => {
        getUserPrincipals(postAccessTokenResponse.body.access_token)
    })
}

//formats the params in a way necessary for requests
function querify(params) {
    return Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
}

//does the same as querify() except encodes each key-value pair
function getURLEncodedData(formDataVals) {
    let formDataKeys = Object.keys(formDataVals)
    let urlEncodedData = "",
        urlEncodedDataPairs = []

    for (i = 0; i < formDataKeys.length; i++) {
        urlEncodedDataPairs.push(encodeURIComponent(formDataKeys[i]) + '=' + encodeURIComponent(formDataVals[formDataKeys[i]]));
    }

    // Combine the pairs into a single string and replace all %-encoded spaces to
    // the '+' character; matches the behavior of browser form submissions.
    urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');
    return urlEncodedData
}

//Gets account information needed
//https://developer.tdameritrade.com/user-principal/apis/get/userprincipals-0
function getUserPrincipals(token) {
    
    needle('get', "https://api.tdameritrade.com/v1/userprincipals?fields=streamerSubscriptionKeys%2CstreamerConnectionInfo", {
        headers: {
            "Accept": "*/*",
            "Accept-Encoding": "gzip",
            "Accept-Language": "en-US,en;q=0.9",
            "Authorization": `Bearer ${token}`,
            "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        }
    }).then(response => {
        const userPrincipals = response.body;
        connectToStream(userPrincipals)
    })
}

//Never really needed to renew the post access token since I dont use the script for too long but could be useful depending on your needs
//Essentially the same as getPostAccessToken() except the params are different
function renewPostAccessToken(token) {
    let params = {
        grant_type: "refresh_token",
        refresh_token: token,
        client_id: clientID,
        redirect_uri: encodeURIComponent(callbackURL)
    }

    needle('POST', "https://api.tdameritrade.com/v1/oauth2/token", querify(params), {
        headers: {
            "accept": "*/*",
            "accept-encoding": "gzip",
            "accept-language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
            "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        }
    })
}

//Connects to the TD Ameritrade Stream
//https://developer.tdameritrade.com/content/streaming-data
function connectToStream(userPrincipals) {
    //Sets necessary parameters
    let responses = 0;
    let tokenTimeStampAsDateObj = new Date(userPrincipals.streamerInfo.tokenTimestamp);
    let tokenTimeStampAsMs = tokenTimeStampAsDateObj.getTime();

    let credential = {
        "userid": userPrincipals.accounts[0].accountId,
        "token": userPrincipals.streamerInfo.token,
        "company": userPrincipals.accounts[0].company,
        "segment": userPrincipals.accounts[0].segment,
        "cddomain": userPrincipals.accounts[0].accountCdDomainId,
        "usergroup": userPrincipals.streamerInfo.userGroup,
        "accesslevel": userPrincipals.streamerInfo.accessLevel,
        "authorized": "Y",
        "timestamp": tokenTimeStampAsMs,
        "appid": userPrincipals.streamerInfo.appId,
        "acl": userPrincipals.streamerInfo.acl
    }

    let loginRequest = {
        service: "ADMIN",
        requestid: "0",
        command: "LOGIN",
        account: userPrincipals.accounts[0].accountId,
        source: userPrincipals.streamerInfo.appId,
        parameters: {
            token: userPrincipals.streamerInfo.token,
            version: "1.0",
            credential: querify(credential),
            qoslevel: "0"
        }
    }

    //Subscribing to futures stream but could be any other stream offered by Ameritrade
    let subscribeRequest = {
        requests: [
            {
                service: "LEVELONE_FUTURES",
                requestid: "1",
                command: "SUBS",
                account: userPrincipals.accounts[0].accountId,
                source: userPrincipals.streamerInfo.appId,
                parameters: {
                    keys: "/ES",
                    fields: "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26"
                }
            }
        ]
    }

    let ws = new WebSocket(`wss://${userPrincipals.streamerInfo.streamerSocketUrl}/ws`)

    //You need to do different things on the websocket. First login to the stream then subscribe to the stream.
    //Redefining the onmessage event is the easiest way I found to do it.
    ws.onopen = function () {
        ws.send(JSON.stringify(loginRequest))

        try {
            ws.onmessage = function (evt) {
                console.log(evt)
                ws.send(JSON.stringify(subscribeRequest))
                //takes the data that's coming in and print it to the console
                ws.onmessage = function (evt) {

                    const evtData = JSON.parse(evt.data)

                    if (evtData.data != undefined) {
                        const futureData = evtData.data[0]
                        console.log(futureData)
                    }

                    //only prints three responses from the stream
                    if (responses > 3) {
                        disconnectFromStream(userPrincipals, ws)

                    }
                    responses++
                }
            }
        } catch (error) {
            console.log(error)
            ws.onmessage = function () {
                disconnectFromStream(userPrincipals, ws)
            }
        }
    }

    ws.onmessage = function (evt) {
        console.log(evt.data)
    }

    ws.onclose = function () {
        console.log("Stream Closed")
    }
}

function disconnectFromStream(userPrincipals, websocket) {
    const logoutRequest = {
        service: "ADMIN",
        requestid: "2",
        command: "LOGOUT",
        account: userPrincipals.accounts[0].accountId,
        source: userPrincipals.streamerInfo.appId,
        parameters: {
        }
    }

    websocket.send(JSON.stringify(logoutRequest))
    console.log('disconnected from stream')
}

getAccessToken()
