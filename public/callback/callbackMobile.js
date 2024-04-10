window.onload = function() {
    //loadPage();
};

const isIOS = function(){
    let agent = navigator.userAgent.toLowerCase();
    let iphone = agent.indexOf("iphone");
    let ipad = agent.indexOf("ipad");
    if(iphone != -1 || ipad != -1){
        return true;
    }
}

function loadPage() {
    setTimeout(openApp(), 2000)
}

function openApp() {
    let singpassNric = document.getElementById('singpassNricDiv').innerHTML
    let resCode = document.getElementById('resCodeDiv').innerHTML
    // scheme://pathPrefix?params=***
    //let url='singpasslogin://singpasslogin/open?resCode='+resCode+'&nric=' + singpassNric

    // intent://pathPrefix/#Intent;scheme=**;package=**;S.strParams=**;end
    //let url = 'intent://singpasslogin/open/#Intent;scheme=singpasslogin;package=com.mss.mobius.cv;S.nric=T0815915C;end'

    // intent://host/#Intent;scheme=**;package=**;S.strParams=**;end
    // const url = "intent://mobilecv.com/#Intent;scheme=singpasslogin;package=com.mss.mobius.cv;S.nric="+singpassNric+";S.resCode="+resCode+";end";
    // window.location.href=url

    if (isIOS()) {
        const url = `singpasslogin://cv.mobius.mss.com?nric=${ singpassNric }&resCode=${ resCode }`
        window.location.href = url
    } else {
        const url = "intent://mobilecv.com/#Intent;scheme=singpasslogin;package=com.mss.mobius.cv;S.nric="+singpassNric+";S.resCode="+resCode+";end";
        window.location.href = url
    }
}